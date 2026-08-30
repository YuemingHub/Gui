"use client";

import type { SessionItem } from "@/app/lib/returnApi";

type DrawerProps = {
  open: boolean;
  sessions: SessionItem[];
  loading: boolean;
  currentSessionId: string | null;
  viewingOld: string | null;
  onClose: () => void;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onOpenAbout: () => void;
  onGoLocal: () => void;
};

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function sessionLabel(startedAt: string): string {
  const d = new Date(startedAt);
  if (isNaN(d.getTime())) return "";
  const hm = pad(d.getHours()) + ":" + pad(d.getMinutes());
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOfDay - thatDay) / 86400000);
  if (diff <= 0) return "今天 " + hm;
  if (diff === 1) return "昨天 " + hm;
  return d.getMonth() + 1 + "月" + d.getDate() + "日";
}

export function Drawer({
  open,
  sessions,
  loading,
  currentSessionId,
  viewingOld,
  onClose,
  onSelectSession,
  onNewSession,
  onOpenAbout,
  onGoLocal,
}: DrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute bottom-0 left-0 top-0 flex w-[min(20rem,84vw)] flex-col border-r border-white/10 bg-[#0c1014]">
        <div className="flex items-center justify-between px-5 pt-[calc(1.25rem+var(--sat))]">
          <p className="text-[11px] uppercase tracking-[0.36em] text-stone-600">对话</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-xs text-stone-500 transition hover:text-stone-300"
          >
            收起
          </button>
        </div>

        <div className="px-5 pt-4">
          <button
            type="button"
            onClick={onNewSession}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-stone-200 transition hover:border-white/16 hover:bg-white/[0.06]"
          >
            新的一段
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <p className="px-2 py-3 text-sm text-stone-600">载入中…</p>
          ) : sessions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-stone-600">还没有对话。</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sessions.map((s) => {
                const active = !viewingOld && s.id === currentSessionId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onSelectSession(s.id)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                        active ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="block text-[11px] tracking-wide text-stone-600">
                        {sessionLabel(s.started_at)}
                        {s.active ? " · 进行中" : ""}
                      </span>
                      <span
                        className={`mt-1 block truncate text-sm leading-6 ${
                          s.preview ? "text-stone-300" : "text-stone-600"
                        }`}
                      >
                        {s.preview || "新的一段"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/8 px-5 pb-[calc(1.5rem+var(--sab))] pt-4">
          <button
            type="button"
            onClick={onOpenAbout}
            className="w-full rounded-xl px-2 py-2 text-left text-sm text-stone-500 transition hover:text-stone-300"
          >
            关于这里
          </button>
          <button
            type="button"
            onClick={onGoLocal}
            className="mt-1 w-full rounded-xl px-2 py-2 text-left text-sm text-stone-600 transition hover:text-stone-400"
          >
            本地工具（旧版草稿区）
          </button>
        </div>
      </aside>
    </div>
  );
}
