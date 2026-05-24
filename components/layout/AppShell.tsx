"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { SectionId } from "@/app/lib/types";
import { motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";
import { DataToolsPanel } from "./DataToolsPanel";
import { GuiHero } from "./GuiHero";
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
    };
  }

  if (hour >= 11 && hour < 17) {
    return {
      eyebrow: "下午",
      title: "世界已经很吵了，这里不用再证明什么。",
      line: "如果愿意，只留下一件你今天真正照看的事。",
    };
  }

  if (hour >= 17 && hour < 23) {
    return {
      eyebrow: "晚上",
      title: "先把散出去的心，慢慢收回来。",
      line: "哪怕只收回一点，也算回来了。",
    };
  }

  return {
    eyebrow: "深夜",
    title: "夜深的时候，先别急着处理整个人生。",
    line: "先在这里坐一下，只照看眼前这一件事。",
  };
};

export function AppShell({ saveMessage, onExport, onImport, onReset, children }: AppShellProps) {
  const activeSection = useSyncExternalStore(subscribeToHash, readHashSection, getServerSection);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const greeting = useMemo(() => getGreeting(), []);
  const prevSaveRef = useRef(saveMessage);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subtle save toast — appears briefly when data is written
  useEffect(() => {
    if (saveMessage && saveMessage !== prevSaveRef.current) {
      prevSaveRef.current = saveMessage;
      setShowToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShowToast(false), 2200);
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [saveMessage]);

  // Cursor glow — lerp toward mouse/touch
  useEffect(() => {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.4;
    let currentX = targetX;
    let currentY = targetY;
    let rafId: number;

    const tick = () => {
      currentX += (targetX - currentX) * 0.055;
      currentY += (targetY - currentY) * 0.055;
      document.documentElement.style.setProperty("--gx", `${currentX}px`);
      document.documentElement.style.setProperty("--gy", `${currentY}px`);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        targetX = t.clientX;
        targetY = t.clientY;
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  // Hero parallax — tied to scroll position
  const { scrollY } = useScroll();
  const heroOpacity  = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale    = useTransform(scrollY, [0, 500], [1, 0.88]);
  const heroY        = useTransform(scrollY, [0, 500], [0, -80]);
  const hintOpacity  = useTransform(scrollY, [0, 180], [1, 0]);

  const selectSection = (section: SectionId) => {
    if (section === "home") {
      // Reset scroll instantly before switching — returns to 归
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    window.history.replaceState(null, "", `#${section}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight * 0.92, behavior: "smooth" });
  };

  const isHome = activeSection === "home";

  return (
    <div className="relative text-stone-100">
      {/* Cursor glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2]"
        style={{ background: "radial-gradient(circle 520px at var(--gx) var(--gy), rgba(200,173,134,0.09), transparent)" }}
      />

      {/* Ambient blobs — fixed so they persist across scroll */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80">
        <div className="absolute left-1/2 top-[6%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(210,185,152,0.16),transparent_58%)] blur-[5rem]" />
        <div className="absolute right-[-10rem] top-[12%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(109,120,162,0.14),transparent_62%)] blur-[4rem]" />
        <div className="absolute left-[-9rem] top-[55%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(122,98,136,0.13),transparent_66%)] blur-[4.5rem]" />
      </div>

      {/* Save toast — minimal, bottom-center */}
      <AnimatePresence>
        {showToast ? (
          <motion.div
            key="save-toast"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.28, ease: motionEase }}
            className="fixed bottom-[calc(1.5rem+var(--sab))] left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/8 bg-[#0e1117]/90 px-4 py-2 text-[11px] tracking-wide text-stone-600 backdrop-blur"
          >
            {saveMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isHome ? (
        /* ─── 主页：剧场滚动体验 ─── */
        <div className="relative z-10">

          {/* 序幕：归 — sticky，随滚动淡出 */}
          <div className="sticky top-0 z-0 flex h-[100dvh] flex-col items-center justify-center">
            <motion.div
              style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
              className="flex flex-col items-center"
            >
              <GuiHero onEnter={scrollToContent} />
            </motion.div>

            {/* 向下滑动提示 — pulsing dot + line */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.8, delay: 4.2 }}
              style={{ opacity: hintOpacity }}
              className="absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
            >
              <motion.div
                animate={{ opacity: [0.25, 0.6, 0.25] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="h-1 w-1 rounded-full bg-stone-600"
              />
              <div className="h-10 w-px bg-gradient-to-b from-stone-700 to-transparent" />
            </motion.div>
          </div>

          {/* 幕布上升：内容从下滚上来，覆盖序幕 */}
          <div className="relative z-10">
            {/* 渐变桥：透明 → 背景色，让内容自然浮现 */}
            <div className="pointer-events-none h-40 bg-gradient-to-b from-transparent to-[#0c1014]" />

            {/* 第一幕：时间问候 */}
            <section className="bg-[#0c1014] px-5 pb-36 sm:px-12 lg:px-20">
              <div className="mx-auto max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, y: 72, filter: "blur(10px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-22%" }}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="text-[11px] uppercase tracking-[0.45em] text-stone-600">
                    {greeting.eyebrow}
                  </p>
                  <h2
                    className="mt-7 font-medium leading-[1.1] tracking-[-0.04em] text-stone-100"
                    style={{ fontSize: "clamp(1.75rem, 4.5vw, 3.5rem)" }}
                  >
                    {greeting.title}
                  </h2>
                  <p className="mt-6 text-base leading-8 text-stone-400 sm:text-[17px] sm:leading-9">
                    {greeting.line}
                  </p>
                </motion.div>
              </div>
            </section>

            {/* 第二幕：留白（写字区） */}
            <section className="bg-[#0c1014] px-5 pb-36 sm:px-12 lg:px-20">
              <div className="mx-auto max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, y: 88, filter: "blur(8px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-16%" }}
                  transition={{ duration: 1.7, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-[2.25rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.048),rgba(255,255,255,0.028))] p-5 shadow-[0_38px_110px_-72px_rgba(0,0,0,0.86)] sm:p-8"
                >
                  {children(activeSection)}
                </motion.div>
              </div>
            </section>

            {/* 第三幕：其他房间 */}
            <section className="bg-[#0c1014] px-5 pb-[calc(5rem+var(--sab))] sm:px-12 lg:px-20">
              <div className="mx-auto max-w-3xl">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-8%" }}
                  transition={{ duration: 1.6 }}
                  className="opacity-40 transition-opacity duration-500 hover:opacity-90"
                >
                  <Navigation activeSection={activeSection} onSelect={selectSection} variant="room" />
                </motion.div>
              </div>
            </section>
          </div>

          {/* 备份按钮 — 右上角，极淡 */}
          <div className="fixed right-5 top-[calc(1.25rem+var(--sat))] z-50 sm:right-9 lg:right-12">
            <button
              type="button"
              onClick={() => setToolsOpen((v) => !v)}
              className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-xs text-stone-700 opacity-40 transition hover:border-white/12 hover:bg-white/[0.06] hover:text-stone-300 hover:opacity-100"
            >
              {toolsOpen ? "收起" : "备份"}
            </button>
          </div>

          {/* 备份面板 */}
          <AnimatePresence>
            {toolsOpen ? (
              <motion.div
                key="home-tools"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.38, ease: motionEase }}
                className="fixed right-5 top-[calc(4rem+var(--sat))] z-50 w-80 sm:right-9 lg:right-12"
              >
                <DataToolsPanel
                  saveMessage={saveMessage}
                  onExport={onExport}
                  onImport={onImport}
                  onReset={onReset}
                  onOpenGuide={() => setToolsOpen(false)}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : (
        /* ─── 房间视图 ─── */
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 pb-[calc(1.5rem+var(--sab))] pt-[calc(1.25rem+var(--sat))] sm:px-9 sm:pb-[calc(2rem+var(--sab))] sm:pt-[calc(1.75rem+var(--sat))] lg:px-12 lg:pb-[calc(3rem+var(--sab))] lg:pt-[calc(2.5rem+var(--sat))]"
        >
          <motion.header variants={slowFadeUp} className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <button
                type="button"
                onClick={() => selectSection("home")}
                className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-xs text-stone-500 transition hover:border-white/12 hover:bg-white/[0.06] hover:text-stone-300"
              >
                归
              </button>
            </div>
            <button
              type="button"
              onClick={() => setToolsOpen((value) => !value)}
              className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-xs text-stone-500 transition hover:border-white/12 hover:bg-white/[0.06] hover:text-stone-300"
            >
              {toolsOpen ? "收起" : "备份"}
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
  );
}
