"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api as cookieApi,
  apiWithLegacyToken,
  clearStoredToken,
  fetchMe,
  loadStoredToken,
  loginWithAccount,
  logoutSession,
  probeLegacyToken,
  registerWithInvite,
  PROVIDER_DOWN_MESSAGE,
  type LoginInput,
  type Message,
  type RegisterInput,
  type SessionItem,
} from "@/app/lib/returnApi";
import {
  createIdentity,
  spaceKey,
  type IdentityState,
} from "@/app/lib/identity";
import {
  backendHasAnsweredPendingTurn,
  decideDeleteAll,
  decideNetworkRetry,
} from "@/app/lib/sessionTruth";
import { actionFailure, type ActionError } from "@/app/lib/actionTruth";

interface StateMessageResult {
  error: string | null;
}

const GENERIC_ERROR =
  "这里出了点问题。你说过的话都在，没有丢；回应有时会晚一点才完成，点「再试一次」就能看到最新。";
const NETWORK_ERROR = "网络断了一下。请再试一次。";

const LOADING_MESSAGE: Message = {
  role: "assistant",
  content: "正在回应",
  kind: "assistant",
  ts: undefined,
};

type DisplayMessage = Message & { __loading?: boolean };
type FailureKind = "provider" | "network" | "generic" | null;

interface StatePayload {
  returning: boolean;
  ended: boolean;
  session_id: string;
  messages: Message[];
}

const IDENTITY_API = {
  me: fetchMe,
  login: loginWithAccount,
  register: registerWithInvite,
  logout: logoutSession,
  legacyState: probeLegacyToken,
};

const TOKEN_STORAGE = {
  readToken: loadStoredToken,
  removeToken: clearStoredToken,
};

