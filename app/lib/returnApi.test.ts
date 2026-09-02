// Request-layer tests: a scripted Return backend behind a mocked fetch, plus a
// fake browser that can only hold what page JS can hold. This is where the
// identity claim is proved end to end for the frontend: the session is an
// HttpOnly cookie, nothing readable by JavaScript decides who you are, and the
// only request that may carry Authorization is the Founder's legacy probe.

import assert from "node:assert/strict";
import test from "node:test";
import {
  api,
  clearStoredToken,
  fetchMe,
  loadStoredToken,
  loginWithAccount,
  logoutSession,
  probeLegacyToken,
  registerWithInvite,
} from "./returnApi.ts";
import { createIdentity } from "./identity.ts";

const BROWSER_ORIGIN = "https://ymai.me";
const CROSS_ORIGIN = "https://elsewhere.test";

type Msg = { role: string; content: string; kind: string };
type Body = Record<string, unknown>;

type Person = {
  id: string;
  login_id: string;
  password: string;
  display_name: string;
  messages: Msg[];
};

type Recorded = {
  method: string;
  url: string;
  credentials: string | undefined;
  authorization: string | null;
};

// ————— fake browser: localStorage + cookies page JS can see —————

const localStore = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string): string | null => {
    const value = localStore.get(key);
    return value === undefined ? null : value;
  },
  setItem: (key: string, value: string): void => {
    localStore.set(key, value);
  },
  removeItem: (key: string): void => {
    localStore.delete(key);
  },
};

/** Names of cookies visible to document.cookie, i.e. not HttpOnly. */
let jsVisibleCookies: string[] = [];
/** The session cookie itself: held by the browser, never readable by page JS. */
let cookieJar: string | null = null;
let requests: Recorded[] = [];

// ————— fake Return backend —————

let people: Person[] = [];
let sessions = new Map<string, string>();
let legacyTokens = new Map<string, string>();
let invites = new Map<string, "valid" | "used" | "revoked">();
let sessionCounter = 0;

function resetWorld(): void {
  localStore.clear();
  jsVisibleCookies = [];
  cookieJar = null;
  requests = [];
  sessionCounter = 0;
  sessions = new Map();
  legacyTokens = new Map([["legacy-founder-token", "p-founder"]]);
  invites = new Map([
    ["CODE-NEW", "valid"],
    ["CODE-USED", "used"],
    ["CODE-GONE", "revoked"],
  ]);
  people = [
    {
      id: "p-alice",
      login_id: "aming",
      password: "long-enough-1",
      display_name: "阿明",
      messages: [],
    },
    {
      id: "p-bob",
      login_id: "xiaoman",
      password: "long-enough-2",
      display_name: "小满",
      messages: [],
    },
  ];
}

const personOf = (id: string): Person | undefined =>
  people.find((p) => p.id === id);

