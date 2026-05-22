"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { ClearingHandling, ClearingItem, ClearingType } from "@/app/lib/types";
import { CLEARING_HANDLINGS, CLEARING_TYPES } from "@/app/lib/defaults";
import { motionEase, slowFadeUp, staggerContainer } from "@/components/ui/motion";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClassName, selectClassName, textareaClassName } from "@/components/ui/Field";
import { GentleNotice } from "@/components/ui/GentleNotice";
import { SectionFrame } from "@/components/ui/SectionFrame";

const createDraft = (): Omit<ClearingItem, "id"> => ({
  name: "",
  type: "杂事",
  givesMe: "",
  takesFromMe: "",
  handling: "限制",
  note: "",
});

type ClearingRoomProps = {
  clearings: ClearingItem[];
  onChange: (items: ClearingItem[]) => void;
};

export function ClearingRoom({ clearings, onChange }: ClearingRoomProps) {
  const [draft, setDraft] = useState(createDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(clearings.length === 0);

  const reset = () => {
    setDraft(createDraft());
    setEditingId(null);
    setError("");
    if (clearings.length > 0) {
      setComposerOpen(false);
    }
  };

  const save = () => {
    if (!draft.name.trim()) {
      setError("先写一个名字就好，不需要很完整。");
      return;
    }

    if (editingId) {
      onChange(clearings.map((item) => (item.id === editingId ? { ...item, ...draft } : item)));
    } else {
      onChange([{ id: crypto.randomUUID(), ...draft }, ...clearings]);
    }

    reset();
  };

  return (
    <SectionFrame
      title="清场"
      description="把占用你的人和事分清楚。先看已经摆在桌上的，再决定要不要添新的。"
      quote="把生命力从假事和废事里撤回来。"
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
          {composerOpen ? "先收起" : "添一件占用"}
        </button>
      }
    >
      <GentleNotice>如果一时分不清它是真是假，先记录 1 件最占用你的事，慢慢看它给了你什么、拿走了什么。</GentleNotice>

      <AnimatePresence initial={false}>
        {composerOpen ? (
          <motion.div
            key="clearing-composer"
            initial={{ opacity: 0, height: 0, y: 18 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 12 }}
            transition={{ duration: 0.45, ease: motionEase }}
            className="overflow-hidden"
          >
            <div className="space-y-5 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.028))] p-5 pb-[calc(2rem+var(--sab))] shadow-[0_34px_110px_-72px_rgba(0,0,0,0.82)] sm:p-6 sm:pb-[calc(2.25rem+var(--sab))]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-stone-100">{editingId ? "编辑记录" : "新增记录"}</h3>
                {(editingId || clearings.length > 0) ? (
                  <button type="button" onClick={reset} className="text-sm text-stone-500 hover:text-stone-300">
                    取消
                  </button>
                ) : null}
              </div>
              <Field label="名称" hint="先写那个最占用你的名字。" error={error}>
                <input
                  className={inputClassName}
                  value={draft.name}
                  onChange={(e) => {
                    setDraft({ ...draft, name: e.target.value });
                    setError("");
                  }}
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="类型">
                  <select
                    className={selectClassName}
                    value={draft.type}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as ClearingType })}
                  >
                    {CLEARING_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="处理方式">
                  <select
                    className={selectClassName}
                    value={draft.handling}
                    onChange={(e) => setDraft({ ...draft, handling: e.target.value as ClearingHandling })}
                  >
                    {CLEARING_HANDLINGS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="它给了我什么">
                <textarea className={textareaClassName} value={draft.givesMe} onChange={(e) => setDraft({ ...draft, givesMe: e.target.value })} />
              </Field>
              <Field label="它拿走了我什么">
                <textarea className={textareaClassName} value={draft.takesFromMe} onChange={(e) => setDraft({ ...draft, takesFromMe: e.target.value })} />
              </Field>
              <Field label="备注">
                <textarea className={textareaClassName} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </Field>
              <button type="button" onClick={save} className="w-full rounded-full bg-stone-100 px-4 py-3 text-sm text-stone-900 hover:bg-stone-200">
                {editingId ? "保存修改" : "放进清场室"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
        {clearings.length === 0 ? (
          <EmptyState title="清场室还是空的" description="先记录一件正在占用你的事，慢慢分辨它到底是真事、假事、杂事，还是废事。" />
        ) : (
          clearings.map((item) => (
            <motion.article
              key={item.id}
              variants={slowFadeUp}
              whileHover={{ y: -4, scale: 1.005 }}
              className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] p-5 shadow-[0_28px_100px_-72px_rgba(0,0,0,0.82)] transition"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <h3 className="text-lg font-medium text-stone-100">{item.name}</h3>
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-stone-300">{item.type}</span>
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-stone-300">{item.handling}</span>
                  </div>
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
                  <ConfirmButton onConfirm={() => onChange(clearings.filter((entry) => entry.id !== item.id))}>移除</ConfirmButton>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4 text-sm text-stone-400">
                  <p className="text-xs text-stone-600">它给了我什么</p>
                  <p className="mt-2 leading-6">{item.givesMe || "还没写也没关系。"}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/7 bg-black/10 p-4 text-sm text-stone-400">
                  <p className="text-xs text-stone-600">它拿走了我什么</p>
                  <p className="mt-2 leading-6">{item.takesFromMe || "先把感受留出来。"}</p>
                </div>
              </div>
              {item.note ? <p className="mt-4 text-sm leading-7 text-stone-500">{item.note}</p> : null}
            </motion.article>
          ))
        )}
      </motion.div>
    </SectionFrame>
  );
}
