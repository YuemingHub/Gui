"use client";

import { GentleNotice } from "@/components/ui/GentleNotice";

type WelcomePanelProps = {
  open: boolean;
  onDismiss: () => void;
  onOpen?: () => void;
};

export function WelcomePanel({ open, onDismiss, onOpen }: WelcomePanelProps) {
  if (!open) {
    return (
      <section className="mt-4 rounded-[2rem] border border-white/8 bg-white/[0.04] px-5 py-4 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.5)] backdrop-blur sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">现在从一件真事开始</p>
            <p className="mt-2 text-sm leading-7 text-stone-400">
              不需要一次写完整。先写今天真正要照看的事，再慢慢展开。
            </p>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-stone-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-stone-100"
          >
            再看一下开始说明
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-[2rem] border border-white/8 bg-white/[0.055] p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.58)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">第一次来到这里</p>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-100">先写今天真正要照看的事。</h2>
          <p className="text-sm leading-7 text-stone-400">
            如果你现在只想写一句，就只写那一句。先把今天要照看的真事留在眼前，其他内容可以稍后再补。
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/6 bg-white/[0.04] px-4 py-3 text-sm text-stone-300">
              1. 先写今天真正要照看的事
            </div>
            <div className="rounded-2xl border border-white/6 bg-white/[0.04] px-4 py-3 text-sm text-stone-300">
              2. 如果还有余力，再写最小推进
            </div>
            <div className="rounded-2xl border border-white/6 bg-white/[0.04] px-4 py-3 text-sm text-stone-300">
              3. 最后再决定今天不接什么
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-stone-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-stone-100"
        >
          我知道了
        </button>
      </div>
      <div className="mt-4">
        <GentleNotice>这里没有分数、排名、连续打卡。先写真实，再慢慢整理。</GentleNotice>
      </div>
    </section>
  );
}