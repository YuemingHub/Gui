"use client";

import { useId, useRef } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

type DataToolsPanelProps = {
  saveMessage: string;
  onExport: () => void;
  onImport: (file: File) => Promise<{ ok: boolean; message: string }>;
  onReset: () => void;
  onOpenGuide: () => void;
};

export function DataToolsPanel({
  saveMessage,
  onExport,
  onImport,
  onReset,
  onOpenGuide,
}: DataToolsPanelProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-4 shadow-[0_30px_90px_-60px_rgba(0,0,0,0.7)] backdrop-blur sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-stone-600">本地优先</p>
          <h2 className="text-lg font-medium tracking-tight text-stone-200">你的内容只留在这台浏览器里。</h2>
          <p className="max-w-xl text-sm leading-7 text-stone-400">
            这里没有账号、没有云端同步。想长期保留时，就导出一份备份；想回来时，再把它带回来。
          </p>
          <p className="text-sm text-stone-500">{saveMessage}</p>
        </div>

        <div className="grid gap-2 rounded-[1.5rem] border border-white/6 bg-black/10 p-3">
          <button
            type="button"
            onClick={onExport}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-stone-100"
          >
            导出备份
          </button>

          <div>
            <label
              htmlFor={inputId}
              className="flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-stone-100"
            >
              导入备份
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                await onImport(file);
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
              }}
            />
          </div>

          <button
            type="button"
            onClick={onOpenGuide}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-stone-100"
          >
            回到客厅
          </button>

          <ConfirmButton
            onConfirm={onReset}
            message="确定回到初始状态吗？当前内容会从这个浏览器里清空。若想保留，请先导出备份。"
            className="rounded-full border border-white/8 bg-transparent px-4 py-3 text-sm text-stone-500 transition hover:border-white/15 hover:text-stone-300"
          >
            重置全部内容
          </ConfirmButton>
        </div>
      </div>
    </section>
  );
}
