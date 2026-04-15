import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const notes = await prisma.topicNote.findMany({
    where: { topicId: id },
    include: {
      user: { select: { id: true, name: true, roles: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const { content } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const note = await prisma.topicNote.create({
    data: {
      topicId: id,
      userId: user.id,
      content: content.trim(),
    },
    include: {
      user: { select: { id: true, name: true, roles: true, image: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
}
