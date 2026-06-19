import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden, isDirector, canCreateTopics } from "@/lib/session";
import { Prisma } from "@prisma/client";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const canSeeAll = user.isAdmin;
  const isDir = isDirector(user.effectiveRoles);

  // Estado: los PENDING_APPROVAL solo los ve su autor o un director vigente.
  const statusRule: Prisma.TopicWhereInput = isDir
    ? {}
    : {
        OR: [
          { status: { not: "PENDING_APPROVAL" } },
          { authorId: user.id, status: "PENDING_APPROVAL" },
        ],
      };

  // Visibilidad por periodo: el tema (por createdAt) debe caer dentro de alguno
  // de los periodos del usuario. Sus propios temas siempre se ven.
  const visibilityRule: Prisma.TopicWhereInput = {
    OR: [
      { authorId: user.id },
      ...user.membershipPeriods.map((p) => ({
        createdAt: {
          gte: p.startDate,
          ...(p.endDate ? { lte: p.endDate } : {}),
        },
      })),
    ],
  };

  const topics = await prisma.topic.findMany({
    where: canSeeAll ? {} : { AND: [statusRule, visibilityRule] },
    include: {
      author: { select: { id: true, name: true, roles: true } },
      votes: { select: { id: true, userId: true, voteType: true } },
      comments: { select: { id: true, createdAt: true } },
      readStatuses: {
        where: { userId: user.id },
        select: { lastReadAt: true, lastCommentId: true },
      },
      recusals: { where: { userId: user.id }, select: { id: true } },
      _count: { select: { votes: true, comments: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const enriched = topics.map((topic) => {
    const recused = topic.recusals.length > 0;

    // Tema vetado: solo título y descripción, sin datos de deliberación.
    if (recused) {
      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        status: topic.status,
        priority: topic.priority,
        inPersonOnly: topic.inPersonOnly,
        author: topic.author,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
        recused: true,
        totalVotes: 0,
        totalComments: 0,
        unreadComments: 0,
        myVote: null,
        voteSummary: { A_FAVOR: 0, EN_CONTRA: 0, MAS_DATOS: 0 },
      };
    }

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
      inPersonOnly: topic.inPersonOnly,
      author: topic.author,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
      recused: false,
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
  if (!canCreateTopics(user.effectiveRoles)) return forbidden();

  const body = await request.json();
  const { title, description, inPersonOnly, requiresProvisionalVote } = body;

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required" },
      { status: 400 }
    );
  }

  const status = (isDirector(user.effectiveRoles) || user.isAdmin) ? "DISCUSSING" : "PENDING_APPROVAL";

  const topic = await prisma.topic.create({
    data: {
      title,
      description,
      status,
      authorId: user.id,
      inPersonOnly: !!inPersonOnly,
      requiresProvisionalVote: !!requiresProvisionalVote,
    },
    include: {
      author: { select: { id: true, name: true, roles: true } },
    },
  });

  // Notify voters about new topic
  const voters = await prisma.user.findMany({
    where: {
      roles: { hasSome: ["DIRECTOR", "SUBDIRECTOR", "JEFE_DOCENTE", "CONSEJERO"] },
      id: { not: user.id },
    },
    select: { id: true },
  });

  if (voters.length > 0) {
    await prisma.notification.createMany({
      data: voters.map((v) => ({
        userId: v.id,
        type: "TOPIC_CREATED" as const,
        title: "Nuevo tema propuesto",
        message: `${user.name} propuso: "${title}"`,
        topicId: topic.id,
      })),
    });
  }

  return NextResponse.json(topic, { status: 201 });
}