export function useReturnSession() {
  const [identityState, setIdentityState] = useState<IdentityState | null>(null);
  // Created once per component instance: the controller owns the identity view
  // model, and it only notifies React from async actions.
  const [identity] = useState(() =>
    createIdentity(IDENTITY_API, TOKEN_STORAGE, setIdentityState),
  );

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [ended, setEnded] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastFailed, setLastFailed] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  // One action error surface for the whole space: no failed button may stay
  // silent. Sending has its own bar above because an unfinished turn is real.
  const [actionError, setActionError] = useState<ActionError | null>(null);
  const [restoreDraft, setRestoreDraft] = useState<string | null>(null);
  const [viewingOld, setViewingOld] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendingRef = useRef(false);
  const pendingTextRef = useRef<string | null>(null);
  const failureKindRef = useRef<FailureKind>(null);
  // Non-null only while the Founder is inside the pre-account browser space.
  const legacyTokenRef = useRef<string | null>(null);
  const chatOpenRef = useRef(false);
  // Whose space is currently mounted; "" means nobody's.
  const spaceKeyRef = useRef("");

  // Life API transport: the cookie session, or the single legacy bearer path.
  const callLife = useCallback(
    async <T,>(method: string, path: string, body?: unknown) => {
      const legacy = legacyTokenRef.current;
      const r = legacy
        ? await apiWithLegacyToken<T>(legacy, method, path, body)
        : await cookieApi<T>(method, path, body);
      // One rule for every endpoint: nobody stays inside a space the server
      // no longer recognises, whatever the caller was about to do next.
      if (r.status === 401) identity.invalidate();
      return r;
    },
    [identity],
  );

  const resetChatView = useCallback(() => {
    pendingTextRef.current = null;
    failureKindRef.current = null;
    legacyTokenRef.current = null;
    chatOpenRef.current = false;
    spaceKeyRef.current = "";
    setMessages([]);
    setEnded(false);
    setSending(false);
    setLastFailed(false);
    setProviderError(null);
    setActionError(null);
    setRestoreDraft(null);
    setViewingOld(null);
    setSessionId(null);
    setSessions([]);
  }, []);

  const loadState = useCallback(async () => {
    const r = await callLife<StatePayload>("GET", "/api/state");
    if (r.status === 401) {
      identity.invalidate();
      return;
    }
    if (!r.ok || !r.data) {
      // The alternative is an empty transcript that reads like an empty life.
      setActionError(actionFailure("load", r));
      return;
    }
    setActionError(null);
    setSessionId(r.data.session_id ?? null);
    setEnded(Boolean(r.data.ended));
    setViewingOld(null);
    setLastFailed(false);
    setProviderError(null);
    const msgs = r.data.messages || [];
    // A turn can still be in flight on the server while this page loads — the
    // person refreshed or came back mid-wait. The transcript ends on their own
    // words with no reply yet. Show the same「正在回应」they would have seen,
    // otherwise the space reads as dead and the words read as lost.
    const pendingTurn = msgs.length > 0 && msgs[msgs.length - 1].role === "user";
    setMessages(pendingTurn ? [...msgs, { ...LOADING_MESSAGE, __loading: true }] : msgs);
  }, [callLife, identity]);

  const renderMessages = useCallback((msgs: Message[]) => {
    setMessages(msgs.map((m) => ({ ...m })));
  }, []);

  // Ask the server who this is. Nothing local is consulted to decide the surface.
  useEffect(() => {
    void identity.bootstrap();
  }, [identity]);

  const view = identityState ? identityState.phase : "loading";
  const chatOpen = view === "chat";
  // Empty while at the gate: no transcript may be mounted for nobody.
  const openSpaceKey = spaceKey(identityState);

  // Open the conversation when the cookie says so; wipe it the moment it stops,
  // and never carry one person's transcript into the next person's first render.
  useEffect(() => {
    if (!chatOpen) {
      if (chatOpenRef.current) resetChatView();
      return;
    }
    if (chatOpenRef.current && spaceKeyRef.current === openSpaceKey) return;
    const switchingPerson = chatOpenRef.current;
    if (switchingPerson) resetChatView();
    chatOpenRef.current = true;
    spaceKeyRef.current = openSpaceKey;
    void loadState();
  }, [chatOpen, openSpaceKey, loadState, resetChatView]);

  // Follow a turn that is still in flight on the server (the person refreshed
  // or came back mid-wait; loadState showed their words with「正在回应」).
  // The reply lands on the server regardless of this tab, so the transcript
  // follows the server truth until the reply appears. If the turn never
  // settles within the provider's own timeout budget, surface the same honest
  // provider bar and「再试一次」as a failed send — a retry re-requests the
  // reply without duplicating the stored words.
  useEffect(() => {
    if (!chatOpen || viewingOld || ended) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    // Follow when the truth ends on the person's own words, or when loadState
    // restored the「正在回应」bubble for such a turn (its role is assistant).
    // An active send owns the surface itself — excluded by sendingRef.
    if (!last.__loading && last.role !== "user") return;
    if (sendingRef.current) return;
    let stopped = false;
    let polls = 0;
    const timer = setInterval(async () => {
      if (stopped || sendingRef.current) return;
      polls += 1;
      if (polls > 40) {
        // 40 × 3s ≥ the provider's own 90s budget: this turn is not coming
        // back on its own. Same surface as any failed send.
        stopped = true;
        setMessages((prev) => prev.filter((m) => !m.__loading));
        setLastFailed(true);
        setProviderError(PROVIDER_DOWN_MESSAGE);
        return;
      }
      const r = await callLife<StatePayload>("GET", "/api/state");
      if (stopped) return;
      if (r.status === 401) {
        identity.invalidate();
        return;
      }
      if (!r.ok || !r.data) return; // transient: keep following
      setEnded(Boolean(r.data.ended));
      const msgs = r.data.messages || [];
      const lastMsg = msgs[msgs.length - 1];
      if (r.data.ended || !lastMsg || lastMsg.role !== "user") {
        // The reply landed (or the day ended): show the stored truth.
        setMessages(msgs);
        stopped = true;
      }
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [messages, chatOpen, viewingOld, ended, callLife, identity]);

  const runIdentity = useCallback(
    async (fn: () => Promise<{ ok: boolean; error: string | null }>) => {
      if (busy) return { ok: false, error: null };
      setBusy(true);
      const r = await fn();
      setBusy(false);
      return r;
    },
    [busy],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      legacyTokenRef.current = null;
      return runIdentity(() => identity.login(input));
    },
    [identity, runIdentity],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      legacyTokenRef.current = null;
      return runIdentity(() => identity.register(input));
    },
    [identity, runIdentity],
  );

  // Requires an explicit click; never called on load.
  const openLegacySpace = useCallback(async () => {
    return runIdentity(async () => {
      // Install before the transition commits: opening the conversation reads
      // this ref to decide between the cookie and the legacy bearer path.
      const token = loadStoredToken();
      legacyTokenRef.current = token;
      const r = await identity.openLegacySpace();
      if (!r.ok) legacyTokenRef.current = null;
      return r;
    });
  }, [identity, runIdentity]);

  // Logging out closes the session only: no end-session, no delete-all. A failed
  // logout leaves the person inside, saying so: on a shared browser the honest
  // default is "you are still in", never a gate that only looks closed.
  const logout = useCallback(async () => {
    // Drop the bearer path first so the revoke always goes out on the cookie.
    legacyTokenRef.current = null;
    return runIdentity(async () => {
      const r = await identity.logout();
      if (r.error) {
        setActionError(actionFailure("logout"));
      } else {
        setActionError(null);
      }
      return r;
    });
  }, [identity, runIdentity]);

  const send = useCallback(
    async (text: string, isRetry: boolean): Promise<StateMessageResult> => {
      if (!chatOpenRef.current || sendingRef.current) {
        return { error: null };
      }
      sendingRef.current = true;
      setSending(true);
      setLastFailed(false);
      setProviderError(null);
      setRestoreDraft(null);

      if (!isRetry) {
        pendingTextRef.current = text;
        failureKindRef.current = null;
        const userMsg: DisplayMessage = { role: "user", content: text, kind: "user" };
        const loading: DisplayMessage = { ...LOADING_MESSAGE, __loading: true };
        setMessages((prev) => {
          const cleaned = prev.filter((m) => !m.__loading);
          const last = cleaned[cleaned.length - 1];
          if (last && last.role === "user" && last.content === text) {
            return [...cleaned, loading];
          }
          return [...cleaned, userMsg, loading];
        });
      } else {
        const loading: DisplayMessage = { ...LOADING_MESSAGE, __loading: true };
        setMessages((prev) => [...prev.filter((m) => !m.__loading), loading]);
      }

      const r = await callLife<{
        reply: string;
        kind: string;
        messages: Message[];
        error?: string;
      }>("POST", "/api/message", { text, retry: isRetry });

      setMessages((prev) => prev.filter((m) => !m.__loading));
      sendingRef.current = false;
      setSending(false);

      if (r.status === 401) {
        identity.invalidate();
        return { error: null };
      }
      if (r.status === 409 && r.data && r.data.error === "nothing_to_retry") {
        let kept = pendingTextRef.current;
        const stateR = await callLife<{ messages: Message[] }>("GET", "/api/state");
        if (stateR.ok && stateR.data?.messages) {
          renderMessages(stateR.data.messages);
          // 迟到的回复：这句话已经入档并且回应就在上面。把它再塞回输入框等于
          // 谎报"没发出去"，还会诱使同一句话说两遍。
          if (kept && backendHasAnsweredPendingTurn(stateR.data.messages, kept)) {
            pendingTextRef.current = null;
            failureKindRef.current = null;
            kept = null;
          }
        }
        if (kept) {
          setRestoreDraft(kept);
        }
        setLastFailed(false);
        setProviderError(null);
        return { error: null };
      }
      if (r.status === 409 && r.data && r.data.error === "no_active_session") {
        await loadState();
        return { error: null };
      }
      if (r.status === 400 && r.data && r.data.error === "empty_or_too_long") {
        // 这句话一个字都没被保存。它在哪儿都不在转写里，必须原样回到输入框。
        const kept = pendingTextRef.current;
        pendingTextRef.current = null;
        failureKindRef.current = null;
        setLastFailed(false);
        setProviderError(null);
        if (kept) setRestoreDraft(kept);
        setActionError(actionFailure("compose"));
        return { error: null };
      }
      if (r.status === 503) {
        failureKindRef.current = "provider";
        const msg = (r.data as { message?: string } | null)?.message || PROVIDER_DOWN_MESSAGE;
        const stateR = await callLife<StatePayload>("GET", "/api/state");
        if (stateR.ok && stateR.data?.messages) {
          renderMessages(stateR.data.messages);
        }
        setLastFailed(true);
        setProviderError(msg);
        return { error: msg };
      }
      if (r.networkError) {
        failureKindRef.current = "network";
        setLastFailed(true);
        setProviderError(NETWORK_ERROR);
        return { error: NETWORK_ERROR };
      }
      if (!r.ok || !r.data || !r.data.reply) {
        failureKindRef.current = "generic";
        setLastFailed(true);
        setProviderError(GENERIC_ERROR);
        return { error: GENERIC_ERROR };
      }
      pendingTextRef.current = null;
      failureKindRef.current = null;
      renderMessages(r.data.messages || []);
      return { error: null };
    },
    [callLife, identity, loadState, renderMessages],
  );

  const retry = useCallback(async (): Promise<StateMessageResult> => {
    if (sendingRef.current) return { error: null };
    const pending = pendingTextRef.current;
    if (failureKindRef.current === "network") {
      const stateR = await callLife<{ messages: Message[] }>("GET", "/api/state");
      const plan = decideNetworkRetry(stateR, pending);
      if (plan.mode === "wait") {
        setLastFailed(true);
        setProviderError(NETWORK_ERROR);
        return { error: NETWORK_ERROR };
      }
      if (plan.mode === "recovered") {
        // 话早就送到了，回应也在：把事实摆出来，而不是把同一句话再说一遍。
        if (stateR.ok && stateR.data?.messages) {
          renderMessages(stateR.data.messages);
        }
        pendingTextRef.current = null;
        failureKindRef.current = null;
        setLastFailed(false);
        setProviderError(null);
        return { error: null };
      }
      if (plan.mode === "retry") {
        if (stateR.ok && stateR.data?.messages) {
          renderMessages(stateR.data.messages);
        }
        return send("", true);
      }
      return send(plan.text, false);
    }
    return send("", true);
  }, [callLife, renderMessages, send]);

  const startNewSession = useCallback(async (): Promise<void> => {
    if (!chatOpenRef.current || sendingRef.current) return;
    const r = await callLife<{ returning: boolean; session_id: string; messages: Message[] }>(
      "POST",
      "/api/new-session",
    );
    if (r.status === 401) {
      identity.invalidate();
      return;
    }
    if (!r.ok || !r.data) {
      setActionError(actionFailure("new", r));
      return;
    }
    setActionError(null);
    pendingTextRef.current = null;
    failureKindRef.current = null;
    setSessionId(r.data.session_id ?? null);
    setEnded(false);
    setLastFailed(false);
    setProviderError(null);
    setViewingOld(null);
    renderMessages(r.data.messages || []);
  }, [callLife, identity, renderMessages]);

  const loadSessions = useCallback(async (): Promise<void> => {
    if (!chatOpenRef.current) return;
    setSessionsLoading(true);
    const r = await callLife<{ sessions: SessionItem[] }>("GET", "/api/sessions");
    setSessionsLoading(false);
    if (r.status === 401) {
      identity.invalidate();
      return;
    }
    if (!r.ok || !r.data) {
      setActionError(actionFailure("sessions", r));
      return;
    }
    setActionError(null);
    setSessions(r.data.sessions || []);
  }, [callLife, identity]);

  const openOldSession = useCallback(
    async (id: string): Promise<void> => {
      if (!chatOpenRef.current) return;
      const r = await callLife<{ session_id: string; messages: Message[] }>(
        "GET",
        "/api/sessions/" + encodeURIComponent(id),
      );
      if (r.status === 401) {
        identity.invalidate();
        return;
      }
      if (!r.ok || !r.data) {
        setActionError(actionFailure("open", r));
        return;
      }
      setActionError(null);
      setViewingOld(id);
      setLastFailed(false);
      setProviderError(null);
      renderMessages(r.data.messages || []);
    },
    [callLife, identity, renderMessages],
  );

  const backToCurrent = useCallback(async (): Promise<void> => {
    setViewingOld(null);
    await loadState();
  }, [loadState]);

  const finishDay = useCallback(
    async (carry: string): Promise<boolean> => {
      if (!chatOpenRef.current) return false;
      const r = await callLife<{ ended: boolean }>("POST", "/api/end-session", {
        carry_forward: carry || "",
      });
      if (r.status === 401) {
        identity.invalidate();
        return false;
      }
      if (!r.ok) {
        setActionError(actionFailure("finish", r));
        return false;
      }
      setActionError(null);
      setEnded(true);
      setViewingOld(null);
      return true;
    },
    [callLife, identity],
  );


  const claim = useCallback(async (input: { login_id: string; password: string; display_name?: string }): Promise<{ ok: boolean; error: string | null }> => {
    if (!chatOpenRef.current) return { ok: false, error: null };
    const r = await callLife<{ participant_id?: string; error?: string; message?: string }>("POST", "/api/claim", input);
    if (r.status === 401) {
      identity.invalidate();
      return { ok: false, error: null };
    }
    if (r.ok && r.data?.participant_id) {
      // Claim succeeded — cookie now owns this identity.
      identity.bootstrap();
      return { ok: true, error: null };
    }
    // Map error codes
    const data = (r.data ?? {}) as { error?: string; message?: string };
    let err = data.message || '绑定失败，请再试一次。';
    switch (data.error) {
      case 'already_claimed': err = '这个空间已经有账号了。直接登录即可。'; break;
      case 'login_taken': err = '这个账号名已经有人用了。换一个，或者直接登录那个账号。'; break;
      case 'invalid_login_id': err = '账号名不符合要求。用 3-32 个字母、数字、下划线或连字符。'; break;
      case 'weak_password': err = '这个密码不够长。请至少用 10 个字符。'; break;
    }
    return { ok: false, error: err };
  }, [callLife, identity]);
  const deleteAll = useCallback(async (): Promise<boolean> => {
    if (!chatOpenRef.current) return false;
    setActionError(null);
    const r = await callLife<{ deleted: boolean }>("POST", "/api/delete-all");
    const decision = decideDeleteAll(r);
    if (decision.resetAuth) {
      identity.invalidate("deleted");
      return true;
    }
    // Same surface as everything else: "deleted" is never said unless the
    // backend confirmed it, and the data is still where it was.
    setActionError(actionFailure("delete", r));
    return false;
  }, [callLife, identity]);

  const dismissActionError = useCallback(() => setActionError(null), []);

  // "再试一次" re-runs the action that failed — nothing else, and never a send.
  const retryActionError = useCallback(async (): Promise<void> => {
    const area = actionError?.area;
    if (!area) return;
    setActionError(null);
    if (area === "load") await loadState();
    else if (area === "new") await startNewSession();
    else if (area === "sessions") await loadSessions();
    else if (area === "logout") await logout();
    else if (area === "delete") await deleteAll();
  }, [actionError?.area, deleteAll, loadSessions, loadState, logout, startNewSession]);

  return {
    view,
    participantId: identityState?.participantId ?? "",
    spaceKey: openSpaceKey,
    displayName: identityState?.displayName ?? "",
    gateError: identityState?.gateError ?? null,
    legacyOpen: identityState?.legacyOpen ?? false,
    legacyAvailable: identityState?.legacyAvailable ?? false,
    busy,
    messages,
    ended,
    sending,
    lastFailed,
    providerError,
    actionError,
    restoreDraft,
    viewingOld,
    sessionId,
    sessions,
    sessionsLoading,
    login,
    register,
    openLegacySpace,
    logout,
    loadState,
    send,
    retry,
    startNewSession,
    loadSessions,
    openOldSession,
    backToCurrent,
    finishDay,
    claim,
    deleteAll,
    dismissActionError,
    retryActionError,
  };
}
