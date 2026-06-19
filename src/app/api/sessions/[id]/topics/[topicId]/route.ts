import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";

// PUT: mark topic as discussed/not discussed in this session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isDirector(user.effectiveRoles) && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, topicId } = await params;
  const body = await request.json();
  const { discussed } = body;

  // Upsert: create the SessionTopic entry if it doesn't exist yet
  await prisma.sessionTopic.upsert({
    where: { sessionId_topicId: { sessionId: id, topicId } },
    update: {
      discussed,
      discussedAt: discussed ? new Date() : null,
    },
    create: {
      sessionId: id,
      topicId,
      discussed,
      discussedAt: discussed ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true });
}
