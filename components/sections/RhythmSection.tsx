"use client";

import { motion } from "motion/react";
import type { RhythmState } from "@/app/lib/types";
import { motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";
import { Field, textareaClassName } from "@/components/ui/Field";
import { GentleNotice } from "@/components/ui/GentleNotice";
import { SectionFrame } from "@/components/ui/SectionFrame";

const cards = [
  {
    key: "greenCanAdvance",
    title: "绿色",
    prompt: "我可以推进什么？",
    tone: "今天还有余力时，就把真事往前送一点。",
    style: "border-emerald-400/12 bg-emerald-400/8 text-emerald-100",
  },
  {
    key: "yellowOnlyMaintain",
    title: "黄色",
    prompt: "我只维护什么？",
    tone: "今天不求推进，只求不断线。",
    style: "border-amber-300/14 bg-amber-300/8 text-amber-100",
  },
  {
    key: "redOnlyProtect",
    title: "红色",
    prompt: "我只保护什么？",
    tone: "今天先护住睡眠、身体和最基本的秩序。",
    style: "border-rose-300/14 bg-rose-300/8 text-rose-100",
  },
] as const;

type RhythmSectionProps = {
  rhythm: RhythmState;
  onChange: (rhythm: RhythmState) => void;
};

export function RhythmSection({ rhythm, onChange }: RhythmSectionProps) {
  const update = (key: keyof RhythmState, value: string) => {
    onChange({ ...rhythm, [key]: value });
  };

  return (
    <SectionFrame
      title="节奏"
      description="这不是打分系统，只是帮助你先认出今天的状态，再决定推进、维护或保护。"
      quote="先按状态安排，不按焦虑安排。"
    >
      <GentleNotice>如果今天状态分不清，就先按偏低处理。先把自己放回可持续的位置，比勉强推进更重要。</GentleNotice>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <motion.div
            key={card.key}
            variants={slowFadeUp}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.32, ease: motionEase }}
            className={`rounded-[1.9rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.018))] p-5 shadow-[0_28px_100px_-72px_rgba(0,0,0,0.82)] transition ${card.style}`}
          >
            <p className="text-xs uppercase tracking-[0.25em] opacity-70">{card.title}</p>
            <h3 className="mt-3 text-lg font-medium">{card.prompt}</h3>
            <p className="mt-2 text-sm leading-7 opacity-80">{card.tone}</p>
            <div className="mt-4">
              <Field label={card.prompt}>
                <textarea
                  className={`${textareaClassName} min-h-32 border-white/10 bg-black/10 text-current placeholder:text-current/35 focus:border-white/20 focus:bg-black/15`}
                  value={rhythm[card.key]}
                  onChange={(e) => update(card.key, e.target.value)}
                />
              </Field>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <GentleNotice>红色状态下：不做重大人生判断，不复盘人生意义，不拿自己和别人比较。先保护睡眠、饮食、身体和基本秩序，真事只保留最低维护。</GentleNotice>
    </SectionFrame>
  );
}
