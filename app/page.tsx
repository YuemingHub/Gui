import type { Metadata } from "next";
import { GuiHero } from "@/components/layout/GuiHero";

export const metadata: Metadata = {
  title: "ymai.me",
  description: "把散出去的，慢慢收回来。",
};

/**
 * Final ymai.me home. Frozen design (2026-08-30):
 * screen 1 — faint "ymai.me" top-left, "关于我" top-right, giant centered
 * 「归」 with a faint breathing ring, and the single real entry
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

function FinalHome() {
  return (
    <main className="relative">
      {/* ---- 第一屏 ---- */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 pt-[calc(1.15rem+var(--sat))] sm:px-10">
          <span className="select-none text-[11px] tracking-[0.22em] text-stone-600">
            ymai.me
          </span>
          <a
            href="/about/"
            className="text-[13px] text-stone-500 transition-colors duration-500 hover:text-stone-300"
          >
            关于我
          </a>
        </header>

        <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16">
          {/* 原版 /gui 的 GuiHero：特效代码原样平移（声呐环 / 光晕 / 点击涟漪 / 微倾 / 呼吸） */}
          <GuiHero activated onEnter={() => {}} showCaption={false} />

          <a
            href="/return/"
            className="mt-12 rounded-full border border-white/10 bg-white/[0.04] px-8 py-3.5 text-sm text-stone-300 transition-colors duration-500 hover:border-white/20 hover:bg-white/[0.07] hover:text-stone-100"
            style={{ animation: "homeFade 2s ease-out 0.5s both" }}
          >
            进入我的空间
          </a>
        </div>
      </section>

      {/* ---- 第二屏 ---- */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <h2
          className="font-medium leading-[1.4] tracking-[-0.02em] text-stone-100"
          style={{ fontSize: "clamp(1.9rem, 5.5vw, 3.1rem)" }}
        >
          把散出去的
          <br />
          慢慢收回来
        </h2>
        <p className="mt-9 max-w-xl text-[15px] leading-9 text-stone-400">
          这里不是一个必须正确的地方。在这个草台班子的世界里，先认真活自己。
        </p>
      </section>

      {/* ---- 底部：仅备案 ---- */}
      <footer className="pb-[calc(1.4rem+var(--sab))] pt-12 text-center">
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-stone-600 transition-colors duration-500 hover:text-stone-400"
        >
          陕ICP备2026014869号-2
        </a>
      </footer>
    </main>
  );
}
