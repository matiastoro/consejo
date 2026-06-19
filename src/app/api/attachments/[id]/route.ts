import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden, canViewTopic, isRecused } from "@/lib/session";
import { resolveAttachmentPaths } from "@/lib/uploads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const topicSelect = {
    select: { id: true, status: true, authorId: true, createdAt: true },
  };
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: {
      topic: topicSelect,
      comment: { select: { topic: topicSelect } },
      note: { select: { topic: topicSelect } },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  // El tema dueño puede venir directo (adjunto del tema) o vía el comentario/avance.
  const topic =
    attachment.topic ?? attachment.comment?.topic ?? attachment.note?.topic;
  if (!topic) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  if (!canViewTopic(user, topic)) return forbidden();
  // El miembro vetado solo ve título y descripción: nada de adjuntos.
  if (await isRecused(topic.id, user.id)) return forbidden();

  const candidates = resolveAttachmentPaths(attachment.fileUrl);
  let data: Buffer | null = null;
  for (const filePath of candidates) {
    data = await readFile(filePath).catch(() => null);
    if (data) break;
  }

  if (!data) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Nombre seguro para el header (sin saltos de línea ni comillas).
  const safeName = attachment.fileName.replace(/[\r\n"]/g, "_");

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": attachment.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Length": String(data.length),
      "Cache-Control": "private, no-store",
    },
  });
}
