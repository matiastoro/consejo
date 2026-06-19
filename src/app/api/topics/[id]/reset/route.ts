import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isDirector(user.effectiveRoles) && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { topicId: id } }),
    prisma.provisionalVote.deleteMany({ where: { topicId: id } }),
    prisma.comment.deleteMany({ where: { topicId: id } }),
    prisma.topic.update({
      where: { id },
      data: {
        status: "DISCUSSING",
        resolution: null,
        closedById: null,
        closedAt: null,
      },
    }),
    prisma.topicHistory.create({
      data: {
        topicId: id,
        userId: user.id,
        field: "reset",
        oldValue: topic.status,
        newValue: "DISCUSSING",
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
