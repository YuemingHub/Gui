"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  callApi,
  clearStoredToken,
  enterWithCode,
  loadStoredToken,
  storeToken,
  PROVIDER_DOWN_MESSAGE,
  type Message,
  type SessionItem,
} from "@/app/lib/returnApi";
import { decideDeleteAll, decideNetworkRetry } from "@/app/lib/sessionTruth";

export type Phase = "enter" | "chat";

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

export function useReturnSession() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>("enter");
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

  const tokenRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const pendingTextRef = useRef<string | null>(null);
  const failureKindRef = useRef<FailureKind>(null);

  const resetAuth = useCallback(() => {
    clearStoredToken();
    tokenRef.current = null;
    pendingTextRef.current = null;
    failureKindRef.current = null;
    setToken(null);
    setPhase("enter");
    setMessages([]);
    setEnded(false);
    setLastFailed(false);
    setProviderError(null);
    setDeleteError(null);
    setRestoreDraft(null);
    setViewingOld(null);
    setSessionId(null);
    setSessions([]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadStoredToken();
      tokenRef.current = stored;
      setToken(stored);
      setHydrated(true);
      setPhase(stored ? "chat" : "enter");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadState = useCallback(async () => {
    const tok = tokenRef.current;
    if (!tok) {
      setPhase("enter");
      return;
    }
    const r = await callApi<{ returning: boolean; ended: boolean; session_id: string; messages: Message[] }>(
      tok,
      "GET",
      "/api/state",
    );
    if (r.status === 401) {
      resetAuth();
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
    setPhase("chat");
  }, [resetAuth]);

  useEffect(() => {
    if (hydrated && token) {
      void loadState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const enter = useCallback(
    async (code: string): Promise<{ ok: boolean; error: string | null }> => {
      const r = await enterWithCode(code);
      if (!r.ok || !r.data || !r.data.token) {
        return {
          ok: false,
          error: "这个邀请码进不去。可能输错了，或者已经被用过。",
        };
      }
      storeToken(r.data.token);
      tokenRef.current = r.data.token;
      setToken(r.data.token);
      setPhase("chat");
      const stateR = await callApi<{ returning: boolean; ended: boolean; session_id: string; messages: Message[] }>(
        r.data.token,
        "GET",
        "/api/state",
      );
      if (stateR.status === 401) {
        resetAuth();
        return { ok: false, error: "进入失败了。请重新输入邀请码。" };
      }
      setSessionId(stateR.data?.session_id ?? null);
      setEnded(Boolean(stateR.data?.ended));
      setViewingOld(null);
      setLastFailed(false);
      setProviderError(null);
      setMessages(stateR.data?.messages || []);
      return { ok: true, error: null };
    },
    [resetAuth],
  );

  const renderMessages = useCallback((msgs: Message[]) => {
    setMessages(msgs.map((m) => ({ ...m })));
  }, []);

  const send = useCallback(
    async (text: string, isRetry: boolean): Promise<StateMessageResult> => {
      const tok = tokenRef.current;
      if (!tok || sendingRef.current) {
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

      const r = await callApi<{ reply: string; kind: string; messages: Message[]; error?: string }>(
        tok,
        "POST",
        "/api/message",
        { text, retry: isRetry },
      );

      setMessages((prev) => prev.filter((m) => !m.__loading));
      sendingRef.current = false;
      setSending(false);

      if (r.status === 401) {
        resetAuth();
        return { error: null };
      }
      if (r.status === 409 && r.data && r.data.error === "nothing_to_retry") {
        const kept = pendingTextRef.current;
        const stateR = await callApi<{ messages: Message[] }>(tok, "GET", "/api/state");
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
        const stateR = await callApi<{
          returning: boolean;
          ended: boolean;
          session_id: string;
          messages: Message[];
        }>(tok, "GET", "/api/state");
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
    [loadState, renderMessages, resetAuth],
  );

  const retry = useCallback(async (): Promise<StateMessageResult> => {
    if (sendingRef.current) return { error: null };
    const pending = pendingTextRef.current;
    if (failureKindRef.current === "network") {
      const tok = tokenRef.current;
      if (!tok) return { error: null };
      const stateR = await callApi<{ messages: Message[] }>(tok, "GET", "/api/state");
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
  }, [renderMessages, send]);

  const startNewSession = useCallback(async (): Promise<void> => {
    const tok = tokenRef.current;
    if (!tok || sendingRef.current) return;
    const r = await callApi<{ returning: boolean; session_id: string; messages: Message[] }>(
      tok,
      "POST",
      "/api/new-session",
    );
    if (r.status === 401) {
      resetAuth();
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
  }, [renderMessages, resetAuth]);

  const loadSessions = useCallback(async (): Promise<void> => {
    const tok = tokenRef.current;
    if (!tok) return;
    setSessionsLoading(true);
    const r = await callApi<{ sessions: SessionItem[] }>(tok, "GET", "/api/sessions");
    setSessionsLoading(false);
    if (r.status === 401) {
      resetAuth();
      return;
    }
    if (!r.ok || !r.data) return;
    setSessions(r.data.sessions || []);
  }, [resetAuth]);

  const openOldSession = useCallback(
    async (id: string): Promise<void> => {
      const tok = tokenRef.current;
      if (!tok) return;
      const r = await callApi<{ session_id: string; messages: Message[] }>(
        tok,
        "GET",
        "/api/sessions/" + encodeURIComponent(id),
      );
      if (r.status === 401) {
        resetAuth();
        return;
      }
      if (!r.ok || !r.data) return;
      setViewingOld(id);
      setLastFailed(false);
      setProviderError(null);
      renderMessages(r.data.messages || []);
    },
    [renderMessages, resetAuth],
  );

  const backToCurrent = useCallback(async (): Promise<void> => {
    setViewingOld(null);
    await loadState();
  }, [loadState]);

  const finishDay = useCallback(
    async (carry: string): Promise<boolean> => {
      const tok = tokenRef.current;
      if (!tok) return false;
      const r = await callApi<{ ended: boolean }>(tok, "POST", "/api/end-session", {
        carry_forward: carry || "",
      });
      if (r.status === 401) {
        resetAuth();
        return false;
      }
      if (!r.ok) return false;
      setEnded(true);
      setViewingOld(null);
      return true;
    },
    [resetAuth],
  );

  const deleteAll = useCallback(async (): Promise<boolean> => {
    const tok = tokenRef.current;
    if (!tok) return false;
    setDeleteError(null);
    const r = await callApi<{ deleted: boolean }>(tok, "POST", "/api/delete-all");
    const decision = decideDeleteAll(r);
    if (decision.resetAuth) {
      resetAuth();
      return true;
    }
    setDeleteError(decision.error);
    return false;
  }, [resetAuth]);

  return {
    hydrated,
    token,
    phase,
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
    enter,
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
