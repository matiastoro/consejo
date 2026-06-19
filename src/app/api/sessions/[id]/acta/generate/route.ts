import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";
import { buildActaPdf, saveActaFile } from "@/lib/acta-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sesiones cuya acta se está generando ahora mismo en este proceso. Evita
// lanzar dos generaciones en paralelo para la misma sesión.
const inFlight = new Set<string>();

// Corre en segundo plano (el servidor es de larga vida): construye el PDF,
// lo guarda y marca el estado. No se hace await en el handler para que la UI
// no quede bloqueada mientras el LLM trabaja.
async function runGeneration(sessionId: string, useLlm: boolean) {
  try {
    const buffer = await buildActaPdf(sessionId, useLlm);
    const saved = await saveActaFile(sessionId, buffer);
    await prisma.sessionActa.update({
      where: { sessionId },
      data: {
        status: "READY",
        fileUrl: saved.fileUrl,
        fileSize: saved.fileSize,
        error: null,
        generatedAt: new Date(),
      },
    });
  } catch (e) {
    await prisma.sessionActa
      .update({
        where: { sessionId },
        data: { status: "ERROR", error: e instanceof Error ? e.message : String(e) },
      })
      .catch(() => {});
  } finally {
    inFlight.delete(sessionId);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isDirector(user.effectiveRoles) && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const useLlm = body?.llm === true;
  const mode = useLlm ? "LLM" : "RAW";

  const session = await prisma.councilSession.findUnique({ where: { id }, select: { id: true } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (inFlight.has(id)) {
    return NextResponse.json({ status: "PENDING", mode, alreadyRunning: true });
  }

  await prisma.sessionActa.upsert({
    where: { sessionId: id },
    update: { status: "PENDING", mode, error: null, requestedById: user.id },
    create: { sessionId: id, status: "PENDING", mode, requestedById: user.id },
  });

  inFlight.add(id);
  void runGeneration(id, useLlm);

  return NextResponse.json({ status: "PENDING", mode });
}
