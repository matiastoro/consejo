import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const rut = "19039752";
  const email = "admin@dcc.uchile.cl";
  const password = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.upsert({
    where: { rut },
    update: {
      roles: ["DIRECTOR"],
      isAdmin: true,
    },
    create: {
      name: "Administrador",
      email,
      password,
      rut,
      roles: ["DIRECTOR"],
      isAdmin: true,
      profile: { create: {} },
    },
  });

  console.log(`Usuario director creado/actualizado: ${user.email} (RUT: ${user.rut})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
