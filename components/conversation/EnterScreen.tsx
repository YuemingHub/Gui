"use client";

import { useState, type FormEvent } from "react";

type EnterScreenProps = {
  onEnter: (code: string) => Promise<{ ok: boolean; error: string | null }>;
};

export function EnterScreen({ onEnter }: EnterScreenProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const r = await onEnter(trimmed);
    setBusy(false);
    if (!r.ok) {
      setError(r.error || "进入失败了。");
    }
  };

  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.42em] text-stone-600">我和自己</p>
        <h1
          className="mt-6 font-medium leading-[1.1] tracking-[-0.03em] text-stone-100"
          style={{ fontSize: "clamp(1.75rem, 6vw, 2.5rem)" }}
        >
          先停一下，
          <br />
          从哪里说起。
        </h1>
        <p className="mt-5 text-sm leading-7 text-stone-500">
          这里只放你自己的事。邀请码用一次，绑定你这个浏览器；清掉存储就锁住，需要重新发码。
        </p>

        <form onSubmit={submit} className="mt-10 flex flex-col gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="邀请码"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={busy}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-base text-stone-100 placeholder:text-stone-600 focus:border-white/20"
          />
          {error ? (
            <p className="text-sm leading-6 text-amber-300/80">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="mt-1 rounded-full border border-white/10 bg-[rgba(200,173,134,0.16)] px-5 py-3 text-sm text-stone-100 transition hover:bg-[rgba(200,173,134,0.24)] disabled:opacity-40"
          >
            {busy ? "正在进入…" : "进入"}
          </button>
        </form>
      </div>
    </div>
  );
}
