import { NextResponse } from "next/server";

import { setupAccountSchema } from "@/lib/validation/auth";
import { completeTrialSetup } from "@/services/trial-setup-service";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = setupAccountSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Token atau password setup akun tidak valid." },
      { status: 400 },
    );
  }

  try {
    const result = await completeTrialSetup({
      host: request.headers.get("host"),
      token: parsed.data.token,
      password: parsed.data.password,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Setup akun belum berhasil diproses.",
      },
      { status: 400 },
    );
  }
}
