const defaultName = "Besawit";
const defaultTagline =
  "Platform operasional sawit, inventory, toko pertanian, dan finance.";

export function deriveBrandMark(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "BS";
}

const name = process.env.NEXT_PUBLIC_APP_NAME?.trim() || defaultName;
const shortName =
  process.env.NEXT_PUBLIC_APP_SHORT_NAME?.trim() || deriveBrandMark(name);
const mark = (process.env.NEXT_PUBLIC_APP_MARK?.trim() || shortName).slice(0, 3).toUpperCase();
const tagline = process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || defaultTagline;

export const appBrand = {
  name,
  shortName,
  mark,
  tagline,
  consoleLabel: `${name} Console`,
  platformLabel: `${name} Platform`,
};
