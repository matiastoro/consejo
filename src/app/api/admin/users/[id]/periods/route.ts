import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";
import { UserRole } from "@prisma/client";

const PERIOD_ROLES = ["DIRECTOR", "SUBDIRECTOR", "JEFE_DOCENTE", "CONSEJERO", "INVITADO"];

// GET: periodos de membresía de un usuario.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const periods = await prisma.membershipPeriod.findMany({
    where: { userId: id },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(periods);
}

// POST: crear un periodo { role, startDate, endDate? }.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { role, startDate, endDate } = body as {
    role?: string;
    startDate?: string;
    endDate?: string | null;
  };

  if (!role || !PERIOD_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Rol inválido" },
      { status: 400 }
    );
  }
  if (!startDate) {
    return NextResponse.json(
      { error: "La fecha de inicio es obligatoria" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (isNaN(start.getTime()) || (end && isNaN(end.getTime()))) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  if (end && end < start) {
    return NextResponse.json(
      { error: "La fecha de término no puede ser anterior al inicio" },
      { status: 400 }
    );
  }

  const userExists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!userExists) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const period = await prisma.membershipPeriod.create({
    data: { userId: id, role: role as UserRole, startDate: start, endDate: end },
  });

  return NextResponse.json(period, { status: 201 });
}

// PUT: editar un periodo { periodId, role, startDate, endDate? }.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { periodId, role, startDate, endDate } = body as {
    periodId?: string;
    role?: string;
    startDate?: string;
    endDate?: string | null;
  };

  if (!periodId) {
    return NextResponse.json({ error: "periodId es obligatorio" }, { status: 400 });
  }
  if (!role || !PERIOD_ROLES.includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  if (!startDate) {
    return NextResponse.json(
      { error: "La fecha de inicio es obligatoria" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (isNaN(start.getTime()) || (end && isNaN(end.getTime()))) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  if (end && end < start) {
    return NextResponse.json(
      { error: "La fecha de término no puede ser anterior al inicio" },
      { status: 400 }
    );
  }

  // El periodo debe pertenecer al usuario de la ruta.
  const existing = await prisma.membershipPeriod.findUnique({ where: { id: periodId } });
  if (!existing || existing.userId !== id) {
    return NextResponse.json({ error: "Periodo no encontrado" }, { status: 404 });
  }

  const period = await prisma.membershipPeriod.update({
    where: { id: periodId },
    data: { role: role as UserRole, startDate: start, endDate: end },
  });

  return NextResponse.json(period);
}

// DELETE: borrar un periodo por ?periodId=
export async function DELETE(request: NextRequest) {
  const admin = await getAuthUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get("periodId");
  if (!periodId) {
    return NextResponse.json({ error: "periodId es obligatorio" }, { status: 400 });
  }

  await prisma.membershipPeriod.delete({ where: { id: periodId } });
  return NextResponse.json({ success: true });
}
