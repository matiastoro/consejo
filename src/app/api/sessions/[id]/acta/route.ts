import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";
import { resolveAttachmentPaths } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Entrega el acta cacheada de la sesión. La generación corre aparte (POST
// .../acta/generate); aquí solo se sirve el PDF ya listo.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const session = await prisma.councilSession.findUnique({
    where: { id },
    select: { title: true, acta: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const acta = session.acta;
  if (!acta || acta.status !== "READY" || !acta.fileUrl) {
    return NextResponse.json(
      { error: "Acta no generada", status: acta?.status ?? "NONE" },
      { status: 409 }
    );
  }

  const candidates = resolveAttachmentPaths(acta.fileUrl);
  let data: Buffer | null = null;
  for (const filePath of candidates) {
    data = await readFile(filePath).catch(() => null);
    if (data) break;
  }
  if (!data) {
    return NextResponse.json({ error: "Archivo del acta no encontrado" }, { status: 404 });
  }

  const fileName = `acta-${session.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Length": String(data.length),
      "Cache-Control": "private, no-store",
    },
  });
}
