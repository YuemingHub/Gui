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
import { decideDeleteAll, decideNetworkRetry } from "@/app/lib/sessionTruth";

interface StateMessageResult {
  error: string | null;
}

const GENERIC_ERROR = "这里出了点问题。你刚才说的话都在，没有丢。";
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
        ? await apiWithLegacyToken<T>(legacy, method, path)
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
    setDeleteError(null);
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
      return;
    }
    setSessionId(r.data.session_id ?? null);
    setEnded(Boolean(r.data.ended));
    setViewingOld(null);
    setLastFailed(false);
    setProviderError(null);
    setMessages(r.data.messages || []);
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

  // Logging out closes the session only: no end-session, no delete-all.
  const logout = useCallback(async () => {
    // Drop the bearer path first so the revoke always goes out on the cookie.
    legacyTokenRef.current = null;
    return runIdentity(async () => {
      await identity.logout();
      return { ok: true, error: null };
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
        const kept = pendingTextRef.current;
        const stateR = await callLife<{ messages: Message[] }>("GET", "/api/state");
        if (stateR.ok && stateR.data?.messages) {
          renderMessages(stateR.data.messages);
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
    if (!r.ok || !r.data) return;
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
    if (!r.ok || !r.data) return;
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
      if (!r.ok || !r.data) return;
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
      if (!r.ok) return false;
      setEnded(true);
      setViewingOld(null);
      return true;
    },
    [callLife, identity],
  );

  const deleteAll = useCallback(async (): Promise<boolean> => {
    if (!chatOpenRef.current) return false;
    setDeleteError(null);
    const r = await callLife<{ deleted: boolean }>("POST", "/api/delete-all");
    const decision = decideDeleteAll(r);
    if (decision.resetAuth) {
      identity.invalidate("deleted");
      return true;
    }
    setDeleteError(decision.error);
    return false;
  }, [callLife, identity]);

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
    deleteError,
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
    deleteAll,
  };
}
