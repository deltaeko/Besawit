import { NextResponse } from "next/server";

import {
  canPerformAction,
  type AppActionPermissionKey,
} from "@/lib/auth/permissions";
import { getSession, type SessionPayload } from "@/lib/auth/session";

export async function requireActionPermission(key: AppActionPermissionKey) {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  if (!canPerformAction(session.role, session.permissions, key)) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Anda tidak memiliki hak akses untuk aksi ini." },
        { status: 403 },
      ),
    };
  }

  return { session: session as SessionPayload, response: null };
}
