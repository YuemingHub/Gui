// Identity state machine, kept free of React and of fetch so it can be tested
// with a scripted transport. The rule it encodes: the HttpOnly session cookie is
// the only source of truth about who is using this space. A token left in
// localStorage by an older build may open the door once, but only after an
// explicit click — and it never decides what the first screen is.

import type { ApiResult, LoginInput, MeResponse, RegisterInput } from "./returnApi";

export type Phase = "loading" | "gate" | "chat";

/** The subset of the auth API this machine needs; injectable for tests. */
export interface AuthApi {
  me(): Promise<ApiResult<MeResponse>>;
  login(input: LoginInput): Promise<ApiResult<unknown>>;
  register(input: RegisterInput): Promise<ApiResult<unknown>>;
  logout(): Promise<ApiResult<unknown>>;
  /** The single legacy-bearer call: read the pre-account space of this browser. */
  legacyState(token: string): Promise<ApiResult<unknown>>;
}

export interface IdentityStorage {
  readToken(): string | null;
  removeToken(): void;
}

export interface IdentityState {
  phase: Phase;
  /** `participant_id` — the person this state is standing for. Empty at the gate. */
  participantId: string;
  displayName: string;
  gateError: string | null;
  /** True only while the Founder is inside the legacy browser space. */
  legacyOpen: boolean;
  /**
   * True when this browser still holds a pre-account token, so the gate may
   * offer the legacy way in. It never chooses the surface by itself.
   */
  legacyAvailable: boolean;
}

/**
 * React key for the open space. It must change the moment a different person is
 * inside, so an already-rendered transcript cannot survive the switch.
 */
export function spaceKey(state: IdentityState | null): string {
  if (!state || state.phase !== "chat") return "";
  return state.participantId || (state.legacyOpen ? "legacy-browser" : "space");
}

export interface IdentityResult {
  ok: boolean;
  error: string | null;
}

const NETWORK_FAILURE = "没有连上服务器。请检查网络后再试一次。";
const UNKNOWN_FAILURE = "这里出了点问题。请再试一次。";
const CREDENTIAL_FAILURE = "账号或密码不正确";
const NO_LEGACY_SPACE = "这台浏览器上原来的空间已经不能用了。请用账号进入。";
const SESSION_EXPIRED = "这里的登录刚刚失效了。请重新进入。你说过的话都还在。";

/**
 * One short human line per backend failure. Login never explains which half of
 * the credential was wrong, because the backend deliberately does not either.
 */
export function describeAuthFailure(result: ApiResult<unknown>): string {
  if (result.networkError) return NETWORK_FAILURE;
  const data = (result.data ?? {}) as {
    error?: string;
    reason?: string;
    message?: string;
  };
  if (typeof data.message === "string" && data.error === "invalid_credentials") {
    return data.message;
  }
  switch (data.error) {
    case "invalid_credentials":
      return CREDENTIAL_FAILURE;
    case "invalid_code":
      return data.reason === "used"
        ? "这个邀请码已经被用过了。请向我要一个新的。"
        : "这个邀请码不对，或者已经不能用了。";
    case "login_taken":
      return "这个账号名已经有人用了。换一个，或者直接登录那个账号。";
    case "invalid_login_id":
      return "账号名不符合要求。用 3-32 个字母、数字、下划线或连字符。";
    case "weak_password":
      return "这个密码不够长。请至少用 10 个字符。";
    case "too_many_attempts":
      return "试的次数太多了。请等一会儿再来。";
    case "cross_origin":
      return "这个请求不能从这里发出。请刷新页面后再试。";
    default:
      return UNKNOWN_FAILURE;
  }
}

function okWithId(result: ApiResult<unknown>): boolean {
  const data = (result.data ?? {}) as { participant_id?: unknown };
  return result.ok && typeof data.participant_id === "string" && data.participant_id !== "";
}

/** Why the space closed: an expired session needs saying, a deletion does not. */
export type InvalidationCause = "expired" | "deleted";

