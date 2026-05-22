"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { AppState } from "@/app/lib/types";
import { gentleFade, motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";

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
  const [focused, setFocused] = useState(Boolean(daily.trueThing.trim()));

  const update = (key: keyof AppState["daily"], value: string) => {
    onChange({ ...daily, [key]: value });
  };

  const response = useMemo(() => {
    if (daily.didReturn.trim()) return "已经替你轻轻记下了。";
    if (daily.notReceiving.trim()) return "边界也先放在这里了。";
    if (daily.trueThing.trim()) return "这一件事，已经留在眼前。";
    return "你也可以什么都不写，只先在这里停一下。";
  }, [daily.didReturn, daily.notReceiving, daily.trueThing]);

  const entryOpen = focused || Boolean(daily.trueThing.trim());

  return (
    <motion.section initial="hidden" animate="visible" variants={staggerContainer} className="space-y-7">
      <motion.div variants={slowFadeUp} className="space-y-4">
        <p className="max-w-2xl text-sm leading-7 text-stone-400">先别急着填写。先靠近，然后只留下一件今天真正要照看的事。</p>
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-stone-600">
          <span>落笔</span>
          <span className="h-px flex-1 bg-white/8" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 32, boxShadow: "0 32px 92px -66px rgba(0,0,0,0.76)" }}
        animate={{
          opacity: 1,
          y: 0,
          boxShadow: entryOpen
            ? "0 46px 132px -72px rgba(194,170,132,0.28)"
            : "0 32px 92px -66px rgba(0,0,0,0.76)",
        }}
        transition={{ duration: 0.52, ease: motionEase }}
        className="overflow-hidden rounded-[2.1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.024))]"
      >
        <div className="p-4 pb-[calc(1.5rem+var(--sab))] sm:p-7 sm:pb-[calc(1.75rem+var(--sab))]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <p className="text-sm leading-7 text-stone-300">今天，我只照看这一件事。</p>
              <p className="mt-2 text-sm leading-7 text-stone-500">写一个名字也可以，写一句也可以。</p>
            </div>
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

          <button
            type="button"
            onClick={() => setFocused(true)}
            className={`mt-6 flex w-full items-center gap-4 rounded-[1.75rem] border px-4 py-4 text-left transition sm:px-5 ${
              entryOpen
                ? "border-white/10 bg-white/[0.045]"
                : "border-white/7 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.035]"
            }`}
          >
            <span className="text-xs uppercase tracking-[0.3em] text-stone-600">落笔面</span>
            <span className="h-px flex-1 bg-white/8" />
            <span className="text-xs text-stone-500">{entryOpen ? "正在靠近" : "轻点展开"}</span>
          </button>

          <AnimatePresence initial={false}>
            {entryOpen ? (
              <motion.div
                key="true-thing"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 18 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.42, ease: motionEase }}
              >
                <label className="block space-y-4">
                  <textarea
                    className={`${textareaClassName} min-h-44`}
                    placeholder="写一个名字也可以。"
                    value={daily.trueThing}
                    onFocus={() => setFocused(true)}
                    onChange={(event) => update("trueThing", event.target.value)}
                  />
                </label>
              </motion.div>
            ) : null}
          </AnimatePresence>
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
