import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isDirector(user.roles) && !user.isAdmin) {
    return NextResponse.json({ error: "Only the director or admin can reorder topics" }, { status: 403 });
  }

  const body = await request.json();
  const { orderedIds } = body as { orderedIds: string[] };

  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "orderedIds must be an array" }, { status: 400 });
  }

  const updates = orderedIds.map((id, index) =>
    prisma.topic.update({
      where: { id },
      data: { priority: orderedIds.length - index },
    })
  );

  await prisma.$transaction(updates);

  return NextResponse.json({ success: true });
}
