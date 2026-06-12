import { buildBrandIconResponse } from "@/lib/branding-icon-response";

export const runtime = "nodejs";

export async function GET() {
  return buildBrandIconResponse({
    size: 180,
    borderRadius: 42,
    fontSize: 72,
    letterSpacing: "0.18em",
  });
}
