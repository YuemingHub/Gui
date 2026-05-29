"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { AppState } from "@/app/lib/types";
import { gentleFade, motionEase, staggerContainer } from "@/components/ui/motion";

const textareaClassName =
  "w-full rounded-[1.75rem] border border-white/8 bg-white/[0.045] px-5 py-4 text-base leading-8 text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition placeholder:text-stone-600 focus:border-white/16 focus:bg-white/[0.07] focus:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_0_0_4px_rgba(205,178,137,0.16)] sm:text-lg";

const getReturnPromptVisible = () => {
  const hour = new Date().getHours();
  return hour >= 17 || hour < 5;
};

type HomeSectionProps = {
  daily: AppState["daily"];
  onChange: (daily: AppState["daily"]) => void;
};

export function HomeSection({ daily, onChange }: HomeSectionProps) {
  const [showBoundary, setShowBoundary] = useState(Boolean(daily.notReceiving.trim()));
  const [showReturn, setShowReturn] = useState(Boolean(daily.didReturn.trim()) || getReturnPromptVisible());
  const [focused, setFocused] = useState(false);

  const update = (key: keyof AppState["daily"], value: string) => {
    onChange({ ...daily, [key]: value });
  };

  const response = useMemo(() => {
    if (daily.didReturn.trim()) return "已经安静留在这里了。";
    if (daily.notReceiving.trim()) return "这条边界也先放下了。";
    if (daily.trueThing.trim()) return "这件真事已经在眼前。";
    return "也可以什么都不写，只先停一下。";
  }, [daily.didReturn, daily.notReceiving, daily.trueThing]);

  const isWarm = focused || Boolean(daily.trueThing.trim());

  return (
    <motion.section initial="hidden" animate="visible" variants={staggerContainer} className="space-y-7">
      <motion.div
        initial={{ opacity: 0, y: 32, boxShadow: "0 32px 92px -66px rgba(0,0,0,0.76)" }}
        animate={{
          opacity: 1,
          y: 0,
          boxShadow: isWarm
            ? "0 46px 132px -72px rgba(194,170,132,0.28)"
            : "0 32px 92px -66px rgba(0,0,0,0.76)",
        }}
        transition={{ duration: 0.52, ease: motionEase }}
        className="overflow-hidden rounded-[2.1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.024))]"
      >
        <div className="p-4 pb-[calc(1.5rem+var(--sab))] sm:p-7 sm:pb-[calc(1.75rem+var(--sab))]">
          <div className="mb-4 flex justify-end">
            <motion.p
              key={response}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: motionEase }}
              className="text-xs leading-6 text-stone-600"
            >
              {response}
            </motion.p>
          </div>
          <textarea
            className={`${textareaClassName} min-h-44`}
            placeholder="写下今天真正需要照看的一件事。可以很短。"
            value={daily.trueThing}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => update("trueThing", event.target.value)}
          />
        </div>
      </motion.div>

      <motion.div variants={gentleFade} className="space-y-3">
        <AnimatePresence initial={false}>
          {showBoundary ? (
            <motion.div
              key="boundary"
              initial={{ opacity: 0, height: 0, y: 18 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 12 }}
              transition={{ duration: 0.42, ease: motionEase }}
              className="overflow-hidden rounded-[1.75rem] border border-white/6 bg-white/[0.024]"
            >
              <div className="p-5 sm:p-6">
                <label className="block space-y-3">
                  <span className="text-sm leading-7 text-stone-400">今天我不接什么：</span>
                  <textarea
                    className={`${textareaClassName} min-h-28 text-base`}
                    placeholder="留一句边界就够了。"
                    value={daily.notReceiving}
                    onChange={(event) => update("notReceiving", event.target.value)}
                  />
                </label>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="boundary-trigger"
              type="button"
              onClick={() => setShowBoundary(true)}
              whileHover={{ x: 4 }}
              className="flex w-full items-center justify-between rounded-[1.5rem] border border-white/6 bg-white/[0.018] px-4 py-4 text-left text-sm text-stone-500 transition hover:border-white/10 hover:text-stone-300"
            >
              <span>今天我不接什么</span>
              <span className="text-xs text-stone-600">可选</span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showReturn ? (
            <motion.div
              key="return"
              initial={{ opacity: 0, height: 0, y: 18 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 12 }}
              transition={{ duration: 0.42, ease: motionEase, delay: 0.04 }}
              className="overflow-hidden rounded-[1.75rem] border border-white/6 bg-white/[0.024]"
            >
              <div className="p-5 sm:p-6">
                <label className="block space-y-3">
                  <span className="text-sm leading-7 text-stone-400">今天，我有没有把自己收回来一点？</span>
                  <textarea
                    className={`${textareaClassName} min-h-28 text-base`}
                    placeholder="哪怕只有一点。"
                    value={daily.didReturn}
                    onChange={(event) => update("didReturn", event.target.value)}
                  />
                </label>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="return-trigger"
              type="button"
              onClick={() => setShowReturn(true)}
              whileHover={{ x: 4 }}
              className="flex w-full items-center justify-between rounded-[1.5rem] border border-white/6 bg-white/[0.018] px-4 py-4 text-left text-sm text-stone-500 transition hover:border-white/10 hover:text-stone-300"
            >
              <span>今天，我有没有把自己收回来一点？</span>
              <span className="text-xs text-stone-600">可选</span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}
