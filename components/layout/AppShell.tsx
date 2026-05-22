"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { SectionId } from "@/app/lib/types";
import { gentleFade, motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";
import { DataToolsPanel } from "./DataToolsPanel";
import { Navigation } from "./Navigation";

type AppShellProps = {
  saveMessage: string;
  onExport: () => void;
  onImport: (file: File) => Promise<{ ok: boolean; message: string }>;
  onReset: () => void;
  children: (activeSection: SectionId) => ReactNode;
};

const ALL_SECTIONS: SectionId[] = ["home", "truths", "clearings", "boundaries", "rhythm", "garden", "monthly"];

const readHashSection = (): SectionId => {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace("#", "");
  return ALL_SECTIONS.includes(hash as SectionId) ? (hash as SectionId) : "home";
};

const subscribeToHash = (onStoreChange: () => void) => {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
};

const getServerSection = (): SectionId => "home";

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) {
    return {
      eyebrow: "清晨",
      title: "早一点也没关系，慢一点也没关系。",
      line: "今天，先把自己放回眼前。",
      whisper: "不必把整天都想明白，只先靠近这一件真事。",
    };
  }

  if (hour >= 11 && hour < 17) {
    return {
      eyebrow: "下午",
      title: "世界已经很吵了，这里不用再证明什么。",
      line: "如果愿意，只留下一件你今天真正照看的事。",
      whisper: "先把外面的风声放低一点，再决定要不要落笔。",
    };
  }

  if (hour >= 17 && hour < 23) {
    return {
      eyebrow: "晚上",
      title: "先把散出去的心，慢慢收回来。",
      line: "哪怕只收回一点，也算回来了。",
      whisper: "今天剩下的部分，不用再冲，只要回来。",
    };
  }

  return {
    eyebrow: "深夜",
    title: "夜深的时候，先别急着处理整个人生。",
    line: "先在这里坐一下，只照看眼前这一件事。",
    whisper: "黑一点也没关系，先让呼吸落下来。",
  };
};

