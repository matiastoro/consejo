// Migración única y no destructiva.
// Mueve los cargos (DIRECTOR, SUBDIRECTOR, JEFE_DOCENTE, CONSEJERO, INVITADO) de
// User.roles a MembershipPeriod, dejando a los miembros actuales vigentes del
// 2026-01-01 al 2026-12-31. Idempotente: si un usuario ya tiene un periodo
// equivalente, no lo duplica.
//
// Uso: node scripts/migrate-memberships.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PERIOD_ROLES = ["DIRECTOR", "SUBDIRECTOR", "JEFE_DOCENTE", "CONSEJERO", "INVITADO"];
const START = new Date("2026-01-01T00:00:00.000Z");
const END = new Date("2026-12-31T23:59:59.999Z");

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, roles: true },
  });

  let created = 0;
  let updated = 0;

  for (const user of users) {
    const periodRoles = user.roles.filter((r) => PERIOD_ROLES.includes(r));
    if (periodRoles.length === 0) continue;

    for (const role of periodRoles) {
      const existing = await prisma.membershipPeriod.findFirst({
        where: { userId: user.id, role, startDate: START, endDate: END },
      });
      if (!existing) {
        await prisma.membershipPeriod.create({
          data: { userId: user.id, role, startDate: START, endDate: END },
        });
        created++;
        console.log(`+ periodo ${role} 2026 para ${user.name}`);
      }
    }

    const remaining = user.roles.filter((r) => !PERIOD_ROLES.includes(r));
    if (remaining.length !== user.roles.length) {
      await prisma.user.update({
        where: { id: user.id },
        data: { roles: remaining },
      });
      updated++;
    }
  }

  console.log(`\nListo. Periodos creados: ${created}. Usuarios con roles ajustados: ${updated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
