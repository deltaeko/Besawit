import type { MetadataRoute } from "next";

import { appBrand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appBrand.name,
    short_name: appBrand.shortName,
    description: appBrand.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#f3f7f2",
    theme_color: "#1f3b23",
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
