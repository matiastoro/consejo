import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";
import { effectiveRoles } from "./roles";

// Re-export de los helpers puros de roles para mantener las importaciones
// existentes desde "@/lib/session".
export {
  effectiveRoles,
  hasFullVisibility,
  canVote,
  isDirector,
  canCreateTopics,
  canViewTopic,
} from "./roles";
export type { PeriodLike } from "./roles";

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  // Identidad efectiva: el id del token (que ya apunta al usuario suplantado si
  // un admin está usando "Ver como"). Email como respaldo.
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email;
  if (!userId && !email) return null;

  const user = await prisma.user.findUnique({
    where: userId ? { id: userId } : { email: email! },
    include: { membershipPeriods: true },
  });
  if (!user) return null;

  return Object.assign(user, {
    effectiveRoles: effectiveRoles(user.roles, user.membershipPeriods),
  });
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ¿El usuario está vetado (conflicto de interés) en este tema?
export async function isRecused(topicId: string, userId: string): Promise<boolean> {
  const recusal = await prisma.topicRecusal.findUnique({
    where: { topicId_userId: { topicId, userId } },
  });
  return !!recusal;
}
