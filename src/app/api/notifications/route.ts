import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { notificationIds, markAllRead } = body as {
    notificationIds?: string[];
    markAllRead?: boolean;
  };

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
  } else if (notificationIds?.length) {
    await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId: user.id },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
