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

  const session = await prisma.councilSession.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      topics: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Get pending topics (DISCUSSING) + topics resolved in THIS session
  const allTopics = await prisma.topic.findMany({
    where: {
      OR: [
        { status: "DISCUSSING" },
        { status: { in: ["APROBADO", "RECHAZADO", "CERRADO"] }, resolvedInSessionId: id },
      ],
    },
    include: {
      author: { select: { id: true, name: true, roles: true } },
      votes: { select: { id: true, userId: true, voteType: true } },
      comments: { select: { id: true } },
      notes: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      provisionalVotes: {
        select: { id: true, userId: true, voteType: true },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  // Build a map of SessionTopic entries for this session (discussed status + custom order)
  const sessionTopicMap = new Map(
    session.topics.map((st) => [st.topicId, st])
  );

  // Merge: use custom order from SessionTopic if it exists, otherwise use topic priority
  const mergedTopics = allTopics.map((topic) => {
    const st = sessionTopicMap.get(topic.id);
    return {
      topic,
      discussed: st?.discussed ?? false,
      discussedAt: st?.discussedAt ?? null,
      customOrder: st?.order ?? null,
    };
  });

  // Sort: topics with custom order first (by order), then remaining by priority desc
  mergedTopics.sort((a, b) => {
    const aHasOrder = a.customOrder !== null;
    const bHasOrder = b.customOrder !== null;
    if (aHasOrder && bHasOrder) return a.customOrder! - b.customOrder!;
    if (aHasOrder && !bHasOrder) return -1;
    if (!aHasOrder && bHasOrder) return 1;
    // Both without custom order: keep original priority order (already sorted)
    return 0;
  });

  return NextResponse.json({
    id: session.id,
    title: session.title,
    date: session.date,
    status: session.status,
    createdBy: session.createdBy,
    createdAt: session.createdAt,
    location: session.location,
    llmAvailable: Boolean(process.env.AI_PROVIDER_BASE_URL),
    topics: mergedTopics,
  });
}

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
  const { title, date, status } = body;

  const session = await prisma.councilSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.councilSession.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(date && { date: new Date(date) }),
      ...(status && { status }),
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isDirector(user.effectiveRoles) && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.councilSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
