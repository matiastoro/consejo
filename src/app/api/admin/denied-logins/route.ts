import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";

// Intentos de acceso por SSO que fueron rechazados por no existir
// como usuario en la allowlist. Sirve para diagnosticar por qué
// alguien no puede loguear (RUT/correo no coincide con lo pre-cargado).
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attempts = await prisma.deniedLogin.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(attempts);
}
