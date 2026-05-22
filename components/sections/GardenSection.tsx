"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { GardenItem, GardenStatus, TruthItem } from "@/app/lib/types";
import { GARDEN_STATUSES } from "@/app/lib/defaults";
import { motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClassName, selectClassName, textareaClassName } from "@/components/ui/Field";
import { GentleNotice } from "@/components/ui/GentleNotice";
import { SectionFrame } from "@/components/ui/SectionFrame";

const createDraft = (): Omit<GardenItem, "id"> => ({
  title: "",
  status: "Seed",
  description: "",
  nextStep: "",
  linkedTruthId: "",
});

type GardenSectionProps = {
  items: GardenItem[];
  truths: TruthItem[];
  onChange: (items: GardenItem[]) => void;
};

export function GardenSection({ items, truths, onChange }: GardenSectionProps) {
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
    if (!draft.title.trim()) {
      setError("先写一个名字就好，不需要很完整。");
      return;
    }

    const payload = {
      ...draft,
      ...(draft.linkedTruthId ? { linkedTruthId: draft.linkedTruthId } : {}),
    };

    if (editingId) {
      onChange(items.map((item) => (item.id === editingId ? { ...item, ...payload } : item)));
    } else {
      onChange([{ id: crypto.randomUUID(), ...payload }, ...items]);
    }

    reset();
  };

  return (
    <SectionFrame
      title="花园"
      description="把想法、草稿和未完成项目留在一个不会催促你的地方。先看它们，再决定要不要添新的。"
      quote="暂停不是失败，只是暂时不让它继续占用你。"
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
          {composerOpen ? "先收起" : "放一颗种子"}
        </button>
      }
    >
      <GentleNotice>如果你是第一次来这里，先放 1 个还没成熟的想法就够了。它不需要现在就变成果，也不需要现在就证明价值。</GentleNotice>

      <AnimatePresence initial={false}>
        {composerOpen ? (
          <motion.div
            key="garden-composer"
            initial={{ opacity: 0, height: 0, y: 18 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 12 }}
            transition={{ duration: 0.45, ease: motionEase }}
            className="overflow-hidden"
          >
            <div className="space-y-5 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.028))] p-5 pb-[calc(2rem+var(--sab))] shadow-[0_34px_110px_-72px_rgba(0,0,0,0.82)] sm:p-6 sm:pb-[calc(2.25rem+var(--sab))]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-stone-100">{editingId ? "编辑半成品" : "新增半成品"}</h3>
                {(editingId || items.length > 0) ? (
                  <button type="button" onClick={reset} className="text-sm text-stone-500 hover:text-stone-300">
                    取消
                  </button>
                ) : null}
              </div>
              <Field label="标题" hint="先给这个想法留一个名字。" error={error}>
                <input
                  className={inputClassName}
                  value={draft.title}
                  onChange={(e) => {
                    setDraft({ ...draft, title: e.target.value });
                    setError("");
                  }}
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="状态">
                  <select
                    className={selectClassName}
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as GardenStatus })}
                  >
                    {GARDEN_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="关联真事（可选）">
                  <select className={selectClassName} value={draft.linkedTruthId} onChange={(e) => setDraft({ ...draft, linkedTruthId: e.target.value })}>
                    <option value="">暂不关联</option>
                    {truths.map((truth) => (
                      <option key={truth.id} value={truth.id}>
                        {truth.name || "未命名真事"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="简短描述">
                <textarea className={textareaClassName} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </Field>
              <Field label="下一步">
                <textarea className={textareaClassName} value={draft.nextStep} onChange={(e) => setDraft({ ...draft, nextStep: e.target.value })} />
              </Field>
              <button type="button" onClick={save} className="w-full rounded-full bg-stone-100 px-4 py-3 text-sm text-stone-900 hover:bg-stone-200">
                {editingId ? "保存修改" : "放进花园"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
        {items.length === 0 ? (
          <EmptyState title="花园还是空的" description="把还没成熟的想法放在这里，不急着证明它，也不急着丢掉它。" />
        ) : (
          items.map((item) => {
            const linkedTruth = truths.find((truth) => truth.id === item.linkedTruthId);
            return (
              <motion.article
                key={item.id}
                variants={slowFadeUp}
                whileHover={{ y: -4, scale: 1.005 }}
                className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] p-5 shadow-[0_28px_100px_-72px_rgba(0,0,0,0.82)] transition"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <h3 className="text-lg font-medium text-stone-100">{item.title}</h3>
                      <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-stone-300">{item.status}</span>
                    </div>
                    {linkedTruth ? <p className="mt-2 text-sm text-stone-500">关联真事：{linkedTruth.name}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setDraft({ ...item, linkedTruthId: item.linkedTruthId ?? "" });
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
                    <p className="text-xs text-stone-600">简短描述</p>
                    <p className="mt-2 leading-6">{item.description || "先留一个轮廓就够了。"}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                    <p className="text-xs text-stone-600">下一步</p>
                    <p className="mt-2 leading-6">{item.nextStep || "等你下一次经过这里，再决定也来得及。"}</p>
                  </div>
                </div>
              </motion.article>
            );
          })
        )}
      </motion.div>
    </SectionFrame>
  );
}
