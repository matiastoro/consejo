import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const VALID_ROLES = ["DIRECTOR", "SUBDIRECTOR", "JEFE_DOCENTE", "CONSEJERO", "INVITADO", "PROFESOR"];

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      rut: true,
      image: true,
      roles: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

// Pre-carga de usuarios: define el rol antes del primer login.
// Requiere al menos RUT o correo. El usuario entra por SSO y se le
// completan los datos faltantes en ese primer acceso.
export async function POST(request: NextRequest) {
  const admin = await getAuthUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, roles, isAdmin } = body as {
    name?: string;
    roles?: string[];
    isAdmin?: boolean;
  };

  const email = (body.email as string | undefined)?.trim() || null;
  const rut = (body.rut as string | undefined)?.trim() || null;

  if (!email && !rut) {
    return NextResponse.json(
      { error: "Debes indicar al menos un RUT o un correo" },
      { status: 400 }
    );
  }

  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json(
      { error: "At least one role is required" },
      { status: 400 }
    );
  }
  if (!roles.every((r) => VALID_ROLES.includes(r))) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Evitar duplicados por RUT o correo.
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(rut ? [{ rut }] : []),
      ],
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese RUT o correo" },
      { status: 409 }
    );
  }

  // Contraseña inutilizable: estos usuarios entran solo por SSO.
  const unusablePassword = await bcrypt.hash(randomUUID(), 10);
  const displayName = name?.trim() || email || rut || "Usuario";

  const created = await prisma.user.create({
    data: {
      name: displayName,
      fullName: name?.trim() || null,
      email,
      rut,
      password: unusablePassword,
      roles: roles as UserRole[],
      isAdmin: isAdmin ?? false,
      profile: { create: {} },
    },
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      rut: true,
      roles: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
