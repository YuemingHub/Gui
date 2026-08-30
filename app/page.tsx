import type { Metadata } from "next";
import { FinalHome } from "@/components/home/FinalHome";

export const metadata: Metadata = {
  title: "ymai.me",
  description: "把散出去的，慢慢收回来。",
};

/**
 * Final ymai.me home. Frozen design (2026-08-30):
 * screen 1 — faint "ymai.me" top-left, "关于我" top-right, and the original
 * /gui GuiHero (ported verbatim, effects intact) with the single real entry
 * 「进入我的空间」 → /return (the Return-to-oneself product).
 * screen 2 — the frozen title and the one frozen line.
 * footer — the real ICP filing only.
 *
 * The former seven-module workspace (AppShell, sections, data tools) is no
 * longer rendered from the home route; its code is preserved in the repo and
 * in Git history (see components/sections, components/layout).
 */
export default function Home() {
  return <FinalHome />;
}
