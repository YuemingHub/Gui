import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE_URL =
  process.env.DEPLOY_TARGET === "github-pages"
    ? "https://yueminghub.github.io/Gui"
    : process.env.SITE_URL || "https://gui-flax-tau.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
