"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Message } from "@/app/lib/returnApi";

type DisplayMessage = Message & { __loading?: boolean };

function isSafety(m: Message): boolean {
  return m.kind === "safety";
}

function isMeta(m: Message): boolean {
  return m.kind === "opening" || m.kind === "carry_ack";
}

function renderText(m: DisplayMessage) {
  // Keep line breaks exactly as stored; the conversation is verbatim.
  return <span className="whitespace-pre-wrap break-words">{m.content}</span>;
}

export function MessageList({ messages }: { messages: DisplayMessage[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = bottomRef.current;
      if (!el) return;
      // Flush layout first: scrollIntoView must observe final geometry.
      void el.offsetHeight;
      el.scrollIntoView({ block: "end" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", scrollToBottom);
      vv.addEventListener("scroll", scrollToBottom);
    }
    window.addEventListener("orientationchange", scrollToBottom);
    return () => {
      if (vv) {
        vv.removeEventListener("resize", scrollToBottom);
        vv.removeEventListener("scroll", scrollToBottom);
      }
      window.removeEventListener("orientationchange", scrollToBottom);
    };
  }, [scrollToBottom]);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 sm:px-6" id="messages-scroll">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-2">
        {messages.map((m, i) => {
          if (m.__loading) {
            return (
              <div key={"loading-" + i} className="flex justify-start">
                <span className="text-lg text-stone-600">…</span>
              </div>
            );
          }
          if (m.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[rgba(200,173,134,0.14)] px-4 py-2.5 text-[15px] leading-7 text-stone-100">
                  {renderText(m)}
                </div>
              </div>
            );
          }
          if (isSafety(m)) {
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-full rounded-2xl border border-amber-300/25 bg-[rgba(200,173,134,0.08)] px-4 py-3 text-[15px] leading-7 text-stone-200">
                  {renderText(m)}
                </div>
              </div>
            );
          }
          if (isMeta(m)) {
            return (
              <div key={i} className="flex justify-start">
                <p className="max-w-[88%] text-[15px] leading-7 text-stone-500">{renderText(m)}</p>
              </div>
            );
          }
          // 归 normal replies: left, no card, like a quiet voice.
          return (
            <div key={i} className="flex justify-start">
              <p className="max-w-[88%] text-[15px] leading-7 text-stone-200">{renderText(m)}</p>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-6" />
      </div>
    </div>
  );
}
