"use client";

import { useEffect, useRef, useState } from "react";
import { LocalSpace } from "@/app/LocalSpace";
import { useReturnSession } from "@/app/hooks/useReturnSession";
import { useVisualViewportHeight } from "@/app/hooks/useVisualViewportHeight";
import { ActionNotice } from "./ActionNotice";
import { Composer } from "./Composer";
import { Drawer } from "./Drawer";
import { IdentityGate } from "./IdentityGate";
import { MessageList } from "./MessageList";

type SessionApi = ReturnType<typeof useReturnSession>;

// The old local-first draft surface stays in the codebase, out of the way. A
// newcomer has enough to understand on first arrival, and "two kinds of your
// space" is one too many. Set NEXT_PUBLIC_SHOW_LOCAL_TOOLS=1 in a build where
// the owner wants the door back.
const SHOW_LOCAL_TOOLS = process.env.NEXT_PUBLIC_SHOW_LOCAL_TOOLS === "1";

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
  if (SHOW_LOCAL_TOOLS && localSpaceOf === s.spaceKey) {
    return <LocalSpace participantId={s.spaceKey} onBack={() => setLocalSpaceOf("")} />;
  }
  // Keyed on the participant: a new person must never inherit this transcript.
  return (
    <ChatSurface
      key={s.spaceKey}
      session={s}
      onGoLocal={SHOW_LOCAL_TOOLS ? () => setLocalSpaceOf(s.spaceKey) : undefined}
    />
  );
}

function ChatSurface({
  session,
  onGoLocal,
}: {
  session: SessionApi;
  onGoLocal?: () => void;
}) {
  const s = session;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [endLayerOpen, setEndLayerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'warning' | 'final'>('idle');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [carryInput, setCarryInput] = useState("");
  // A panel that opens below the fold is a silent failure of another kind.
  const endLayerRef = useRef<HTMLDivElement | null>(null);
    // The shell is as tall as what the screen actually shows, so a phone keyboard
  // lifts the composer instead of burying it.
  useVisualViewportHeight();

  const browsingOld = Boolean(s.viewingOld);

  useEffect(() => {
    if (!endLayerOpen && deleteStep === 'idle') return;
    const el = deleteStep !== 'idle' ? endLayerRef.current : endLayerRef.current; // always about panel now
    // "nearest" keeps it on screen without jumping the transcript around.
    el?.scrollIntoView({ block: "nearest" });
  }, [endLayerOpen, deleteStep]);

  // Escape always leads back to the conversation, from any of the three panels.
  useEffect(() => {
    if (!endLayerOpen && !aboutOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setEndLayerOpen(false);
      setAboutOpen(false);
      setDeleteStep('idle');
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [endLayerOpen, aboutOpen]);

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
    // 刚结束的会话仍是 sessionId，但点它的人要的是回看，不是"回到当前"——
    // 那条路会经 loadState 凭空开出一个新会话。
    if (id === s.sessionId && !s.ended) {
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
  // "没能载入过去的对话列表" belongs in the drawer, next to the empty list it
  // failed to fill. Everything else shows here.
  const drawerError = s.actionError?.area === "sessions" ? s.actionError : null;
  const surfaceError = drawerError ? null : s.actionError;

  return (
    <div
      className="relative z-10 flex flex-col"
      style={{ height: "var(--vvh, 100dvh)" }}
    >
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
          onClick={() => void handleNewSession()}
          aria-label="新的对话"
          disabled={s.sending}
          title={s.sending ? "这一句还在回应中" : undefined}
          className="rounded-full px-3 py-2 text-lg leading-none text-stone-500 transition hover:text-stone-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-stone-500"
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

      <ActionNotice
        error={surfaceError}
        onRetry={() => void s.retryActionError()}
        onDismiss={s.dismissActionError}
      />

      {/* The bottom bar holds the panels too (关于这里, 结束今天). On a phone the
          transcript is short and the panel is long, so the panel gets its own
          scroll instead of pushing its own buttons below the screen. */}
      <div className="max-h-[70%] overflow-y-auto overscroll-contain border-t border-white/8 bg-[#0b0e12]/85 px-4 pb-[calc(0.9rem+var(--sab))] pt-3 backdrop-blur sm:px-6">
        {aboutOpen ? (
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-300">关于这里</p>
              <button
                type="button"
onClick={() => {
                  setAboutOpen(false);
                  setDeleteStep('idle');
                }}                className="rounded-full px-3 py-1.5 text-xs text-stone-500 transition hover:text-stone-300"
              >
                返回对话
              </button>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-stone-500">
              对话保存在这个产品自己的服务器上，只属于你这个参与者。换设备、换浏览器，用账号进来还是这一段。
              这里没有排行、没有打卡、没有推送。解释权在你：你说错了就是错了，你的现实推翻这里的任何理解。
            </p>
            <p className="mt-3 text-[13px] leading-6 text-stone-600">
              只有这里的对话会被带走。这台浏览器自己的本地记录不属于账号，换设备不会跟过去。
            </p>
            <p className="mt-5 text-sm text-stone-300">数据与隐私</p>
            <div className="mt-2">
{deleteStep === 'idle' ? (                <button
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
                      onClick={async () => { if (deleteBusy) return; setDeleteBusy(true); setDeleteStep('idle'); const ok = await s.deleteAll(); if (!ok) setDeleteBusy(false); }} disabled={deleteBusy}
                      className="rounded-full border border-red-400/60 bg-[rgba(180,60,50,0.28)] px-4 py-2 text-sm font-medium text-red-100"
                    >
                      确认删除
                    </button>
                  </div>
                </div>
              )}
              {deleteBusy ? (
                <p className="mt-3 text-sm leading-6 text-stone-400">正在删除…</p>
              ) : s.actionError?.area === 'delete' ? (
                <p className="mt-3 text-sm leading-6 text-amber-200/80">{s.actionError.message}</p>
              ) : null}
            </div>
          </div>
        ) : endLayerOpen ? (
          <div ref={endLayerRef} className="mx-auto w-full max-w-2xl">
            <p className="text-sm text-stone-300">今天先到这里。</p>
            <p className="mt-1 text-[13px] leading-6 text-stone-500">
              可以带走一句话，也可以什么都不带。
            </p>
            <textarea
              value={carryInput}
              onChange={(e) => setCarryInput(e.target.value)}
              rows={2}
              maxLength={500}
              aria-label="想带走的话"
              placeholder="想带走的话（可留空）"
              className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] leading-6 text-stone-100 placeholder:text-stone-600 focus:border-white/20"
            />
            <div className="mt-3 flex flex-wrap gap-2">
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
              const pw: string = String(fd.get('claim_password') ?? '');
              const pw2: string = String(fd.get('claim_password2') ?? '');
              if (pw !== pw2) {
                setClaimError('两次输入的密码不一样。请再试一次。');
                return;
              }
              await handleClaim(
                String(fd.get('claim_login') ?? '').trim(),
                pw,
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
                <span className="text-[13px] tracking-wide text-stone-500">再输一次密码</span>
                <input name="claim_password2" type="password" autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-stone-100 placeholder:text-stone-600 focus:border-white/20"
                  placeholder="两次要一样" required disabled={claimBusy} />
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
        actionError={drawerError}
        newDisabled={s.sending}
        onRetryActionError={() => void s.retryActionError()}
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
