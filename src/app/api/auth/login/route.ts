import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { authenticateUser, resolveUserPermissions } from "@/services/auth-service";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = loginSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password format." },
      { status: 400 },
    );
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);

  if (!user) {
    return NextResponse.json(
      { error: "Email atau password tidak valid." },
      { status: 401 },
    );
  }

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.roleCode,
    permissions: resolveUserPermissions(user),
  });

  return NextResponse.json({ ok: true });
}
