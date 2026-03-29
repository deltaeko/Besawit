import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { clearSession } from "@/lib/auth/session";

export async function POST() {
  await clearSession();
  return NextResponse.redirect(new URL("/login", env.APP_URL), { status: 303 });
}
