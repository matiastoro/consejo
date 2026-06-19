import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";
import { activeMembersAt } from "@/lib/acta";

// Candidatos a asistencia = miembros con cargo del consejo vigente a la fecha de
// la sesión, marcando quién ya está registrado como asistente.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const session = await prisma.councilSession.findUnique({
    where: { id },
    include: { attendees: { select: { userId: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      roles: true,
      membershipPeriods: { select: { role: true, startDate: true, endDate: true } },
    },
  });

  const attendedIds = new Set(session.attendees.map((a) => a.userId));
  const candidates = activeMembersAt(users, new Date(session.date)).map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    abbrev: m.abbrev,
    isGuest: m.isGuest,
    attended: attendedIds.has(m.id),
  }));

  return NextResponse.json({ candidates });
}

// Reemplaza la lista de asistentes con los userIds recibidos. isGuest se deriva
// del cargo activo a la fecha de la sesión.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isDirector(user.effectiveRoles) && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const attendeeIds: string[] = Array.isArray(body.attendeeIds) ? body.attendeeIds : [];

  const session = await prisma.councilSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: attendeeIds } },
    select: {
      id: true,
      name: true,
      roles: true,
      membershipPeriods: { select: { role: true, startDate: true, endDate: true } },
    },
  });
  const guestById = new Map(
    activeMembersAt(users, new Date(session.date)).map((m) => [m.id, m.isGuest])
  );

  await prisma.$transaction([
    prisma.sessionAttendee.deleteMany({ where: { sessionId: id } }),
    prisma.sessionAttendee.createMany({
      data: attendeeIds.map((userId) => ({
        sessionId: id,
        userId,
        isGuest: guestById.get(userId) ?? false,
      })),
    }),
  ]);

  return NextResponse.json({ success: true });
}
