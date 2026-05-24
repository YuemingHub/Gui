import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isProd ? "/Gui" : "",
  assetPrefix: isProd ? "/Gui/" : "",
};

export default nextConfig;
