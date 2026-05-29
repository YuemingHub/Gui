"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { TruthItem, TruthStage } from "@/app/lib/types";
import { TRUTH_STAGES } from "@/app/lib/defaults";
import { motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClassName, selectClassName, textareaClassName } from "@/components/ui/Field";
import { GentleNotice } from "@/components/ui/GentleNotice";
import { SectionFrame } from "@/components/ui/SectionFrame";

const stageLabels: Record<TruthStage, string> = {
  seed: "种子",
  cultivate: "培育",
  advance: "推进",
  pause: "暂停",
  done: "完成",
};

const createDraft = (): Omit<TruthItem, "id"> => ({
  name: "",
  whyImportant: "",
  stage: "seed",
  enoughDefinition: "",
  weeklySmallStep: "",
  lowPointMaintenance: "",
  active: true,
});

type TruthWorkshopProps = {
  truths: TruthItem[];
  onChange: (truths: TruthItem[]) => void;
};

export function TruthWorkshop({ truths, onChange }: TruthWorkshopProps) {
  const [draft, setDraft] = useState(createDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(truths.length === 0);

  const activeCount = useMemo(() => truths.filter((item) => item.active).length, [truths]);

  const reset = () => {
    setDraft(createDraft());
    setEditingId(null);
    setError("");
    if (truths.length > 0) {
      setComposerOpen(false);
    }
  };

  const save = () => {
    if (!draft.name.trim()) {
      setError("先写一个名字就好，不需要很完整。");
      return;
    }

    const currentIsActive = editingId
      ? truths.find((item) => item.id === editingId)?.active ?? false
      : false;
    const nextActiveCount = draft.active
      ? activeCount + (currentIsActive ? 0 : 1)
      : activeCount - (currentIsActive ? 1 : 0);

    if (nextActiveCount > 3) {
      setError("真事太多会重新变成劫持。先让其中一件暂停，也是一种保护。");
      return;
    }

    if (editingId) {
      onChange(truths.map((item) => (item.id === editingId ? { ...item, ...draft } : item)));
    } else {
      onChange([{ id: crypto.randomUUID(), ...draft }, ...truths]);
    }

    reset();
  };

  return (
    <SectionFrame
      title="真事"
      description="只照看 1–3 件真正重要的事。先看清已经留下来的，再决定要不要添新的。"
      quote="少一点，反而更能照看。"
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
          {composerOpen ? "先收起" : "添一件真事"}
        </button>
      }
    >
      <GentleNotice>如果你是第一次来，先留 1 件真事就够了。名字先写出来，其他内容都可以慢慢补。</GentleNotice>

      <AnimatePresence initial={false}>
        {composerOpen ? (
          <motion.div
            key="truth-composer"
            initial={{ opacity: 0, height: 0, y: 18 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 12 }}
            transition={{ duration: 0.45, ease: motionEase }}
            className="overflow-hidden"
          >
            <div className="space-y-5 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.028))] p-5 pb-[calc(2rem+var(--sab))] shadow-[0_34px_110px_-72px_rgba(0,0,0,0.82)] sm:p-6 sm:pb-[calc(2.25rem+var(--sab))]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-stone-100">{editingId ? "编辑真事" : "新增真事"}</h3>
                {(editingId || truths.length > 0) ? (
                  <button type="button" onClick={reset} className="text-sm text-stone-500 hover:text-stone-300">
                    取消
                  </button>
                ) : null}
              </div>
              <Field label="名称" hint="先写一个名字就够了。" error={error}>
                <input
                  className={inputClassName}
                  value={draft.name}
                  placeholder="先写一个名字就好。"
                  onChange={(e) => {
                    setDraft({ ...draft, name: e.target.value });
                    setError("");
                  }}
                />
              </Field>
              <Field label="为什么重要">
                <textarea
                  className={textareaClassName}
                  value={draft.whyImportant}
                  onChange={(e) => setDraft({ ...draft, whyImportant: e.target.value })}
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="当前阶段">
                  <select
                    className={selectClassName}
                    value={draft.stage}
                    onChange={(e) => setDraft({ ...draft, stage: e.target.value as TruthStage })}
                  >
                    {TRUTH_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stageLabels[stage]}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                    className="size-4 rounded border-stone-300"
                  />
                  设为活跃真事
                </label>
              </div>
              <Field label="做到什么程度算够">
                <textarea
                  className={textareaClassName}
                  value={draft.enoughDefinition}
                  onChange={(e) => setDraft({ ...draft, enoughDefinition: e.target.value })}
                />
              </Field>
              <Field label="本周最小推进">
                <textarea
                  className={textareaClassName}
                  value={draft.weeklySmallStep}
                  onChange={(e) => setDraft({ ...draft, weeklySmallStep: e.target.value })}
                />
              </Field>
              <Field label="低谷时最低维护动作">
                <textarea
                  className={textareaClassName}
                  value={draft.lowPointMaintenance}
                  onChange={(e) => setDraft({ ...draft, lowPointMaintenance: e.target.value })}
                />
              </Field>
              <button
                type="button"
                onClick={save}
                className="w-full rounded-full bg-stone-100 px-4 py-3 text-sm text-stone-900 transition hover:bg-stone-200"
              >
                {editingId ? "保存修改" : "加入真事"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
        {truths.length === 0 ? (
          <EmptyState title="还没有真事" description="先写下 1 件真正重要的事就够了。少一点，反而更能照看。" />
        ) : (
          truths.map((item) => (
            <motion.article
              key={item.id}
              variants={slowFadeUp}
              whileHover={{ y: -4, scale: 1.005 }}
              className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] p-5 shadow-[0_28px_100px_-72px_rgba(0,0,0,0.82)] transition"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-medium text-stone-100">{item.name || "未命名真事"}</h3>
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-stone-300">{stageLabels[item.stage]}</span>
                    <span className={`rounded-full px-3 py-1 text-xs ${item.active ? "bg-emerald-400/15 text-emerald-200" : "bg-white/[0.05] text-stone-500"}`}>
                      {item.active ? "活跃" : "暂停照看"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-stone-400">{item.whyImportant || "还没有写原因，但它已经被你留了下来。"}</p>
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
                  <ConfirmButton onConfirm={() => onChange(truths.filter((truth) => truth.id !== item.id))}>移除</ConfirmButton>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-stone-400 sm:grid-cols-3">
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                  <p className="text-xs text-stone-600">算够的样子</p>
                  <p className="mt-2 leading-6">{item.enoughDefinition || "先写下一个可接受的边界。"}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                  <p className="text-xs text-stone-600">本周最小推进</p>
                  <p className="mt-2 leading-6">{item.weeklySmallStep || "还没写也没关系。"}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4">
                  <p className="text-xs text-stone-600">低谷时维护</p>
                  <p className="mt-2 leading-6">{item.lowPointMaintenance || "给它留一个最小维护动作。"}</p>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </motion.div>
    </SectionFrame>
  );
}
