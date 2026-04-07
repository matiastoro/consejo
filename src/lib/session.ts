import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function canVote(roles: string[]): boolean {
  return roles.some((r) =>
    ["DIRECTOR", "JEFE_DOCENTE", "CONSEJERO"].includes(r)
  );
}

export function isDirector(roles: string[]): boolean {
  return roles.includes("DIRECTOR");
}

export function canCreateTopics(roles: string[]): boolean {
  return roles.some((r) =>
    ["DIRECTOR", "JEFE_DOCENTE", "CONSEJERO"].includes(r)
  );
}
