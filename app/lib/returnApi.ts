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

// The session is a server-owned HttpOnly cookie (`r0_session`). The browser
// holds it; this file never reads it and never puts it in a header. localStorage
// no longer decides who you are — `/api/me` does.
function returnOrigin(): string {
  const origin = process.env.NEXT_PUBLIC_RETURN_ORIGIN || "";
  return origin.replace(/\/$/, "");
}

function apiUrl(path: string): string {
  return returnOrigin() + path;
}

// Production is same-origin (nginx serves Gui and /api from one origin), which
// is also the safe default. Only an explicitly configured cross-origin
// RETURN_ORIGIN makes the browser carry the session cookie across origins.
function apiCredentials(): RequestCredentials {
  const origin = returnOrigin();
  if (!origin || typeof window === "undefined") return "same-origin";
  return origin === window.location.origin ? "same-origin" : "include";
}

// Legacy only: the bearer token an older build of this app left behind. Nothing
// writes it any more — it is read for the Founder's escape hatch and cleared.
const TOKEN_KEY = "gui_token";

export function loadStoredToken(): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

async function request<T>(
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(apiUrl(path), {
      method,
      headers,
      credentials: apiCredentials(),
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

const JSON_HEADERS = { "Content-Type": "application/json" };

/** Every authenticated call goes through here: cookie session, no Authorization. */
export async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  return request<T>(path, method, { ...JSON_HEADERS }, body);
}

/**
 * The one and only place that still attaches `Authorization`. It exists for the
 * Founder's pre-existing browser session while the account migration is running.
 */
export async function apiWithLegacyToken<T = unknown>(
  token: string,
  method: string,
  path: string,
): Promise<ApiResult<T>> {
  return request<T>(path, method, {
    ...JSON_HEADERS,
    Authorization: "Bearer " + token,
  });
}

export interface LoginInput {
  login_id: string;
  password: string;
}

export interface RegisterInput {
  invite_code: string;
  login_id: string;
  password: string;
  display_name?: string;
}

/** Success and failure bodies share one loose shape; `identity.ts` narrows it. */
export interface AccountResponse {
  participant_id?: string;
  display_name?: string;
  returning?: boolean;
  ok?: boolean;
  error?: string;
  reason?: string;
  message?: string;
}

export interface MeResponse {
  authenticated?: boolean;
  participant_id?: string;
  display_name?: string;
  error?: string;
}

export function fetchMe(): Promise<ApiResult<MeResponse>> {
  return api<MeResponse>("GET", "/api/me");
}

export function loginWithAccount(input: LoginInput): Promise<ApiResult<AccountResponse>> {
  return api<AccountResponse>("POST", "/api/login", input);
}

export function registerWithInvite(input: RegisterInput): Promise<ApiResult<AccountResponse>> {
  return api<AccountResponse>("POST", "/api/register", input);
}

export function logoutSession(): Promise<ApiResult<AccountResponse>> {
  return api<AccountResponse>("POST", "/api/logout");
}

/** Legacy escape hatch probe: read the old bearer session before entering chat. */
export interface LegacyStateResponse {
  participant_id?: string;
  session_id?: string;
  messages?: Message[];
}

export function probeLegacyToken(token: string): Promise<ApiResult<LegacyStateResponse>> {
  return apiWithLegacyToken<LegacyStateResponse>(token, "GET", "/api/state");
}

export const PROVIDER_DOWN_MESSAGE =
  "暂时没有连上。你刚才说的话都在，没有丢。";
