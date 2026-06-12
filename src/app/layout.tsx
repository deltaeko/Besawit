import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";

import { appBrand } from "@/lib/brand";
import { buildBrandTheme } from "@/lib/branding-theme";
import { getResolvedBrandingSettings } from "@/services/branding-service";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const branding = await getResolvedBrandingSettings();
    const cacheKey = branding.updatedAt?.getTime() ?? 0;

    return {
      title: {
        default: branding.appDisplayName,
        template: `%s | ${branding.appDisplayName}`,
      },
      description: branding.tagline,
      applicationName: branding.appDisplayName,
      manifest: "/manifest.webmanifest",
      icons: {
        icon: `/api/brand-icon?v=${cacheKey}`,
        apple: `/api/brand-apple-icon?v=${cacheKey}`,
      },
    };
  } catch {
    return {
      title: {
        default: appBrand.name,
        template: `%s | ${appBrand.name}`,
      },
      description: appBrand.tagline,
      applicationName: appBrand.name,
      manifest: "/manifest.webmanifest",
      icons: {
        icon: "/api/brand-icon",
        apple: "/api/brand-apple-icon",
      },
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let theme = buildBrandTheme();

  try {
    const branding = await getResolvedBrandingSettings();
    theme = buildBrandTheme(branding);
  } catch {
    // Fall back to the default theme if branding storage is unavailable.
  }

  return (
    <html
      lang="id"
      className={`${inter.variable} ${plexMono.variable}`}
      style={theme}
    >
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
