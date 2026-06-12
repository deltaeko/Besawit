import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth/session";
import { resolveTenantContextByHost } from "@/lib/platform/tenant-resolver";
import { loginSchema } from "@/lib/validation/auth";
import {
  authenticateUser,
  recordSuccessfulLogin,
  resolveUserPermissions,
} from "@/services/auth-service";

export async function POST(request: Request) {
  const tenantContext = await resolveTenantContextByHost(request.headers.get("host"));

  if (tenantContext.kind === "tenant" && tenantContext.instance?.status !== "ready") {
    return NextResponse.json(
      {
        error:
          "Instance trial belum siap dipakai. Silakan tunggu proses provisioning selesai.",
      },
      { status: 423 },
    );
  }

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

  const isFirstLogin = !user.lastLoginAt;

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.roleCode,
    permissions: resolveUserPermissions(user),
  });
  await recordSuccessfulLogin(user.id);

  return NextResponse.json({ ok: true, firstLogin: isFirstLogin });
}
