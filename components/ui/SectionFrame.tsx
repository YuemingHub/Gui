"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";
import { motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";

type SectionFrameProps = {
  title: string;
  description: string;
  quote?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionFrame({ title, description, quote, action, children }: SectionFrameProps) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="relative overflow-hidden rounded-[2.25rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.028))] p-5 shadow-[0_34px_100px_-62px_rgba(0,0,0,0.76)] backdrop-blur sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,250,243,0.08),transparent_0%,transparent_56%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <motion.div
        variants={slowFadeUp}
        className="relative flex flex-col gap-5 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-3xl">
          <h2 className="text-[1.9rem] font-medium tracking-[-0.03em] text-stone-100 sm:text-[2.35rem] sm:leading-[1.08]">{title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-400 sm:text-[15px]">{description}</p>
          {quote ? (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: motionEase, delay: 0.08 }}
              className="mt-5 max-w-xl text-sm leading-7 text-stone-500"
            >
              {quote}
            </motion.p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </motion.div>
      <motion.div variants={slowFadeUp} className="relative mt-6 space-y-6">
        {children}
      </motion.div>
    </motion.section>
  );
}