function handle(
  method: string,
  path: string,
  body: Body,
  authorization: string | null,
): { status: number; body: Body; setCookie?: string } {
  const bearer = authorization?.startsWith("Bearer ")
    ? legacyTokens.get(authorization.slice(7))
    : undefined;
  const sessionPerson = cookieJar ? sessions.get(cookieJar) : undefined;
  const me = sessionPerson ?? bearer;

  const openSession = (personId: string): string => {
    sessionCounter += 1;
    const id = `s${sessionCounter}`;
    sessions.set(id, personId);
    return `r0_session=${id}; HttpOnly; SameSite=Strict; Path=/; Secure`;
  };

  if (path === "/api/me") {
    return sessionPerson
      ? {
          status: 200,
          body: {
            authenticated: true,
            participant_id: sessionPerson,
            display_name: personOf(sessionPerson)?.display_name ?? "",
          },
        }
      : { status: 401, body: { authenticated: false } };
  }

  if (path === "/api/login") {
    const found = people.find(
      (p) => p.login_id === body.login_id && p.password === body.password,
    );
    if (!found) {
      return {
        status: 401,
        body: { error: "invalid_credentials", message: "账号或密码不正确" },
      };
    }
    return {
      status: 200,
      body: { participant_id: found.id, display_name: found.display_name },
      setCookie: openSession(found.id),
    };
  }

  if (path === "/api/register") {
    const code = String(body.invite_code ?? "");
    const state = invites.get(code);
    if (!state) return { status: 403, body: { error: "invalid_code", reason: "invalid" } };
    if (state !== "valid") {
      return { status: 403, body: { error: "invalid_code", reason: state } };
    }
    if (!/^[a-z0-9_-]{3,32}$/.test(String(body.login_id ?? ""))) {
      return { status: 400, body: { error: "invalid_login_id" } };
    }
    if (String(body.password ?? "").length < 10) {
      return { status: 400, body: { error: "weak_password" } };
    }
    if (people.some((p) => p.login_id === body.login_id)) {
      return { status: 409, body: { error: "login_taken" } };
    }
    const person: Person = {
      id: `p-${people.length + 1}`,
      login_id: String(body.login_id),
      password: String(body.password),
      display_name: String(body.display_name || body.login_id),
      messages: [],
    };
    people.push(person);
    invites.set(code, "used");
    return {
      status: 201,
      body: { participant_id: person.id, display_name: person.display_name, returning: false },
      setCookie: openSession(person.id),
    };
  }

  if (path === "/api/logout") {
    if (cookieJar) sessions.delete(cookieJar);
    cookieJar = null;
    return {
      status: 200,
      body: { ok: true },
      setCookie: "r0_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    };
  }

  if (path === "/api/enter") {
    const token = `issued-${String(body.code ?? "")}`;
    legacyTokens.set(token, "p-founder");
    return { status: 200, body: { token, participant_id: "p-founder", returning: false } };
  }

  if (!me) {
    return { status: 401, body: { error: "unauthorized" } };
  }
  const person = personOf(me);

  if (path === "/api/state") {
    return {
      status: 200,
      body: {
        returning: false,
        ended: false,
        session_id: "sess-1",
        participant_id: me,
        messages: person?.messages ?? [],
      },
    };
  }

  if (path === "/api/message") {
    if (person) {
      person.messages.push({ role: "user", content: String(body.text ?? ""), kind: "user" });
      person.messages.push({ role: "assistant", content: "我在", kind: "assistant" });
    }
    return { status: 200, body: { reply: "我在", kind: "normal", messages: person?.messages ?? [] } };
  }

  if (path === "/api/end-session") {
    return { status: 200, body: { ended: true } };
  }

  if (path === "/api/delete-all") {
    if (person) person.messages = [];
    return { status: 200, body: { deleted: true } };
  }

  return { status: 404, body: { error: "not_found" } };
}

function installBrowser(): void {
  const win = {
    localStorage: localStorageStub,
    location: { origin: BROWSER_ORIGIN },
  };
  const globals = globalThis as Record<string, unknown>;
  globals.window = win;
  globals.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<unknown> => {
    const raw = String(input);
    const url = raw.replace(BROWSER_ORIGIN, "").replace(CROSS_ORIGIN, "");
    const headers = { ...((init?.headers ?? {}) as Record<string, string>) };
    const authorization = headers.Authorization ?? headers.authorization ?? null;
    requests.push({
      method: String(init?.method ?? "GET"),
      url: raw,
      credentials: init?.credentials,
      authorization,
    });
    if (cookieJar) headers.cookie = "r0_session=" + cookieJar;

    let body: Body = {};
    if (typeof init?.body === "string") {
      body = JSON.parse(init.body) as Body;
    }
    const result = handle(
      String(init?.method ?? "GET"),
      url.split("?")[0],
      body,
      authorization,
    );
    if (result.setCookie) {
      const [cookie] = result.setCookie.split(";");
      const cleared = /Max-Age=0/.test(result.setCookie);
      cookieJar = cleared ? null : cookie.slice("r0_session=".length);
      if (!/HttpOnly/i.test(result.setCookie)) {
        jsVisibleCookies.push(cookie.split("=")[0]);
      }
    }
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
    };
  };
}

