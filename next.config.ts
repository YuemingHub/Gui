import type { NextConfig } from "next";

/**
 * 部署目标通过 DEPLOY_TARGET 环境变量控制：
 *   - "github-pages"  → GitHub Pages（basePath: /Gui）
 *   - 其他 / 未设置   → Cloudflare Pages / Vercel（根路径）
 */
const deployTarget = process.env.DEPLOY_TARGET || "";
const isGitHubPages = deployTarget === "github-pages";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isGitHubPages ? "/Gui" : "",
  assetPrefix: isGitHubPages ? "/Gui/" : "",
};

export default nextConfig;
