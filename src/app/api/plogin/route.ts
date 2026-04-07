import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { encode } from "next-auth/jwt";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { fetchPhotoUrl } from "@/lib/ucampus";

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

  let user = await prisma.user.findFirst({
    where: { rut },
  });

  const email = payload.email as string | undefined;
  const fullName = payload.name as string | undefined;
  const username = (payload.preferred_username as string | undefined) ?? rut;

  if (!user) {
    if (!email) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=vti_no_email", base)
      );
    }

    const unusablePassword = await bcrypt.hash(randomUUID(), 10);

    user = await prisma.user.create({
      data: {
        name: fullName ?? username,
        email,
        fullName: fullName ?? username,
        rut,
        password: unusablePassword,
        roles: ["PROFESOR"],
        profile: { create: {} },
      },
    });
  } else if (fullName && (user.name !== fullName || user.fullName !== fullName)) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name: fullName, fullName },
    });
  }

  // Fetch photo from UCampus if user doesn't have one
  if (!user.image && rut) {
    const photoUrl = await fetchPhotoUrl(rut);
    if (photoUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { image: photoUrl },
      });
    }
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
