"use client";

import { ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block space-y-3">
      <div className="space-y-1.5">
        <span className="text-sm font-medium tracking-[0.01em] text-stone-200">{label}</span>
        {hint ? <p className="text-xs leading-6 text-stone-500">{hint}</p> : null}
      </div>
      {children}
      {error ? <p className="text-xs leading-6 text-rose-300">{error}</p> : null}
    </label>
  );
}

export const inputClassName =
  "w-full rounded-[1.4rem] border border-white/8 bg-white/[0.045] px-4 py-3 text-sm leading-7 text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none transition placeholder:text-stone-500 focus:border-white/16 focus:bg-white/[0.07] focus:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_0_4px_rgba(205,178,137,0.16)]";

export const textareaClassName = `${inputClassName} min-h-28 resize-y`;

export const selectClassName = `${inputClassName} pr-10`;