export function AppShell({ saveMessage, onExport, onImport, onReset, children }: AppShellProps) {
  const activeSection = useSyncExternalStore(subscribeToHash, readHashSection, getServerSection);
  const [toolsOpen, setToolsOpen] = useState(false);
  const greeting = useMemo(() => getGreeting(), []);

  const selectSection = (section: SectionId) => {
    window.history.replaceState(null, "", `#${section}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const isHome = activeSection === "home";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden text-stone-100">
      {/* Layer 1: deepest ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-1/2 top-[6%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(210,185,152,0.16),transparent_58%)] blur-[5rem]" />
        <div className="absolute right-[-10rem] top-[12%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(109,120,162,0.14),transparent_62%)] blur-[4rem]" />
        <div className="absolute left-[-9rem] top-[55%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(122,98,136,0.13),transparent_66%)] blur-[4.5rem]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 pb-[calc(1.5rem+var(--sab))] pt-[calc(1.25rem+var(--sat))] sm:px-9 sm:pb-[calc(2rem+var(--sab))] sm:pt-[calc(1.75rem+var(--sat))] lg:px-12 lg:pb-[calc(3rem+var(--sab))] lg:pt-[calc(2.5rem+var(--sat))]">
        {isHome ? (
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex min-h-[100dvh] flex-col">
            {/* Header */}
            <motion.div variants={slowFadeUp} className="flex items-start justify-between gap-6">
              <div className="max-w-sm">
                <p className="text-[11px] uppercase tracking-[0.38em] text-stone-600">回到自己</p>
                <p className="mt-4 leading-7 text-stone-500 sm:mt-5">逆流回自己。不是系统，不是问卷，只是一间让你慢慢回来的屋子。</p>
              </div>
              <button
                type="button"
                onClick={() => setToolsOpen((value) => !value)}
                className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-xs text-stone-500 transition hover:border-white/12 hover:bg-white/[0.06] hover:text-stone-300"
              >
                {toolsOpen ? "收起" : "本地与备份"}
              </button>
            </motion.div>

            {/* Tools */}
            <AnimatePresence initial={false}>
              {toolsOpen ? (
                <motion.div
                  key="home-tools"
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.38, ease: motionEase }}
                  className="mt-5"
                >
                  <DataToolsPanel
                    saveMessage={saveMessage}
                    onExport={onExport}
                    onImport={onImport}
                    onReset={onReset}
                    onOpenGuide={() => selectSection("home")}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Hero */}
            <main className="flex flex-1 flex-col justify-center py-14 sm:py-20 lg:py-28">
              <section className="mx-auto flex w-full max-w-6xl flex-col gap-14 lg:gap-20">
                {/* Title row */}
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,22rem)] lg:items-end">
                  <motion.div variants={slowFadeUp}>
                    <p className="text-[11px] uppercase tracking-[0.38em] text-stone-600">{greeting.eyebrow}</p>
                    <h1 className="mt-7 text-[2.1rem] font-medium tracking-[-0.04em] leading-[1.08] text-stone-100 sm:text-[3.6rem] lg:text-[5rem] lg:leading-[1.04]">
                      {greeting.title}
                    </h1>
                    <p className="mt-7 max-w-xl text-base leading-8 text-stone-300 sm:text-[17px] sm:leading-9">
                      {greeting.line}
                    </p>
                  </motion.div>

                  <motion.div
                    variants={gentleFade}
                    className="relative rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] p-4 shadow-[0_40px_120px_-72px_rgba(0,0,0,0.85)] backdrop-blur-sm sm:p-5 lg:justify-self-end"
                  >
                    <p className="text-[11px] uppercase tracking-[0.32em] text-stone-600">靠近</p>
                    <p className="mt-5 leading-7 text-stone-400">{greeting.whisper}</p>
                  </motion.div>
                </div>

                {/* Writing + sidebar */}
                <motion.div
                  variants={slowFadeUp}
                  className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start"
                >
                  <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.048),rgba(255,255,255,0.028))] p-5 shadow-[0_38px_110px_-72px_rgba(0,0,0,0.86)] sm:p-7">
                    {children(activeSection)}
                  </div>
                  <div className="space-y-5">
                    <div className="rounded-[1.75rem] border border-white/7 bg-white/[0.028] p-5">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-stone-600">停顿</p>
                      <p className="mt-4 leading-7 text-stone-500">不用一次完成全部。今天只先让一件事浮出来。</p>
                    </div>
                    <div className="rounded-[1.75rem] border border-white/7 bg-white/[0.022] p-5">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-stone-600">回声</p>
                      <p className="mt-4 text-xs leading-6 text-stone-600">{saveMessage}</p>
                    </div>
                  </div>
                </motion.div>
              </section>
            </main>

            {/* Footer nav */}
            <motion.footer variants={slowFadeUp} className="pb-[calc(0.5rem+var(--sab))] pt-3 sm:pb-[calc(1rem+var(--sab))] sm:pt-4">
              <Navigation activeSection={activeSection} onSelect={selectSection} variant="home" />
            </motion.footer>
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex min-h-[100dvh] flex-col">
            <motion.header variants={slowFadeUp} className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <button
                  type="button"
                  onClick={() => selectSection("home")}
                  className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-xs text-stone-500 transition hover:border-white/12 hover:bg-white/[0.06] hover:text-stone-300"
                >
                  回到自己
                </button>
                <p className="mt-5 text-sm leading-7 text-stone-500">这些房间还在，只是退后一点。先让内容在前，操作在后。</p>
              </div>
              <button
                type="button"
                onClick={() => setToolsOpen((value) => !value)}
                className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-xs text-stone-500 transition hover:border-white/12 hover:bg-white/[0.06] hover:text-stone-300"
              >
                {toolsOpen ? "收起" : "本地与备份"}
              </button>
            </motion.header>

            <motion.div variants={slowFadeUp} className="mt-6">
              <Navigation activeSection={activeSection} onSelect={selectSection} variant="room" />
            </motion.div>

            <AnimatePresence initial={false}>
              {toolsOpen ? (
                <motion.div
                  key="room-tools"
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.38, ease: motionEase }}
                  className="mt-6"
                >
                  <DataToolsPanel
                    saveMessage={saveMessage}
                    onExport={onExport}
                    onImport={onImport}
                    onReset={onReset}
                    onOpenGuide={() => selectSection("home")}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.main variants={slowFadeUp} className="mt-8 flex-1">
              {children(activeSection)}
            </motion.main>
          </motion.div>
        )}
      </div>
    </div>
  );
}
