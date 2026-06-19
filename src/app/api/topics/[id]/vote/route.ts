import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden, canVote, isRecused } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canVote(user.effectiveRoles)) return forbidden();

  const { id } = await params;
  const body = await request.json();
  const { voteType } = body;

  if (!["A_FAVOR", "EN_CONTRA", "MAS_DATOS"].includes(voteType)) {
    return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
  }

  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (await isRecused(id, user.id)) return forbidden();

  if (topic.status !== "DISCUSSING") {
    return NextResponse.json(
      { error: "Topic is not open for voting" },
      { status: 400 }
    );
  }

  const vote = await prisma.vote.upsert({
    where: { topicId_userId: { topicId: id, userId: user.id } },
    update: { voteType },
    create: { topicId: id, userId: user.id, voteType },
    include: {
      user: { select: { id: true, name: true, roles: true } },
    },
  });

  return NextResponse.json(vote);
}
