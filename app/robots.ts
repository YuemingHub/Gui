import type { MetadataRoute } from "next";
import { publicOrigin } from "./lib/site";

export const dynamic = "force-static";

// The gated default: there is a login wall, and behind it one person's words.
// Nothing here is for crawlers, so nothing is allowed — and there is no
// sitemap.ts any more, because a private space has no URLs to publish. A public
// marketing surface, if one ever exists, gets its own files.
export default function robots(): MetadataRoute.Robots {
  if (publicOrigin()) {
    return { rules: [{ userAgent: "*", disallow: "/api/" }] };
  }
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
