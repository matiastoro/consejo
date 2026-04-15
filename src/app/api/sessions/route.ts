import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, isDirector } from "@/lib/session";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const sessions = await prisma.councilSession.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      topics: { select: { discussed: true } },
    },
    orderBy: { date: "desc" },
  });

  // Count all discussing topics for the total
  const discussingCount = await prisma.topic.count({
    where: { status: { in: ["DISCUSSING", "APROBADO", "RECHAZADO"] } },
  });

  const enriched = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    date: s.date,
    status: s.status,
    createdBy: s.createdBy,
    createdAt: s.createdAt,
    totalTopics: discussingCount,
    discussedCount: s.topics.filter((t) => t.discussed).length,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isDirector(user.roles) && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, date } = body as { title: string; date: string };

  if (!title || !date) {
    return NextResponse.json(
      { error: "Title and date are required" },
      { status: 400 }
    );
  }

  const session = await prisma.councilSession.create({
    data: {
      title,
      date: new Date(date),
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Notify all users with voting roles
  const voters = await prisma.user.findMany({
    where: {
      roles: { hasSome: ["DIRECTOR", "JEFE_DOCENTE", "CONSEJERO"] },
      id: { not: user.id },
    },
    select: { id: true },
  });

  if (voters.length > 0) {
    await prisma.notification.createMany({
      data: voters.map((v) => ({
        userId: v.id,
        type: "SESSION_SCHEDULED" as const,
        title: "Nueva sesión programada",
        message: `Se ha programado la sesión "${title}" para el ${new Date(date).toLocaleDateString("es-CL")}`,
        sessionId: session.id,
      })),
    });
  }

  return NextResponse.json(session, { status: 201 });
}
