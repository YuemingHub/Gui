"use client";

import { motion } from "motion/react";
import type { SectionId } from "@/app/lib/types";
import { cardLift, motionEase, staggerContainer } from "@/components/ui/motion";

const items: { id: SectionId; label: string; hint: string; mood: string; offset: string }[] = [
  { id: "truths", label: "真事", hint: "只留下真正要照看的", mood: "留一件", offset: "sm:translate-y-4" },
  { id: "clearings", label: "清场", hint: "把缠绕放远一点", mood: "放远", offset: "sm:-translate-y-2" },
  { id: "boundaries", label: "静音", hint: "今天不再接住什么", mood: "关小", offset: "sm:translate-y-6" },
  { id: "rhythm", label: "节奏", hint: "看见还能前进多少", mood: "慢一点", offset: "sm:translate-y-0" },
  { id: "garden", label: "留存", hint: "留住已经在生长的", mood: "放着", offset: "sm:-translate-y-3" },
  { id: "monthly", label: "月清", hint: "慢慢沉下来回看", mood: "沉下", offset: "sm:translate-y-3" },
];

type NavigationProps = {
  activeSection: SectionId;
  onSelect: (section: SectionId) => void;
  variant?: "home" | "room";
};

export function Navigation({ activeSection, onSelect, variant = "home" }: NavigationProps) {
  if (variant === "room") {
    return (
      <nav className="relative -mx-1 overflow-x-auto px-1 pb-1 [mask-image:linear-gradient(to_right,transparent,black_10px,black_calc(100%-10px),transparent)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex min-w-max snap-x snap-mandatory items-center gap-2.5">
          {items.map((item) => {
            const active = item.id === activeSection;

            return (
              <li key={item.id} className="snap-center">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`rounded-full border px-4 py-3 text-sm transition ${
                    active
                      ? "border-white/12 bg-white/[0.08] text-stone-100"
                      : "border-white/7 bg-white/[0.02] text-stone-500 hover:border-white/10 hover:bg-white/[0.05] hover:text-stone-300"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <motion.nav initial="hidden" animate="visible" variants={staggerContainer}>
      <div className="mb-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-stone-600">
        <span>房间</span>
        <span className="h-px flex-1 bg-white/8" />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const active = item.id === activeSection;

          return (
            <li key={item.id} className={item.offset}>
              <motion.button
                type="button"
                onClick={() => onSelect(item.id)}
                variants={cardLift}
                initial="rest"
                whileHover="hover"
                animate="rest"
                className={`group relative w-full overflow-hidden rounded-[1.95rem] border p-5 text-left backdrop-blur transition ${
                  active
                    ? "border-white/14 bg-white/[0.08] text-stone-100"
                    : "border-white/8 bg-white/[0.03] text-stone-300 hover:border-white/12"
                }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_0%,transparent_62%)] opacity-60" />
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-stone-600">进入</p>
                    <p className="mt-3 text-xl font-medium tracking-tight text-inherit">{item.label}</p>
                    <p className="mt-2 text-sm leading-7 text-stone-500 transition group-hover:text-stone-400">{item.hint}</p>
                  </div>
                  <span className="rounded-full border border-white/8 px-2.5 py-1 text-[11px] text-stone-500 transition group-hover:text-stone-300">
                    {active ? "此刻在这里" : item.mood}
                  </span>
                </div>
                <motion.div
                  initial={{ scaleX: 0, opacity: 0.45 }}
                  animate={{ scaleX: active ? 1 : 0.36, opacity: active ? 0.95 : 0.5 }}
                  transition={{ duration: 0.32, ease: motionEase }}
                  className="relative mt-6 h-px origin-left bg-gradient-to-r from-[rgba(200,173,134,0.62)] via-white/18 to-transparent"
                />
              </motion.button>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
