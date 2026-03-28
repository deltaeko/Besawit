import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { env } from "@/lib/env";
import type { RolePermissionMap } from "@/lib/auth/permissions";
import type { AppRole } from "@/types/domain";

const SESSION_COOKIE = "besawit_session";
const secret = new TextEncoder().encode(env.SESSION_SECRET);
const useSecureCookie =
  env.NODE_ENV === "production" && env.APP_URL.startsWith("https://");

export type SessionPayload = {
  sub: string;
  role: AppRole;
  email: string;
  name: string;
  permissions: RolePermissionMap;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookie,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);

    return payload as SessionPayload;
  } catch {
    return null;
  }
}
