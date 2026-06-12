import { buildBrandIconResponse } from "@/lib/branding-icon-response";

export const runtime = "nodejs";

export async function GET() {
  return buildBrandIconResponse({
    size: 64,
    borderRadius: 18,
    fontSize: 28,
    letterSpacing: "0.24em",
  });
}
