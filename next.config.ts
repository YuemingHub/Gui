import type { NextConfig } from "next";

// This integration branch targets the ymai.me/gui subpath. The static export is
// served by nginx at /gui/, so asset URLs must be /gui-prefixed. main remains
// basePath-free for its root GitHub Pages deploy; this divergence is by design.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/gui",
};

export default nextConfig;
