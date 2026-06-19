import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";

export const dynamic = "force-dynamic";

// Estado del acta cacheada de la sesión, para que la UI muestre descargar /
// generando / regenerar sin bloquear.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const acta = await prisma.sessionActa.findUnique({ where: { sessionId: id } });

  if (!acta) {
    return NextResponse.json({ status: "NONE" });
  }

  return NextResponse.json({
    status: acta.status,
    mode: acta.mode,
    generatedAt: acta.generatedAt,
    error: acta.error,
  });
}
