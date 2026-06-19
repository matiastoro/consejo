import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const { content, withAttachment } = body;

  if (!content?.trim() && !withAttachment) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      topicId: id,
      userId: user.id,
      content: content?.trim() ?? "",
    },
    include: {
      user: { select: { id: true, name: true, roles: true } },
      attachments: true,
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
