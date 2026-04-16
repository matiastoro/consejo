import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isDirector(user.roles) && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, resolution, sessionId } = body as { status: "APROBADO" | "RECHAZADO"; resolution?: string; sessionId?: string };

  if (status !== "APROBADO" && status !== "RECHAZADO") {
    return NextResponse.json({ error: "Status must be APROBADO or RECHAZADO" }, { status: 400 });
  }

  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (topic.status !== "DISCUSSING") {
    return NextResponse.json({ error: "Only topics in discussion can be closed" }, { status: 400 });
  }

  const updated = await prisma.topic.update({
    where: { id },
    data: {
      status,
      resolution: resolution?.trim() || null,
      closedById: user.id,
      closedAt: new Date(),
      ...(sessionId && { resolvedInSessionId: sessionId }),
    },
  });

  // Mark as discussed in the session
  if (sessionId) {
    await prisma.sessionTopic.upsert({
      where: { sessionId_topicId: { sessionId, topicId: id } },
      update: { discussed: true, discussedAt: new Date() },
      create: { sessionId, topicId: id, discussed: true, discussedAt: new Date() },
    });
  }

  await prisma.topicHistory.create({
    data: {
      topicId: id,
      userId: user.id,
      field: "status",
      oldValue: "DISCUSSING",
      newValue: status,
    },
  });

  if (resolution?.trim()) {
    await prisma.topicHistory.create({
      data: {
        topicId: id,
        userId: user.id,
        field: "resolution",
        oldValue: null,
        newValue: resolution.trim(),
      },
    });
  }

  return NextResponse.json(updated);
}
