import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const onVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isProd && !onVercel ? "/Gui" : "",
  assetPrefix: isProd && !onVercel ? "/Gui/" : "",
};

export default nextConfig;
