import { ReactNode } from "react";

type GentleNoticeProps = {
  children: ReactNode;
};

export function GentleNotice({ children }: GentleNoticeProps) {
  return (
    <div className="rounded-2xl border border-amber-200/12 bg-amber-100/[0.06] px-4 py-3 text-sm leading-6 text-amber-100/78">
      {children}
    </div>
  );
}
