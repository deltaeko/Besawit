import { NextResponse } from "next/server";

import {
  canPerformAction,
  type AppActionPermissionKey,
} from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/api-guard";
import type { SessionPayload } from "@/lib/auth/session";

export async function requireActionPermission(key: AppActionPermissionKey) {
  const auth = await requireSessionUser();
  if (auth.response || !auth.session) {
    return auth;
  }

  if (!canPerformAction(auth.session.role, auth.session.permissions, key)) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Anda tidak memiliki hak akses untuk aksi ini." },
        { status: 403 },
      ),
    };
  }

  return { session: auth.session as SessionPayload, response: null };
}
