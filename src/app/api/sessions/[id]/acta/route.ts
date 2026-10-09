import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";
import { resolveAttachmentPaths } from "@/lib/uploads";
import { actaMarkdownUrl } from "@/lib/acta-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Entrega el acta cacheada de la sesión. La generación corre aparte (POST
// .../acta/generate); aquí solo se sirve el archivo ya listo: PDF por omisión,
// o Markdown con ?format=md.
export async function GET(
  request: NextRequest,
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

  const asMarkdown = request.nextUrl.searchParams.get("format") === "md";
  const fileUrl = asMarkdown ? actaMarkdownUrl(acta.fileUrl) : acta.fileUrl;

  const candidates = resolveAttachmentPaths(fileUrl);
  let data: Buffer | null = null;
  for (const filePath of candidates) {
    data = await readFile(filePath).catch(() => null);
    if (data) break;
  }
  if (!data) {
    // Las actas generadas antes de existir la versión Markdown no la tienen.
    const error = asMarkdown
      ? "Esta acta no tiene versión Markdown; regenérala"
      : "Archivo del acta no encontrado";
    return NextResponse.json({ error }, { status: 404 });
  }

  const baseName = `acta-${session.title.replace(/\s+/g, "-").toLowerCase()}`;
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": asMarkdown ? "text/markdown; charset=utf-8" : "application/pdf",
      "Content-Disposition": asMarkdown
        ? `attachment; filename="${baseName}.md"`
        : `inline; filename="${baseName}.pdf"`,
      "Content-Length": String(data.length),
      "Cache-Control": "private, no-store",
    },
  });
}
