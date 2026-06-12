const defaultPrimaryColor = "#1f3b23";
const defaultAccentColor = "#e0f46e";
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim() ?? "";
  return hexColorPattern.test(normalized) ? normalized.toLowerCase() : fallback;
}

function clampAlpha(alpha: number) {
  return Math.min(1, Math.max(0, alpha));
}

function getContrastForeground(hexColor: string) {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance >= 160 ? "#18221a" : "#f7fbf8";
}

export function hexToRgbChannels(hexColor: string) {
  const normalized = normalizeHexColor(hexColor, defaultPrimaryColor);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);

  return `${red} ${green} ${blue}`;
}

export function withHexAlpha(hexColor: string, alpha: number) {
  const normalized = normalizeHexColor(hexColor, defaultPrimaryColor);
  const alphaHex = Math.round(clampAlpha(alpha) * 255)
    .toString(16)
    .padStart(2, "0");

  return `${normalized}${alphaHex}`;
}

export function buildBrandTheme(input?: {
  primaryColor?: string | null;
  accentColor?: string | null;
}) {
  const primaryColor = normalizeHexColor(input?.primaryColor, defaultPrimaryColor);
  const accentColor = normalizeHexColor(input?.accentColor, defaultAccentColor);

  return {
    "--brand-primary": primaryColor,
    "--brand-primary-rgb": hexToRgbChannels(primaryColor),
    "--brand-primary-foreground": getContrastForeground(primaryColor),
    "--brand-primary-soft": withHexAlpha(primaryColor, 0.08),
    "--brand-primary-muted": withHexAlpha(primaryColor, 0.14),
    "--brand-accent": accentColor,
    "--brand-accent-rgb": hexToRgbChannels(accentColor),
    "--brand-accent-foreground": getContrastForeground(accentColor),
    "--brand-accent-soft": withHexAlpha(accentColor, 0.22),
    "--brand-accent-glow": withHexAlpha(accentColor, 0.18),
    "--primary": primaryColor,
    "--primary-foreground": getContrastForeground(primaryColor),
    "--secondary": withHexAlpha(primaryColor, 0.08),
    "--secondary-foreground": primaryColor,
    "--accent": withHexAlpha(accentColor, 0.22),
    "--accent-foreground": "#234634",
    "--ring": primaryColor,
  } as Record<string, string>;
}
