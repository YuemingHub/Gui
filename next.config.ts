import type { NextConfig } from "next";

// Gui is an independent local-first product. main stays basePath-free for its
// root GitHub Pages deploy (CNAME ymai.fun). On ymai.me it is served from its
// own subpath via a deployment-time override only
// (NEXT_PUBLIC_BASE_PATH=/gui npm run build), which is also inlined for client
// code that references /public assets directly (AmbientBgm).
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(BASE_PATH ? { basePath: BASE_PATH } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

export default nextConfig;
