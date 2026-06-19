// Helpers de roles puros (sin dependencias de auth/prisma) para evitar ciclos de
// importación. session.ts los re-exporta para mantener las importaciones existentes.

export interface PeriodLike {
  role: string;
  startDate: Date;
  endDate: Date | null;
}

// Roles efectivos: institucionales (User.roles) más los roles de periodos
// vigentes a la fecha `at`. CONSEJERO/INVITADO solo cuentan si hay periodo activo.
export function effectiveRoles(
  roles: string[],
  periods: PeriodLike[],
  at: Date = new Date()
): string[] {
  const active = periods
    .filter((p) => p.startDate <= at && (p.endDate === null || p.endDate >= at))
    .map((p) => p.role);
  return Array.from(new Set([...roles, ...active]));
}

// Visibilidad completa (todos los temas sin importar periodos): solo el admin
// técnico. Todos los cargos (incluido el director) ven solo los temas dentro de
// sus periodos.
export function hasFullVisibility(_roles: string[], isAdmin: boolean): boolean {
  return isAdmin;
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

// Quién puede ver un tema. El admin ve todo. El resto ve los temas cuyo
// createdAt cae dentro de alguno de sus periodos (o que ellos crearon). Los
// PENDING_APPROVAL solo los ve su autor o un director vigente (que debe poder
// aprobarlos). El veto por conflicto de interés es ortogonal: un usuario puede
// "ver" el tema (título/descripción) pero estar vetado del resto.
export function canViewTopic(
  user: {
    id: string;
    effectiveRoles: string[];
    isAdmin: boolean;
    membershipPeriods: PeriodLike[];
  },
  topic: { status: string; authorId: string; createdAt: Date }
): boolean {
  if (user.isAdmin) return true;

  const inWindow =
    topic.authorId === user.id ||
    user.membershipPeriods.some(
      (p) =>
        topic.createdAt >= p.startDate &&
        (p.endDate === null || topic.createdAt <= p.endDate)
    );
  if (!inWindow) return false;

  if (
    topic.status === "PENDING_APPROVAL" &&
    topic.authorId !== user.id &&
    !isDirector(user.effectiveRoles)
  ) {
    return false;
  }
  return true;
}
