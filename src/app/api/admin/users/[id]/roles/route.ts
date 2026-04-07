import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";
import { UserRole } from "@prisma/client";

const VALID_ROLES = ["DIRECTOR", "JEFE_DOCENTE", "CONSEJERO", "INVITADO", "PROFESOR"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { roles, isAdmin } = body as { roles?: string[]; isAdmin?: boolean };

  const data: any = {};

  if (roles !== undefined) {
    if (!Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json({ error: "At least one role is required" }, { status: 400 });
    }
    if (!roles.every((r) => VALID_ROLES.includes(r))) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.roles = roles as UserRole[];
  }

  if (isAdmin !== undefined) {
    data.isAdmin = isAdmin;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      isAdmin: true,
    },
  });

  return NextResponse.json(updated);
}
