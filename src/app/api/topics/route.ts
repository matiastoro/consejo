import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden, isDirector, canCreateTopics } from "@/lib/session";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const canSeeAll = isDirector(user.roles) || user.isAdmin;

  const topics = await prisma.topic.findMany({
    where: canSeeAll
      ? {}
      : {
          OR: [
            { status: { not: "PENDING_APPROVAL" } },
            { authorId: user.id, status: "PENDING_APPROVAL" },
          ],
        },
    include: {
      author: { select: { id: true, name: true, roles: true } },
      votes: { select: { id: true, userId: true, voteType: true } },
      comments: { select: { id: true, createdAt: true } },
      readStatuses: {
        where: { userId: user.id },
        select: { lastReadAt: true, lastCommentId: true },
      },
      _count: { select: { votes: true, comments: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const enriched = topics.map((topic) => {
    const myVote = topic.votes.find((v) => v.userId === user.id);
    const readStatus = topic.readStatuses[0];
    const unreadComments = readStatus
      ? topic.comments.filter((c) => c.createdAt > readStatus.lastReadAt).length
      : topic.comments.length;

    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      status: topic.status,
      priority: topic.priority,
      author: topic.author,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
      totalVotes: topic._count.votes,
      totalComments: topic._count.comments,
      unreadComments,
      myVote: myVote?.voteType ?? null,
      voteSummary: {
        A_FAVOR: topic.votes.filter((v) => v.voteType === "A_FAVOR").length,
        EN_CONTRA: topic.votes.filter((v) => v.voteType === "EN_CONTRA").length,
        MAS_DATOS: topic.votes.filter((v) => v.voteType === "MAS_DATOS").length,
      },
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canCreateTopics(user.roles)) return forbidden();

  const body = await request.json();
  const { title, description } = body;

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required" },
      { status: 400 }
    );
  }

  const status = (isDirector(user.roles) || user.isAdmin) ? "DISCUSSING" : "PENDING_APPROVAL";

  const topic = await prisma.topic.create({
    data: {
      title,
      description,
      status,
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true, roles: true } },
    },
  });

  return NextResponse.json(topic, { status: 201 });
}
