import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";
import { fetchPhotoUrl } from "@/lib/ucampus";

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
      { error: "El usuario no tiene RUT; no se puede consultar Mufasa" },
      { status: 400 }
    );
  }

  const photoUrl = await fetchPhotoUrl(user.rut);
  if (!photoUrl) {
    return NextResponse.json(
      { error: "Mufasa no devolvió una foto para este RUT" },
      { status: 404 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { image: photoUrl },
    select: { id: true, image: true },
  });

  return NextResponse.json(updated);
}
