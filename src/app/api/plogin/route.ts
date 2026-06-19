import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { encode } from "next-auth/jwt";
import { fetchPersona } from "@/lib/ucampus";

function parseVtiRut(identification: string): string {
  const stripped = identification.replace(/^0+/, "");
  if (stripped.length <= 1) return stripped;
  return stripped.slice(0, -1);
}

export async function GET(request: NextRequest) {
  const base = process.env.NEXTAUTH_URL!;
  const token = request.nextUrl.searchParams.get("jwt");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=vti_missing_token", base)
    );
  }

  const vtiSecret = process.env.VTI_JWT_SECRET;
  if (!vtiSecret) {
    console.error("VTI_JWT_SECRET env var not set");
    return NextResponse.redirect(
      new URL("/auth/signin?error=vti_config", base)
    );
  }

  let payload: Record<string, unknown>;
  try {
    const key = new TextEncoder().encode(vtiSecret);
    const { payload: decoded } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    payload = decoded as Record<string, unknown>;
  } catch {
    return NextResponse.redirect(
      new URL("/auth/signin?error=vti_invalid_token", base)
    );
  }

  console.log("[plogin] VTI payload:", JSON.stringify(payload, null, 2));

  const identification = payload.identification as string | undefined;
  if (!identification) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=vti_no_identification", base)
    );
  }

  const rut = parseVtiRut(identification);
  const email = payload.email as string | undefined;
  const fullName = payload.name as string | undefined;

  // Allowlist: solo entran usuarios pre-cargados o ya existentes.
  // Se busca por RUT o correo (al menos uno debe coincidir).
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ rut }, ...(email ? [{ email }] : [])],
    },
  });

  if (!user) {
    console.warn(
      `[plogin] Acceso denegado (usuario inexistente): rut=${rut} email=${email ?? "-"}`
    );
    await prisma.deniedLogin.create({
      data: {
        rut,
        email,
        name: fullName,
        identification,
        reason: "no_autorizado",
      },
    });
    return NextResponse.redirect(
      new URL("/auth/signin?error=no_autorizado", base)
    );
  }

  // Datos desde Ucampus: alias (nombre para mostrar), nombre completo y foto.
  const persona = rut ? await fetchPersona(rut) : null;

  // Usuario existente: completar o refrescar datos sin tocar roles.
  const updates: Record<string, unknown> = {};
  if (!user.rut && rut) updates.rut = rut;
  if (!user.email && email) updates.email = email;

  // Nombre completo (legal): preferir el de VTI; si no, el de Ucampus.
  const legalName = fullName || persona?.fullName || null;
  if (legalName && user.fullName !== legalName) updates.fullName = legalName;

  // Nombre para mostrar: el alias de Ucampus. Si Ucampus no entrega alias,
  // no se pisa el nombre existente; solo si el usuario aún no tiene uno se
  // usa el nombre legal como respaldo.
  if (persona?.alias) {
    if (user.name !== persona.alias) updates.name = persona.alias;
  } else if (!user.name && legalName) {
    updates.name = legalName;
  }

  // Foto: completar si falta.
  if (!user.image && persona?.image) updates.image = persona.image;

  if (Object.keys(updates).length > 0) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: updates,
    });
  }

  const sessionJwt = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,
      roles: user.roles,
      isAdmin: user.isAdmin,
    },
    secret: process.env.NEXTAUTH_SECRET!,
  });

  const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://");
  const cookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const response = NextResponse.redirect(new URL("/dashboard", base));
  response.cookies.set(cookieName, sessionJwt, {
    httpOnly: true,
    secure: !!isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
