import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";
import { fetchPersona } from "@/lib/ucampus";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (!user.rut) {
    return NextResponse.json(
      { error: "El usuario no tiene RUT; no se puede consultar Ucampus" },
      { status: 400 }
    );
  }

  const persona = await fetchPersona(user.rut);

  // Distinguir "Ucampus caído / con error" de "persona sin datos".
  if (persona.status === null || persona.status >= 500) {
    return NextResponse.json(
      {
        error:
          "Ucampus no está disponible en este momento (mantención o error del servidor). Intenta más tarde.",
      },
      { status: 502 }
    );
  }
  if (persona.status === 401 || persona.status === 403) {
    return NextResponse.json(
      { error: "Ucampus rechazó la consulta (token inválido o sin permiso)" },
      { status: 502 }
    );
  }

  // Usar el alias de Ucampus como nombre para mostrar; el nombre completo
  // queda en fullName.
  const data: { image?: string; name?: string; fullName?: string } = {};
  if (persona.image) data.image = persona.image;
  if (persona.alias) data.name = persona.alias;
  if (persona.fullName) data.fullName = persona.fullName;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Ucampus no devolvió datos para este RUT" },
      { status: 404 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, fullName: true, image: true },
  });

  return NextResponse.json(updated);
}
