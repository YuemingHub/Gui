"use client";

import type { ActionError } from "@/app/lib/actionTruth";

type ActionNoticeProps = {
  error: ActionError | null;
  onRetry?: () => void;
  onDismiss: () => void;
};

/**
 * The space's only action error surface: one line, at most two controls, no
 * toast framework. It stays on screen until the person dismisses it or the same
 * action succeeds, because a failure that fades away was never reported.
 */
export function ActionNotice({ error, onRetry, onDismiss }: ActionNoticeProps) {
  if (!error) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-action-area={error.area}
      className="border-t border-amber-300/20 bg-[rgba(200,173,134,0.07)] px-4 py-2.5"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-[13px] leading-6 text-amber-200/80">{error.message}</p>
        {error.retryable && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-stone-200 transition hover:bg-white/[0.08]"
          >
            再试一次
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full px-3 py-1.5 text-[13px] text-stone-500 transition hover:text-stone-300"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