export function createIdentity(
  api: AuthApi,
  storage: IdentityStorage,
  onChange: (state: IdentityState) => void,
): {
  state: () => IdentityState;
  bootstrap: () => Promise<void>;
  login: (input: LoginInput) => Promise<IdentityResult>;
  register: (input: RegisterInput) => Promise<IdentityResult>;
  openLegacySpace: () => Promise<IdentityResult>;
  logout: () => Promise<void>;
  invalidate: (cause?: InvalidationCause) => void;
} {
  let state: IdentityState = {
    phase: "loading",
    participantId: "",
    displayName: "",
    gateError: null,
    legacyOpen: false,
    legacyAvailable: false,
  };

  const commit = (patch: Partial<IdentityState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };

  const peekLegacyToken = (): string | null => {
    try {
      return storage.readToken();
    } catch {
      return null;
    }
  };

  const dropLegacyToken = () => {
    try {
      storage.removeToken();
    } catch {
      /* storage unavailable — nothing to clear */
    }
  };

  const gateState = (gateError: string | null): IdentityState => ({
    phase: "gate",
    participantId: "",
    displayName: "",
    gateError,
    legacyOpen: false,
    legacyAvailable: Boolean(peekLegacyToken()),
  });

  const chatState = (
    participantId: string,
    displayName: string,
    legacyOpen: boolean,
  ): IdentityState => ({
    phase: "chat",
    participantId,
    displayName,
    gateError: null,
    legacyOpen,
    legacyAvailable: Boolean(peekLegacyToken()),
  });

  const nameOf = (result: ApiResult<unknown>): string => {
    const data = (result.data ?? {}) as { display_name?: unknown };
    return typeof data.display_name === "string" ? data.display_name : "";
  };

  const idOf = (result: ApiResult<unknown>): string => {
    const data = (result.data ?? {}) as { participant_id?: unknown };
    return typeof data.participant_id === "string" ? data.participant_id : "";
  };

  return {
    state: () => state,

    // The cookie decides. Anything other than authenticated:true shows the gate;
    // a stored gui_token is never consulted here.
    async bootstrap() {
      try {
        const r = await api.me();
        const data = (r.data ?? {}) as { authenticated?: boolean };
        if (r.ok && data.authenticated === true) {
          // A real account now owns this identity, so the browser token is spent.
          dropLegacyToken();
          commit(chatState(idOf(r), nameOf(r), false));
          return;
        }
        commit(gateState(null));
      } catch {
        // A broken check must still leave a way in, not a permanent loading screen.
        commit(gateState(null));
      }
    },

    async login(input) {
      const r = await api.login(input);
      if (!r.ok || !okWithId(r)) {
        const error = describeAuthFailure(r);
        commit(gateState(error));
        return { ok: false, error };
      }
      // A cookie session now owns the identity, so the old browser token goes.
      dropLegacyToken();
      commit(chatState(idOf(r), nameOf(r), false));
      return { ok: true, error: null };
    },

    async register(input) {
      const r = await api.register(input);
      if (!r.ok || !okWithId(r)) {
        const error = describeAuthFailure(r);
        commit(gateState(error));
        return { ok: false, error };
      }
      dropLegacyToken();
      commit(chatState(idOf(r), nameOf(r), false));
      return { ok: true, error: null };
    },

    // Requires a click. The gate is always rendered first; this only runs after
    // the Founder pressed the button, and it proves the bearer token still works.
    async openLegacySpace() {
      const token = peekLegacyToken();
      if (!token) {
        commit(gateState(NO_LEGACY_SPACE));
        return { ok: false, error: NO_LEGACY_SPACE };
      }
      const r = await api.legacyState(token);
      if (r.status === 401) {
        dropLegacyToken();
        commit(gateState(NO_LEGACY_SPACE));
        return { ok: false, error: NO_LEGACY_SPACE };
      }
      if (!r.ok) {
        const error = describeAuthFailure(r);
        commit(gateState(error));
        return { ok: false, error };
      }
      // The token stays on purpose: until this space has a credential, deleting it
      // would lock the Founder out with no way back.
      commit(chatState(idOf(r), "", true));
      return { ok: true, error: null };
    },

    // Logging out is not ending the conversation and not deleting anything.
    async logout() {
      try {
        await api.logout();
      } catch {
        /* the server session is gone either way; nothing local is kept */
      }
      dropLegacyToken();
      commit(gateState(null));
    },

    // Any 401 from the Life API while inside chat means the session is gone.
    invalidate(cause: InvalidationCause = "expired") {
      const wasLegacy = state.legacyOpen;
      dropLegacyToken();
      commit(
        gateState(
          wasLegacy
            ? NO_LEGACY_SPACE
            : cause === "expired"
              ? SESSION_EXPIRED
              : null,
        ),
      );
    },
  };
}
