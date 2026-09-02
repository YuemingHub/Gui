import type { NextConfig } from "next";

// Production static export is served by nginx at /gui/. Local headed
// verification can unset NEXT_PUBLIC_BASE_PATH and set RETURN_API_PROXY so
// the browser talks to the Return runtime without putting provider keys in Gui.
const rawBase = process.env.NEXT_PUBLIC_BASE_PATH;
const BASE_PATH = rawBase === undefined ? "/gui" : rawBase;
const RETURN_API_PROXY = (process.env.RETURN_API_PROXY || "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(BASE_PATH ? { basePath: BASE_PATH } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

if (RETURN_API_PROXY) {
  nextConfig.rewrites = async () => [
    {
      source: "/api/:path*",
      destination: `${RETURN_API_PROXY}/api/:path*`,
    },
  ];
}

export default nextConfig;
