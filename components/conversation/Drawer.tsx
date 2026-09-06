"use client";

import { useModalDialog } from "@/app/hooks/useModalDialog";
import type { ActionError } from "@/app/lib/actionTruth";
import type { SessionItem } from "@/app/lib/returnApi";

type DrawerProps = {
  open: boolean;
  sessions: SessionItem[];
  loading: boolean;
  currentSessionId: string | null;
  viewingOld: string | null;
  /** The listing failure belongs here, next to the list it failed to fill. */
  actionError: ActionError | null;
  onRetryActionError: () => void;
  onClose: () => void;
  onSelectSession: (id: string) => void;
  newDisabled?: boolean;
  onNewSession: () => void;
  onOpenAbout: () => void;
  onLogout: () => void;
  /**
   * The legacy local draft surface. It has no slot in the formal space unless a
   * caller passes it in: two kinds of "your space" is one too many to explain.
   */
  onGoLocal?: () => void;
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
  actionError,
  onRetryActionError,
  onClose,
  onSelectSession,
  newDisabled,
  onNewSession,
  onOpenAbout,
  onLogout,
  onGoLocal,
}: DrawerProps) {
  const panelRef = useModalDialog<HTMLElement>({ open, onClose });
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop: a click closes it, keyboard users get Escape and this button. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="关闭对话列表"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50"
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="absolute bottom-0 left-0 top-0 flex w-[min(20rem,84vw)] flex-col border-r border-white/10 bg-[#0c1014] outline-none"
      >
        <div className="flex items-center justify-between px-5 pt-[calc(1.25rem+var(--sat))]">
          <p id="drawer-title" className="text-[11px] uppercase tracking-[0.36em] text-stone-600">
            对话
          </p>
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
            disabled={newDisabled}
            title={newDisabled ? "这一句还在回应中" : undefined}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-stone-200 transition hover:border-white/16 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/[0.03]"
          >
            新的对话
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <p className="px-2 py-3 text-sm text-stone-600">载入中…</p>
          ) : actionError ? (
            <p className="m-3 rounded-2xl border border-amber-300/20 bg-[rgba(200,173,134,0.07)] px-3 py-2.5 text-[13px] leading-6 text-amber-200/80">
              {actionError.message}
            </p>
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
                      aria-current={active ? "true" : undefined}
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
                        {s.preview || "新的对话"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {actionError && actionError.retryable ? (
          <div className="px-5 pb-2">
            <button
              type="button"
              onClick={onRetryActionError}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-stone-200 transition hover:bg-white/[0.08]"
            >
              再试一次
            </button>
          </div>
        ) : null}

        <div className="border-t border-white/8 px-5 pb-[calc(1.5rem+var(--sab))] pt-4">
          <button
            type="button"
            onClick={onOpenAbout}
            className="w-full rounded-xl px-2 py-2 text-left text-sm text-stone-500 transition hover:text-stone-300"
          >
            关于这里
          </button>
          <div className="mt-1">
            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-xl px-2 py-2 text-left text-sm text-stone-500 transition hover:text-stone-200"
            >
              退出这个空间
            </button>
            <p className="px-2 pb-1 text-[12px] leading-5 text-stone-600">
              只是离开这一次。对话和记录都留在原处。
            </p>
          </div>
          {onGoLocal ? (
            <button
              type="button"
              onClick={onGoLocal}
              className="mt-1 w-full rounded-xl px-2 py-2 text-left text-sm text-stone-600 transition hover:text-stone-400"
            >
              本地工具（旧版草稿区）
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
