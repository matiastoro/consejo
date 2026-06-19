import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden, isDirector } from "@/lib/session";
import { saveUploadedFile } from "@/lib/uploads";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.userId !== user.id && !isDirector(user.roles) && !user.isAdmin) {
    return forbidden();
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const saved = await saveUploadedFile(file, `comments/${id}`);

  const attachment = await prisma.attachment.create({
    data: {
      commentId: id,
      ...saved,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const attachmentId = searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json({ error: "attachmentId is required" }, { status: 400 });
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { comment: true },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  if (
    attachment.comment?.userId !== user.id &&
    !isDirector(user.roles) &&
    !user.isAdmin
  ) {
    return forbidden();
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });

  return NextResponse.json({ success: true });
}
