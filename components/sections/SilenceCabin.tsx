"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { BoundaryCategory, BoundaryItem } from "@/app/lib/types";
import { BOUNDARY_CATEGORIES } from "@/app/lib/defaults";
import { motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, selectClassName, textareaClassName } from "@/components/ui/Field";
import { GentleNotice } from "@/components/ui/GentleNotice";
import { SectionFrame } from "@/components/ui/SectionFrame";

const createDraft = (): Omit<BoundaryItem, "id"> => ({
  category: "信息边界",
  content: "",
  trigger: "",
  response: "",
  enabled: true,
});

type SilenceCabinProps = {
  boundaries: BoundaryItem[];
  onChange: (items: BoundaryItem[]) => void;
};

export function SilenceCabin({ boundaries, onChange }: SilenceCabinProps) {
  const [draft, setDraft] = useState(createDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(boundaries.length === 0);

  const reset = () => {
    setDraft(createDraft());
    setEditingId(null);
    setError("");
    if (boundaries.length > 0) {
      setComposerOpen(false);
    }
  };

  const save = () => {
    if (!draft.content.trim()) {
      setError("先写一个名字就好，不需要很完整。");
      return;
    }

    if (editingId) {
      onChange(boundaries.map((item) => (item.id === editingId ? { ...item, ...draft } : item)));
    } else {
      onChange([{ id: crypto.randomUUID(), ...draft }, ...boundaries]);
    }

    reset();
  };

  const toggleEnabled = (id: string) => onChange(boundaries.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));

  return (
    <SectionFrame
      title="静音"
      description="边界不是对抗，而是把主权拿回自己手里。先看墙上已有的句子，再决定要不要多留一句。"
      quote="不要把别人的紧急，自动变成你的紧急。"
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
          {composerOpen ? "先收起" : "留一句边界"}
        </button>
      }
    >
      <GentleNotice>如果你不知道边界该怎么写，就先写一句最简单的：我不默认立刻回应，我可以晚一点再处理。</GentleNotice>

      <AnimatePresence initial={false}>
        {composerOpen ? (
          <motion.div
            key="boundary-composer"
            initial={{ opacity: 0, height: 0, y: 18 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 12 }}
            transition={{ duration: 0.45, ease: motionEase }}
            className="overflow-hidden"
          >
            <div className="space-y-5 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.028))] p-5 pb-[calc(2rem+var(--sab))] shadow-[0_34px_110px_-72px_rgba(0,0,0,0.82)] sm:p-6 sm:pb-[calc(2.25rem+var(--sab))]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-stone-100">{editingId ? "编辑边界" : "新增边界"}</h3>
                {(editingId || boundaries.length > 0) ? (
                  <button type="button" onClick={reset} className="text-sm text-stone-500 hover:text-stone-300">
                    取消
                  </button>
                ) : null}
              </div>
              <Field label="边界分类">
                <select
                  className={selectClassName}
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as BoundaryCategory })}
                >
                  {BOUNDARY_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="边界内容" hint="先写一句你想守住的回应方式。" error={error}>
                <textarea
                  className={textareaClassName}
                  value={draft.content}
                  placeholder="比如：我不默认秒回。"
                  onChange={(e) => {
                    setDraft({ ...draft, content: e.target.value });
                    setError("");
                  }}
                />
              </Field>
              <Field label="触发场景">
                <textarea className={textareaClassName} value={draft.trigger} onChange={(e) => setDraft({ ...draft, trigger: e.target.value })} />
              </Field>
              <Field label="我的回应方式">
                <textarea className={textareaClassName} value={draft.response} onChange={(e) => setDraft({ ...draft, response: e.target.value })} />
              </Field>
              <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="size-4" />
                默认启用这条边界
              </label>
              <button type="button" onClick={save} className="w-full rounded-full bg-stone-100 px-4 py-3 text-sm text-stone-900 hover:bg-stone-200">
                {editingId ? "保存修改" : "加入静音舱"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
        {boundaries.length === 0 ? (
          <EmptyState title="还没有边界" description="先留下一条最需要保护你的边界。哪怕只有一句，也能帮你少被带走。" />
        ) : (
          boundaries.map((item) => (
            <motion.article
              key={item.id}
              variants={slowFadeUp}
              whileHover={{ y: -4, scale: 1.005 }}
              className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] p-5 shadow-[0_28px_100px_-72px_rgba(0,0,0,0.82)] transition"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-stone-300">{item.category}</span>
                    <span className={`rounded-full px-3 py-1 text-xs ${item.enabled ? "bg-emerald-400/15 text-emerald-200" : "bg-white/[0.05] text-stone-500"}`}>
                      {item.enabled ? "启用中" : "暂时停用"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-stone-100">{item.content}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => toggleEnabled(item.id)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-stone-400 hover:text-stone-100">
                    {item.enabled ? "停用" : "启用"}
                  </button>
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
                  <ConfirmButton onConfirm={() => onChange(boundaries.filter((entry) => entry.id !== item.id))}>移除</ConfirmButton>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-stone-400 md:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                  <p className="text-xs text-stone-600">触发场景</p>
                  <p className="mt-2 leading-6">{item.trigger || "等你下次遇到时，再慢慢补上。"}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                  <p className="text-xs text-stone-600">我的回应方式</p>
                  <p className="mt-2 leading-6">{item.response || "先给自己一个慢半拍的空间。"}</p>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </motion.div>
    </SectionFrame>
  );
}
