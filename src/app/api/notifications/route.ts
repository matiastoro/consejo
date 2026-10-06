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

  const pref = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailNotifications: true },
  });

  return NextResponse.json({
    notifications,
    unreadCount,
    emailNotifications: pref?.emailNotifications ?? true,
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { notificationIds, markAllRead, emailNotifications } = body as {
    notificationIds?: string[];
    markAllRead?: boolean;
    emailNotifications?: boolean;
  };

  if (typeof emailNotifications === "boolean") {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailNotifications },
    });
  }

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
