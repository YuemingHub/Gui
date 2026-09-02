// Thin client for the Return-to-oneself backend API. Gui owns only display,
// interaction and API calling — no product logic is duplicated here. The
// message array returned by the backend is always treated as the single source
// of conversation truth; the frontend never reconstructs session state from a
// local message list.

export type Role = "user" | "assistant";

export type MsgKind =
  | "user"
  | "assistant"
  | "normal"
  | "safety"
  | "opening"
  | "carry_ack";

export interface Message {
  role: Role;
  content: string;
  ts?: string;
  kind: MsgKind;
}

export interface SessionItem {
  id: string;
  started_at: string;
  ended_at: string | null;
  active: boolean;
  preview: string | null;
  message_count: number;
}

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  networkError: boolean;
}

const TOKEN_KEY = "gui_token";

function apiUrl(path: string): string {
  const origin = (process.env.NEXT_PUBLIC_RETURN_ORIGIN || "").replace(/\/$/, "");
  return origin + path;
}

export function loadStoredToken(): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable — session continues in memory only */
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export async function callApi<T = unknown>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(apiUrl(path), {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data, networkError: false };
  } catch {
    return { ok: false, status: 0, data: null, networkError: true };
  }
}

export async function enterWithCode(
  code: string,
): Promise<ApiResult<{ token: string; participant_id: string; returning: boolean }>> {
  try {
    const res = await fetch(apiUrl("/api/enter"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    let data: { token: string; participant_id: string; returning: boolean } | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data, networkError: false };
  } catch {
    return { ok: false, status: 0, data: null, networkError: true };
  }
}

export const PROVIDER_DOWN_MESSAGE =
  "暂时没有连上。你刚才说的话都在，没有丢。";
