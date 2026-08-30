import type { NextConfig } from "next";

// This integration branch targets the ymai.me/gui subpath. The static export is
// served by nginx at /gui/, so asset URLs must be /gui-prefixed. main remains
// basePath-free for its root GitHub Pages deploy; this divergence is by design.
// NEXT_PUBLIC_BASE_PATH is inlined for client code that references /public
// assets directly (e.g. AmbientBgm's audio source). A staging build overrides
// it via the environment (NEXT_PUBLIC_BASE_PATH=/gui-alpha npm run build).
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/gui";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

export default nextConfig;
