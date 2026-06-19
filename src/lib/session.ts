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
    ["DIRECTOR", "SUBDIRECTOR", "JEFE_DOCENTE", "CONSEJERO"].includes(r)
  );
}

export function isDirector(roles: string[]): boolean {
  return roles.includes("DIRECTOR");
}

export function canCreateTopics(roles: string[]): boolean {
  return roles.some((r) =>
    ["DIRECTOR", "SUBDIRECTOR", "JEFE_DOCENTE", "CONSEJERO"].includes(r)
  );
}

// Quién puede ver un tema. Refleja el filtro del listado en /api/topics.
// (Los periodos de membresía y los vetos por conflicto de interés se
// integrarán aquí más adelante.)
export function canViewTopic(
  user: { id: string; roles: string[]; isAdmin: boolean },
  topic: { status: string; authorId: string }
): boolean {
  if (isDirector(user.roles) || user.isAdmin) return true;
  if (topic.status !== "PENDING_APPROVAL") return true;
  return topic.authorId === user.id;
}
