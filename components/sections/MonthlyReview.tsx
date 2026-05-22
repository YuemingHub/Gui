"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { MonthlyReviewItem } from "@/app/lib/types";
import { motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClassName, textareaClassName } from "@/components/ui/Field";
import { GentleNotice } from "@/components/ui/GentleNotice";
import { SectionFrame } from "@/components/ui/SectionFrame";

const createDraft = (): Omit<MonthlyReviewItem, "id"> => ({
  month: "",
  hijackedBy: "",
  notWorthContinuing: "",
  truthToSeeAgain: "",
  lessNextMonth: "",
  moreNextMonth: "",
});

type MonthlyReviewProps = {
  items: MonthlyReviewItem[];
  onChange: (items: MonthlyReviewItem[]) => void;
};

export function MonthlyReview({ items, onChange }: MonthlyReviewProps) {
  const [draft, setDraft] = useState(createDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(items.length === 0);

  const reset = () => {
    setDraft(createDraft());
    setEditingId(null);
    setError("");
    if (items.length > 0) {
      setComposerOpen(false);
    }
  };

  const save = () => {
    if (!draft.month.trim()) {
      setError("先写一个月份就好，不需要很完整。");
      return;
    }

    if (editingId) {
      onChange(items.map((item) => (item.id === editingId ? { ...item, ...draft } : item)));
    } else {
      onChange([{ id: crypto.randomUUID(), ...draft }, ...items]);
    }

    reset();
  };

  return (
    <SectionFrame
      title="月清"
      description="这不是成绩复盘。这里只问：什么劫持了你，什么不值得继续，哪件真事需要重新被看见。"
      quote="不是所有事都值得认真。"
      action={
        <button
          type="button"
          onClick={() => {
            setComposerOpen((value) => !value);
            setEditingId(null);
            setDraft(createDraft());
            setError("");
          }}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-stone-300 transition hover:border-white/20 hover:text-stone-100"
        >
          {composerOpen ? "先收起" : "写一条月清"}
        </button>
      }
    >
      <GentleNotice>只问方向，不问分数。如果这个月很乱，就只写一条最想带去下个月的提醒。</GentleNotice>

      <AnimatePresence initial={false}>
        {composerOpen ? (
          <motion.div
            key="monthly-composer"
            initial={{ opacity: 0, height: 0, y: 18 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 12 }}
            transition={{ duration: 0.45, ease: motionEase }}
            className="overflow-hidden"
          >
            <div className="space-y-5 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.028))] p-5 pb-[calc(2rem+var(--sab))] shadow-[0_34px_110px_-72px_rgba(0,0,0,0.82)] sm:p-6 sm:pb-[calc(2.25rem+var(--sab))]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-stone-100">{editingId ? "编辑月度记录" : "新增月度记录"}</h3>
                {(editingId || items.length > 0) ? (
                  <button type="button" onClick={reset} className="text-sm text-stone-500 hover:text-stone-300">
                    取消
                  </button>
                ) : null}
              </div>
              <Field label="月份" hint="先写一个月份就够了。" error={error}>
                <input
                  className={inputClassName}
                  placeholder="例如：2026-05"
                  value={draft.month}
                  onChange={(e) => {
                    setDraft({ ...draft, month: e.target.value });
                    setError("");
                  }}
                />
              </Field>
              <Field label="这个月什么东西劫持了我？">
                <textarea className={textareaClassName} value={draft.hijackedBy} onChange={(e) => setDraft({ ...draft, hijackedBy: e.target.value })} />
              </Field>
              <Field label="什么事情其实不值得继续？">
                <textarea className={textareaClassName} value={draft.notWorthContinuing} onChange={(e) => setDraft({ ...draft, notWorthContinuing: e.target.value })} />
              </Field>
              <Field label="哪一件真事需要重新被看见？">
                <textarea className={textareaClassName} value={draft.truthToSeeAgain} onChange={(e) => setDraft({ ...draft, truthToSeeAgain: e.target.value })} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="下个月我要少一点什么？">
                  <textarea className={textareaClassName} value={draft.lessNextMonth} onChange={(e) => setDraft({ ...draft, lessNextMonth: e.target.value })} />
                </Field>
                <Field label="下个月我要多一点什么？">
                  <textarea className={textareaClassName} value={draft.moreNextMonth} onChange={(e) => setDraft({ ...draft, moreNextMonth: e.target.value })} />
                </Field>
              </div>
              <button type="button" onClick={save} className="w-full rounded-full bg-stone-100 px-4 py-3 text-sm text-stone-900 hover:bg-stone-200">
                {editingId ? "保存修改" : "安静收下这月"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
        {items.length === 0 ? (
          <EmptyState title="还没有月度记录" description="等你准备好的时候，再放下第一条月度清场记录。" />
        ) : (
          items.map((item) => (
            <motion.article
              key={item.id}
              variants={slowFadeUp}
              whileHover={{ y: -4, scale: 1.005 }}
              className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] p-5 shadow-[0_28px_100px_-72px_rgba(0,0,0,0.82)] transition"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-stone-500">{item.month}</p>
                  <h3 className="mt-1 text-lg font-medium text-stone-100">这个月留下的安静记录</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setDraft({ ...item });
                      setComposerOpen(true);
                      setError("");
                    }}
                    className="rounded-full border border-white/10 px-3 py-2 text-sm text-stone-400 hover:text-stone-100"
                  >
                    编辑
                  </button>
                  <ConfirmButton onConfirm={() => onChange(items.filter((entry) => entry.id !== item.id))}>移除</ConfirmButton>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-stone-400 md:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                  <p className="text-xs text-stone-600">劫持来源</p>
                  <p className="mt-2 leading-6">{item.hijackedBy || "还没写也没关系。"}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                  <p className="text-xs text-stone-600">不值得继续</p>
                  <p className="mt-2 leading-6">{item.notWorthContinuing || "先让它停在这里。"}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                  <p className="text-xs text-stone-600">需要重新看见的真事</p>
                  <p className="mt-2 leading-6">{item.truthToSeeAgain || "也许下次会更清楚。"}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                  <p className="text-xs text-stone-600">下个月的方向</p>
                  <p className="mt-2 leading-6">
                    少一点：{item.lessNextMonth || ""}
                    <br />
                    多一点：{item.moreNextMonth || ""}
                  </p>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </motion.div>
    </SectionFrame>
  );
}