function identityHarness() {
  return createIdentity(
    {
      me: fetchMe,
      login: loginWithAccount,
      register: registerWithInvite,
      logout: logoutSession,
      legacyState: probeLegacyToken,
    },
    { readToken: loadStoredToken, removeToken: clearStoredToken },
    () => undefined,
  );
}

/** The exact call the chat surface makes when it opens a space. */
async function readSpace(): Promise<Record<string, unknown> | null> {
  const r = await api<{ messages?: Msg[] }>("GET", "/api/state");
  return r.ok ? ((r.data ?? {}) as Record<string, unknown>) : null;
}

const paths = (): string[] => requests.map((r) => r.url);

installBrowser();
resetWorld();

test("未登录时 /api/me 是 401，请求同源相对路径、带 cookie、不带 Authorization", async () => {
  resetWorld();
  const r = await fetchMe();

  assert.equal(r.status, 401);
  assert.equal(r.ok, false);
  assert.deepEqual(requests, [
    { method: "GET", url: "/api/me", credentials: "same-origin", authorization: null },
  ]);
});

test("登录只换来一枚 HttpOnly cookie，JS 读不到任何身份", async () => {
  resetWorld();
  const r = await loginWithAccount({ login_id: "aming", password: "long-enough-1" });

  assert.equal(r.status, 200);
  assert.equal(r.data?.participant_id, "p-alice");
  assert.equal(jsVisibleCookies.length, 0, "会话 cookie 必须是 HttpOnly 的");
  assert.equal(localStore.size, 0, "localStorage 里不许留下任何身份");
});

test("配置了跨源 RETURN_ORIGIN 才用 include，并带上绝对地址", async () => {
  resetWorld();
  process.env.NEXT_PUBLIC_RETURN_ORIGIN = CROSS_ORIGIN;
  try {
    await fetchMe();
    assert.deepEqual(requests, [
      {
        method: "GET",
        url: `${CROSS_ORIGIN}/api/me`,
        credentials: "include",
        authorization: null,
      },
    ]);
  } finally {
    delete process.env.NEXT_PUBLIC_RETURN_ORIGIN;
  }
});

test("无 cookie 的页面加载落在门禁，一次也不碰 /api/state", async () => {
  resetWorld();
  const identity = identityHarness();
  await identity.bootstrap();

  assert.equal(identity.state().phase, "gate");
  assert.deepEqual(paths(), ["/api/me"]);
});

test("cookie 有效的页面加载进入对话，并顺手清掉遗留的 gui_token", async () => {
  resetWorld();
  const first = identityHarness();
  await first.login({ login_id: "aming", password: "long-enough-1" });
  localStore.set("gui_token", "legacy-founder-token");

  requests = [];
  const second = identityHarness();
  await second.bootstrap();

  assert.equal(second.state().phase, "chat");
  assert.equal(second.state().participantId, "p-alice");
  assert.deepEqual(paths(), ["/api/me"]);
  assert.equal(localStore.has("gui_token"), false);
});

test("gui_token 存在时页面加载仍是门禁，点了才走唯一一条 bearer 路", async () => {
  resetWorld();
  localStore.set("gui_token", "legacy-founder-token");
  const identity = identityHarness();
  await identity.bootstrap();
  assert.equal(identity.state().phase, "gate");
  assert.deepEqual(paths(), ["/api/me"]);

  const r = await identity.openLegacySpace();

  assert.equal(r.ok, true);
  assert.equal(identity.state().phase, "chat");
  assert.deepEqual(paths(), ["/api/me", "/api/state"]);
  const legacy = requests[1];
  assert.equal(legacy.authorization, "Bearer legacy-founder-token");
  assert.equal(localStore.has("gui_token"), true, "Founder 没绑定凭据前不能把他锁在外面");
});

