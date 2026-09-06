"use client";

import { useState } from "react";
import { LocalSpace } from "@/app/LocalSpace";
import { useReturnSession } from "@/app/hooks/useReturnSession";
import { Composer } from "./Composer";
import { Drawer } from "./Drawer";
import { IdentityGate } from "./IdentityGate";
import { MessageList } from "./MessageList";

type SessionApi = ReturnType<typeof useReturnSession>;

export function ConversationView() {
  const s = useReturnSession();
  // Whose space the local tools were opened for; it cannot outlive that person.
  const [localSpaceOf, setLocalSpaceOf] = useState("");
  const chatting: boolean = s.view === "chat";

  if (!chatting) {
    return (
      <IdentityGate
        checking={s.view === "loading"}
        busy={s.busy}
        error={s.gateError}
        legacyAvailable={s.legacyAvailable}
        onLogin={s.login}
        onRegister={s.register}
        onLegacyBrowser={s.openLegacySpace}
      />
    );
  }
  if (localSpaceOf === s.spaceKey) {
    return <LocalSpace participantId={s.spaceKey} onBack={() => setLocalSpaceOf("")} />;
  }
  // Keyed on the participant: a new person must never inherit this transcript.
  return (
    <ChatSurface key={s.spaceKey} session={s} onGoLocal={() => setLocalSpaceOf(s.spaceKey)} />
  );
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
  const [deleteStep, setDeleteStep] = useState<'idle' | 'warning' | 'final'>('idle');
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
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
    if (id === s.sessionId) {
      await s.backToCurrent();
      return;
    }
    await s.openOldSession(id);
  };

  const handleClaim = async (login_id: string, password: string, display_name?: string) => {
    setClaimBusy(true);
    setClaimError(null);
    const r = await s.claim({ login_id, password, display_name });
    setClaimBusy(false);
    if (r.ok) {
      setClaimOpen(false);
    } else {
      setClaimError(r.error);
    }
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
      <header className="flex items-center justify-between border-b border-white/8 bg-[#0b0e12]/85 px-3 pb-2 pt-[calc(0.6rem+var(--sat))] backdrop-blur">
        <button
          type="button"
          onClick={openDrawer}
          aria-label="过去的对话"
          className="rounded-full px-3 py-2 text-lg leading-none text-stone-500 transition hover:text-stone-200"
        >
          ☰
        </button>
        <p className="text-sm tracking-[0.2em] text-stone-400">我和自己</p>
        <button
          type="button"
          onClick={handleNewSession}
          aria-label="新的对话"
          className="rounded-full px-3 py-2 text-lg leading-none text-stone-500 transition hover:text-stone-200"
        >
          ＋
        </button>
      </header>

      {s.legacyOpen ? (
        <div className="border-b border-amber-300/20 bg-[rgba(200,173,134,0.07)] px-4 py-2.5 text-center">
          <p className="text-[13px] leading-6 text-amber-200/80">
            这台浏览器还在用旧的进入方式。
            <button
              type="button"
              onClick={() => { setClaimOpen(true); setClaimError(null); }}
              className="ml-2 underline-offset-2 hover:underline text-amber-200 transition hover:text-amber-100"
            >
              给这个空间设一个账号密码
            </button>
          </p>
        </div>
      ) : null}

      <MessageList messages={s.messages} />

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

      <div className="border-t border-white/8 bg-[#0b0e12]/85 px-4 pb-[calc(0.9rem+var(--sab))] pt-3 backdrop-blur sm:px-6">
        {aboutOpen ? (
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-300">关于这里</p>
              <button
                type="button"
                onClick={() => {
                  setAboutOpen(false);
                  setDeleteStep('idle');
                }}
                className="rounded-full px-3 py-1.5 text-xs text-stone-500 transition hover:text-stone-300"
              >
                返回
              </button>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-stone-500">
              对话保存在这个产品自己的服务器上，只属于你这个参与者。这里没有排行、没有打卡、没有推送。解释权在你：你说错了就是错了，你的现实推翻这里的任何理解。
            </p>
            <p className="mt-5 text-sm text-stone-300">数据与隐私</p>
            <div className="mt-2">
              {deleteStep === 'idle' ? (
                <button
                  type="button"
                  onClick={() => { setDeleteStep('warning'); }}
                  className="text-[13px] text-stone-600 underline-offset-4 transition hover:text-red-300/80 hover:underline"
                >
                  删除我的全部数据
                </button>
              ) : deleteStep === 'warning' ? (
                <div className="rounded-2xl border border-red-400/25 bg-[rgba(180,60,50,0.08)] p-4">
                  <p className="text-sm leading-6 text-stone-200">
                    这会永久删除你的空间，包括这里保存的对话、记忆和与你这个空间相关的数据。删除后无法恢复。
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep('idle')}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-stone-400"
                    >
                      先不删
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep('final')}
                      className="rounded-full border border-red-400/40 bg-[rgba(180,60,50,0.18)] px-4 py-2 text-sm text-red-200"
                    >
                      继续删除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-red-400/40 bg-[rgba(180,60,50,0.14)] p-4">
                  <p className="text-sm font-medium leading-6 text-red-200">确认永久删除这个空间？</p>
                  <p className="mt-2 text-[13px] leading-6 text-stone-400">包括对话、记忆、记录。无法恢复。</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep('warning')}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-stone-400"
                    >
                      返回
                    </button>
                    <button
                      type="button"
                      onClick={async () => { setDeleteStep('idle'); await s.deleteAll(); }}
                      className="rounded-full border border-red-400/60 bg-[rgba(180,60,50,0.28)] px-4 py-2 text-sm font-medium text-red-100"
                    >
                      确认删除
                    </button>
                  </div>
                </div>
              )}
              {s.deleteError ? (
                <p className="mt-3 text-sm leading-6 text-amber-200/80">{s.deleteError}</p>
              ) : null}
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
              新的对话
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
              restoreText={s.restoreDraft}
              onSend={(text) => void s.send(text, false)}
            />
          </div>
        )}
      </div>

      {claimOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await handleClaim(
                String(fd.get('claim_login') ?? '').trim(),
                String(fd.get('claim_password') ?? ''),
                String(fd.get('claim_name') ?? '').trim() || undefined,
              );
            }}
            className="mx-4 w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b0e12] p-6 shadow-2xl"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300/70">认领这个空间</p>
            <h3 className="mt-3 text-lg font-medium text-stone-100">设一个账号和密码</h3>
            <p className="mt-2 text-[13px] leading-6 text-stone-500">
              给现在这个空间设一个账号和密码。以后换设备，也能回来这里。
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] tracking-wide text-stone-500">账号</span>
                <input name="claim_login" type="text" autoComplete="username" autoCapitalize="off"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-stone-100 placeholder:text-stone-600 focus:border-white/20"
                  placeholder="3-32 个小写字母、数字、下划线" required disabled={claimBusy} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] tracking-wide text-stone-500">密码</span>
                <input name="claim_password" type="password" autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-stone-100 placeholder:text-stone-600 focus:border-white/20"
                  placeholder="至少 10 个字符" required disabled={claimBusy} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] tracking-wide text-stone-500">称呼（可留空）</span>
                <input name="claim_name" type="text" autoComplete="nickname"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-stone-100 placeholder:text-stone-600 focus:border-white/20"
                  placeholder="这里想怎么叫你" disabled={claimBusy} />
              </label>
            </div>
            {claimError ? (
              <p className="mt-3 text-sm leading-6 text-amber-300/80">{claimError}</p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => { setClaimOpen(false); setClaimError(null); }}
                disabled={claimBusy}
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-stone-400 transition hover:text-stone-200 disabled:opacity-40">
                取消
              </button>
              <button type="submit" disabled={claimBusy}
                className="flex-1 rounded-full border border-white/10 bg-[rgba(200,173,134,0.16)] px-5 py-3 text-sm text-stone-100 transition hover:bg-[rgba(200,173,134,0.24)] disabled:opacity-40">
                {claimBusy ? '正在保存…' : '绑定账号'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

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
          setDeleteStep('idle');
        }}
        onLogout={() => {
          setDrawerOpen(false);
          void s.logout();
        }}
        onGoLocal={onGoLocal}
      />
    </div>
  );
}
