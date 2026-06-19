import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";

const RESOLVED = ["APROBADO", "RECHAZADO", "CERRADO"] as const;

function isPdf(a: { mimeType: string; fileName: string }): boolean {
  return a.mimeType === "application/pdf" || a.fileName.toLowerCase().endsWith(".pdf");
}

// Lista los adjuntos PDF de los temas resueltos en la sesión (a nivel de tema,
// comentario o avance), marcando cuáles están seleccionados para anexar al acta.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const session = await prisma.councilSession.findUnique({
    where: { id },
    include: { actaAttachments: { select: { attachmentId: true, order: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const topics = await prisma.topic.findMany({
    where: { status: { in: [...RESOLVED] }, resolvedInSessionId: id },
    select: { id: true, title: true },
  });
  const topicIds = topics.map((t) => t.id);
  const titleByTopic = new Map(topics.map((t) => [t.id, t.title]));

  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { topicId: { in: topicIds } },
        { comment: { topicId: { in: topicIds } } },
        { note: { topicId: { in: topicIds } } },
      ],
    },
    include: {
      comment: { select: { topicId: true } },
      note: { select: { topicId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const selectionMap = new Map(
    session.actaAttachments.map((s) => [s.attachmentId, s.order])
  );

  const items = attachments
    .filter(isPdf)
    .map((a) => {
      const topicId = a.topicId ?? a.comment?.topicId ?? a.note?.topicId ?? null;
      return {
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        topicTitle: topicId ? titleByTopic.get(topicId) ?? "" : "",
        selected: selectionMap.has(a.id),
        order: selectionMap.get(a.id) ?? null,
      };
    });

  return NextResponse.json({ items });
}

// Reemplaza la selección de anexos. attachmentIds llega en el orden deseado.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isDirector(user.effectiveRoles) && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const attachmentIds: string[] = Array.isArray(body.attachmentIds) ? body.attachmentIds : [];

  const session = await prisma.councilSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.sessionActaAttachment.deleteMany({ where: { sessionId: id } }),
    prisma.sessionActaAttachment.createMany({
      data: attachmentIds.map((attachmentId, index) => ({
        sessionId: id,
        attachmentId,
        order: index,
      })),
    }),
  ]);

  return NextResponse.json({ success: true });
}
