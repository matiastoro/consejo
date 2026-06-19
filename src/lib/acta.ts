// Helpers compartidos para el acta: cargos del consejo, siglas y derivación de
// miembros activos a una fecha. Sin dependencias de auth para poder reutilizarlo
// tanto en endpoints como en la generación del PDF.
import { effectiveRoles, type PeriodLike } from "@/lib/roles";

// Cargos que componen el consejo (excluye PROFESOR, que es la base institucional).
export const GOVERNING_ROLES = [
  "DIRECTOR",
  "SUBDIRECTOR",
  "JEFE_DOCENTE",
  "CONSEJERO",
  "INVITADO",
] as const;

// Sigla que se muestra entre paréntesis junto al nombre en el acta. Los
// consejeros e invitados no llevan sigla, igual que en el formato oficial.
const ROLE_ABBREV: Record<string, string> = {
  DIRECTOR: "D",
  SUBDIRECTOR: "SD",
  JEFE_DOCENTE: "JD",
};

// Orden de precedencia para listar y para elegir el cargo principal.
const ROLE_RANK: Record<string, number> = {
  DIRECTOR: 0,
  SUBDIRECTOR: 1,
  JEFE_DOCENTE: 2,
  CONSEJERO: 3,
  INVITADO: 4,
};

export function roleAbbrev(role: string): string {
  return ROLE_ABBREV[role] ?? "";
}

// De los roles efectivos, el cargo de mayor jerarquía dentro del consejo.
export function primaryGoverningRole(roles: string[]): string | null {
  const governing = roles.filter((r) => r in ROLE_RANK);
  if (governing.length === 0) return null;
  governing.sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b]);
  return governing[0];
}

export interface MemberLike {
  id: string;
  name: string;
  roles: string[];
  membershipPeriods: PeriodLike[];
}

export interface ActiveMember {
  id: string;
  name: string;
  role: string; // cargo principal a la fecha
  abbrev: string;
  isGuest: boolean; // true si el cargo principal es INVITADO
  rank: number;
}

// Miembros con un cargo del consejo vigente a la fecha `at`, ordenados por
// jerarquía y luego por nombre. Sirve para sembrar la asistencia de una sesión.
export function activeMembersAt(members: MemberLike[], at: Date): ActiveMember[] {
  const result: ActiveMember[] = [];
  for (const m of members) {
    const roles = effectiveRoles(m.roles, m.membershipPeriods, at);
    const role = primaryGoverningRole(roles);
    if (!role) continue;
    result.push({
      id: m.id,
      name: m.name,
      role,
      abbrev: roleAbbrev(role),
      isGuest: role === "INVITADO",
      rank: ROLE_RANK[role],
    });
  }
  result.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "es"));
  return result;
}

// "Nombre (SIGLA)" o "Nombre" si el cargo no lleva sigla.
export function formatAttendee(name: string, role: string): string {
  const ab = roleAbbrev(role);
  return ab ? `${name} (${ab})` : name;
}
