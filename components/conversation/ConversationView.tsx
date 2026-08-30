"use client";

import { useState } from "react";
import { useReturnSession } from "@/app/hooks/useReturnSession";
import { Composer } from "./Composer";
import { Drawer } from "./Drawer";
import { EnterScreen } from "./EnterScreen";
import { MessageList } from "./MessageList";

type ConversationViewProps = {
  onGoLocal: () => void;
};

type SessionApi = ReturnType<typeof useReturnSession>;

export function ConversationView({ onGoLocal }: ConversationViewProps) {
  const s = useReturnSession();
  const chatting: boolean = s.phase === "chat" && Boolean(s.token);

  if (!chatting) {
    return <EnterScreen onEnter={s.enter} />;
  }
  // Keyed by token: a fresh entry starts with clean transient layers, and a
  // 401-driven reset returns here without stale panel state.
  return <ChatSurface key={s.token} session={s} onGoLocal={onGoLocal} />;
}

function ChatSurface({
  session,
  onGoLocal,
}: {
  session: SessionApi;
  onGoLocal: () => void;
}) {
  const s = session;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [endLayerOpen, setEndLayerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [carryInput, setCarryInput] = useState("");

  const browsingOld = Boolean(s.viewingOld);

  const openDrawer = () => {
    setDrawerOpen(true);
    void s.loadSessions();
  };

  const handleNewSession = async () => {
    setDrawerOpen(false);
    setEndLayerOpen(false);
    await s.startNewSession();
  };

  const handleSelectSession = async (id: string) => {
    setDrawerOpen(false);
    await s.openOldSession(id);
  };

  const handleFinishDay = async (carry: string) => {
    const ok = await s.finishDay(carry);
    if (ok) {
      setEndLayerOpen(false);
      setCarryInput("");
    }
  };

  return (
    <div className="relative z-10 flex h-[100dvh] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/8 bg-[#0b0e12]/85 px-3 pb-2 pt-[calc(0.6rem+var(--sat))] backdrop-blur">
        <button
          type="button"
          onClick={openDrawer}
          aria-label="对话记录"
          className="rounded-full px-3 py-2 text-lg leading-none text-stone-500 transition hover:text-stone-200"
        >
          ☰
        </button>
        <p className="text-sm tracking-[0.2em] text-stone-400">归</p>
        <button
          type="button"
          onClick={handleNewSession}
          aria-label="新的一段"
          className="rounded-full px-3 py-2 text-lg leading-none text-stone-500 transition hover:text-stone-200"
        >
          ＋
        </button>
      </header>

      {/* Messages */}
      <MessageList messages={s.messages} />

      {/* Provider failure: message kept, retry offered. Retry must not duplicate
          the participant's message — the backend treats it as a pending retry. */}
      {s.lastFailed && s.providerError && !browsingOld ? (
        <div className="border-t border-amber-300/20 bg-[rgba(200,173,134,0.07)] px-4 py-3">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
            <p className="text-sm leading-6 text-amber-200/80">{s.providerError}</p>
            <button
              type="button"
              onClick={() => void s.retry()}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-stone-200 transition hover:bg-white/[0.08]"
            >
              再试一次
            </button>
          </div>
        </div>
      ) : null}

      {/* Bottom area */}
      <div className="border-t border-white/8 bg-[#0b0e12]/85 px-4 pb-[calc(0.9rem+var(--sab))] pt-3 backdrop-blur sm:px-6">
        {aboutOpen ? (
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-300">关于这里</p>
              <button
                type="button"
                onClick={() => {
                  setAboutOpen(false);
                  setDeleteConfirm(false);
                }}
                className="rounded-full px-3 py-1.5 text-xs text-stone-500 transition hover:text-stone-300"
              >
                返回
              </button>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-stone-500">
              对话保存在这个产品自己的服务器上，只属于你这个参与者。这里没有排行、没有打卡、没有推送。解释权在你：你说错了就是错了，你的现实推翻这里的任何理解。
            </p>
            <div className="mt-4">
              {deleteConfirm ? (
                <div className="rounded-2xl border border-red-400/25 bg-[rgba(180,60,50,0.08)] p-4">
                  <p className="text-sm leading-6 text-stone-200">
                    真的删除全部数据？对话、记忆、记录会一起消失，无法找回。
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void s.deleteAll()}
                      className="rounded-full border border-red-400/40 bg-[rgba(180,60,50,0.18)] px-4 py-2 text-sm text-red-200"
                    >
                      全部删除
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-stone-400"
                    >
                      先不删
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-[13px] text-stone-600 underline-offset-4 transition hover:text-red-300/80 hover:underline"
                >
                  删除我的全部数据
                </button>
              )}
            </div>
          </div>
        ) : endLayerOpen ? (
          <div className="mx-auto w-full max-w-2xl">
            <p className="text-sm text-stone-300">今天先到这里。</p>
            <p className="mt-1 text-[13px] leading-6 text-stone-500">
              可以带走一句话，也可以什么都不带。
            </p>
            <textarea
              value={carryInput}
              onChange={(e) => setCarryInput(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="想带走的话（可留空）"
              className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] leading-6 text-stone-100 placeholder:text-stone-600 focus:border-white/20"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void handleFinishDay(carryInput.trim())}
                className="rounded-full border border-white/10 bg-[rgba(200,173,134,0.16)] px-4 py-2.5 text-sm text-stone-100 transition hover:bg-[rgba(200,173,134,0.24)]"
              >
                带走这句
              </button>
              <button
                type="button"
                onClick={() => void handleFinishDay("")}
                className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-stone-300 transition hover:bg-white/[0.05]"
              >
                什么都不带
              </button>
              <button
                type="button"
                onClick={() => setEndLayerOpen(false)}
                className="rounded-full px-4 py-2.5 text-sm text-stone-600 transition hover:text-stone-300"
              >
                再聊会
              </button>
            </div>
          </div>
        ) : browsingOld ? (
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
            <p className="text-sm text-stone-600">过去的对话，只读。</p>
            <button
              type="button"
              onClick={() => void s.backToCurrent()}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-stone-200 transition hover:bg-white/[0.08]"
            >
              返回当前对话
            </button>
          </div>
        ) : s.ended ? (
          <div className="mx-auto w-full max-w-2xl text-center">
            <p className="text-sm text-stone-400">今天先到这里。</p>
            <button
              type="button"
              onClick={handleNewSession}
              className="mt-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-stone-200 transition hover:bg-white/[0.08]"
            >
              新的一段
            </button>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setCarryInput("");
                  setEndLayerOpen(true);
                }}
                className="text-[12px] tracking-wide text-stone-600 transition hover:text-stone-400"
              >
                今天先到这里
              </button>
            </div>
            <Composer
              disabled={s.sending}
              onSend={(text) => void s.send(text, false)}
            />
          </div>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        sessions={s.sessions}
        loading={s.sessionsLoading}
        currentSessionId={s.sessionId}
        viewingOld={s.viewingOld}
        onClose={() => setDrawerOpen(false)}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onOpenAbout={() => {
          setDrawerOpen(false);
          setAboutOpen(true);
          setDeleteConfirm(false);
        }}
        onGoLocal={onGoLocal}
      />
    </div>
  );
}
