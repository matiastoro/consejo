import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden, isDirector } from "@/lib/session";

function canManage(user: { effectiveRoles: string[]; isAdmin: boolean }) {
  return isDirector(user.effectiveRoles) || user.isAdmin;
}

// GET: miembros elegibles para vetar + ids actualmente vetados.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManage(user)) return forbidden();

  const { id } = await params;

  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  // Elegibles: miembros del consejo, es decir quienes tienen al menos un periodo
  // de membresía (presente o pasado).
  const users = await prisma.user.findMany({
    where: { membershipPeriods: { some: {} } },
    select: { id: true, name: true, fullName: true },
    orderBy: { name: "asc" },
  });

  const members = users.map((u) => ({ id: u.id, name: u.fullName ?? u.name }));

  const recusals = await prisma.topicRecusal.findMany({
    where: { topicId: id },
    select: { userId: true },
  });

  return NextResponse.json({
    members,
    recusedIds: recusals.map((r) => r.userId),
  });
}

// PUT: reemplaza el conjunto de vetados del tema.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManage(user)) return forbidden();

  const { id } = await params;
  const body = await request.json();
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];

  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.topicRecusal.deleteMany({ where: { topicId: id } }),
    prisma.topicRecusal.createMany({
      data: userIds.map((userId) => ({ topicId: id, userId })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ recusedIds: userIds });
}
