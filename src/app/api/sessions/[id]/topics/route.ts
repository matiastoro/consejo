import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";

// PUT: reorder topics within a session (custom override of priority order)
export async function PUT(
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
  const { orderedTopicIds } = body as { orderedTopicIds: string[] };

  // Upsert SessionTopic entries to store custom order
  const upserts = orderedTopicIds.map((topicId, index) =>
    prisma.sessionTopic.upsert({
      where: { sessionId_topicId: { sessionId: id, topicId } },
      update: { order: index },
      create: { sessionId: id, topicId, order: index },
    })
  );

  await prisma.$transaction(upserts);
  return NextResponse.json({ success: true });
}
