"use client";

type ConfirmButtonProps = {
  onConfirm: () => void;
  message?: string;
  children: string;
  className?: string;
};

export function ConfirmButton({
  onConfirm,
  message = "确定把它移走吗？这只是从列表里移除，不代表它失败了。",
  children,
  className,
}: ConfirmButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(message)) {
          onConfirm();
        }
      }}
      className={className ?? "rounded-full border border-white/10 px-3 py-3 text-sm text-stone-300 transition hover:border-white/20 hover:text-stone-100"}
    >
      {children}
    </button>
  );
}
