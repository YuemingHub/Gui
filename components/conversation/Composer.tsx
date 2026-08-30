"use client";

import { useEffect, useRef, useState } from "react";

type ComposerProps = {
  disabled: boolean;
  onSend: (text: string) => void;
};

const MAX_HEIGHT_PX = 135;

export function Composer({ disabled, onSend }: ComposerProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const autosize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT_PX) + "px";
  };

  useEffect(() => {
    autosize();
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    onSend(text);
  };

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={inputRef}
        value={value}
        rows={1}
        placeholder="说点什么"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-[135px] min-h-[46px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] leading-6 text-stone-100 placeholder:text-stone-600 focus:border-white/20"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="发送"
        className="mb-0.5 flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-[rgba(200,173,134,0.16)] text-stone-100 transition hover:bg-[rgba(200,173,134,0.24)] disabled:opacity-35"
      >
        ↑
      </button>
    </div>
  );
}
