import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, roles: true, image: true } },
      attachments: true,
      votes: {
        include: {
          user: { select: { id: true, name: true, roles: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: {
          user: { select: { id: true, name: true, roles: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      history: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  await prisma.topicReadStatus.upsert({
    where: { topicId_userId: { topicId: id, userId: user.id } },
    update: { lastReadAt: new Date() },
    create: { topicId: id, userId: user.id },
  });

  const myVote = topic.votes.find((v) => v.userId === user.id);

  return NextResponse.json({
    ...topic,
    myVote: myVote?.voteType ?? null,
  });
}

function canEdit(user: { id: string; roles: string[]; isAdmin: boolean }, topic: { authorId: string }) {
  return topic.authorId === user.id || isDirector(user.roles) || user.isAdmin;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const topic = await prisma.topic.findUnique({ where: { id } });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (!canEdit(user, topic)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, status } = body;

  // Build history entries for changed fields
  const historyEntries: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  if (title && title !== topic.title) {
    historyEntries.push({ field: "title", oldValue: topic.title, newValue: title });
  }
  if (description && description !== topic.description) {
    historyEntries.push({ field: "description", oldValue: topic.description, newValue: description });
  }
  if (status && status !== topic.status) {
    historyEntries.push({ field: "status", oldValue: topic.status, newValue: status });
  }

  const updated = await prisma.topic.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(status && { status }),
    },
    include: {
      author: { select: { id: true, name: true, roles: true, image: true } },
    },
  });

  if (historyEntries.length > 0) {
    await prisma.topicHistory.createMany({
      data: historyEntries.map((entry) => ({
        topicId: id,
        userId: user.id,
        ...entry,
      })),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const topic = await prisma.topic.findUnique({ where: { id } });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (!canEdit(user, topic)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.topic.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
