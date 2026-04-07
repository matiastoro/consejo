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
    return NextResponse.json({ error: "Only the director or admin can approve topics" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { approved } = body;

  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (topic.status !== "PENDING_APPROVAL") {
    return NextResponse.json(
      { error: "Topic is not pending approval" },
      { status: 400 }
    );
  }

  if (approved) {
    const updated = await prisma.topic.update({
      where: { id },
      data: { status: "DISCUSSING" },
    });
    return NextResponse.json(updated);
  } else {
    await prisma.topic.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Topic rejected and deleted" });
  }
}