test("旧浏览器空间之后的调用也只带 Authorization，其余请求一律不带", async () => {
  resetWorld();
  localStore.set("gui_token", "legacy-founder-token");
  const identity = identityHarness();
  await identity.openLegacySpace();
  const token = loadStoredToken();
  await api("GET", "/api/state");
  await probeLegacyToken(token ?? "unused");

  const withAuth = requests.filter((r) => r.authorization !== null);
  assert.equal(withAuth.length, 2, "只有旧 bearer 路带 Authorization");
  assert.equal(
    withAuth.every((r) => r.authorization === "Bearer legacy-founder-token"),
    true,
  );
});

test("登录失败给出服务器那句原话，并停在门禁", async () => {
  resetWorld();
  const identity = identityHarness();
  const r = await identity.login({ login_id: "aming", password: "wrong-password" });

  assert.equal(r.ok, false);
  assert.equal(r.error, "账号或密码不正确");
  assert.equal(identity.state().phase, "gate");
  assert.equal(localStore.size, 0);
});

test("注册用过被用掉的邀请码时给出对应一句，不创建第二个人", async () => {
  resetWorld();
  const identity = identityHarness();
  const r = await identity.register({
    invite_code: "CODE-USED",
    login_id: "newcomer",
    password: "long-enough-9",
  });

  assert.equal(r.ok, false);
  assert.match(r.error ?? "", /邀请码已经被用过了/);
  assert.equal(identity.state().phase, "gate");
  assert.equal(people.some((p) => p.login_id === "newcomer"), false);
});

test("注册成功后进入对话，gui_token 不再有用", async () => {
  resetWorld();
  localStore.set("gui_token", "legacy-founder-token");
  const identity = identityHarness();
  const r = await identity.register({
    invite_code: "CODE-NEW",
    login_id: "newcomer",
    password: "long-enough-9",
    display_name: "新来的",
  });

  assert.equal(r.ok, true);
  assert.equal(identity.state().phase, "chat");
  assert.equal(localStore.has("gui_token"), false);
  assert.equal(
    requests.every((req) => req.authorization === null),
    true,
  );
});

test("退出只发 /api/logout，随后 /api/state 就是 401", async () => {
  resetWorld();
  const identity = identityHarness();
  await identity.login({ login_id: "aming", password: "long-enough-1" });
  await api("POST", "/api/message", { text: "阿明的话", retry: false });
  requests = [];

  await identity.logout();

  assert.deepEqual(paths(), ["/api/logout"]);
  assert.equal(
    paths().some((p) => p === "/api/end-session" || p === "/api/delete-all"),
    false,
    "退出不是结束今天，也不是删数据",
  );
  assert.equal(identity.state().phase, "gate");
  assert.equal((await api("GET", "/api/state")).status, 401);
});

test("阿明退出后小满进来，第一次读到的空间里没有阿明的一句话", async () => {
  resetWorld();
  const alice = identityHarness();
  await alice.login({ login_id: "aming", password: "long-enough-1" });
  await api("POST", "/api/message", { text: "只有阿明说过的秘密", retry: false });
  await alice.logout();

  const bob = identityHarness();
  await bob.login({ login_id: "xiaoman", password: "long-enough-2" });
  const space = await readSpace();

  assert.equal(bob.state().participantId, "p-bob");
  assert.equal(JSON.stringify(space ?? {}).includes("只有阿明说过的秘密"), false);
  assert.deepEqual((space?.messages ?? []) as Msg[], []);
});

test("对话中 /api/state 返回 401 时退回门禁", async () => {
  resetWorld();
  const identity = identityHarness();
  await identity.login({ login_id: "aming", password: "long-enough-1" });
  assert.equal(identity.state().phase, "chat");

  sessions.clear(); // the server-side session dies while the person is inside
  const r = await api("GET", "/api/state");
  assert.equal(r.status, 401);
  identity.invalidate();

  assert.equal(identity.state().phase, "gate");
  assert.match(identity.state().gateError ?? "", /都还在/);
});
