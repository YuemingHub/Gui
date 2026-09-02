import assert from "node:assert/strict";
import test from "node:test";
import { createIdentity, describeAuthFailure, spaceKey } from "./identity.ts";
import type { AuthApi, IdentityState } from "./identity.ts";

type Res = {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
  networkError: boolean;
};

type Responses = Partial<Record<keyof AuthApi, Res>>;

const ok = (status: number, data: Record<string, unknown>): Res => ({
  ok: true,
  status,
  data,
  networkError: false,
});
const fail = (status: number, data: Record<string, unknown>): Res => ({
  ok: false,
  status,
  data,
  networkError: false,
});
const down = (): Res => ({ ok: false, status: 0, data: null, networkError: true });

const ME_UNAUTHORIZED = fail(401, { authenticated: false });
const LOGIN_OK = ok(200, { participant_id: "p1", display_name: "阿明" });
const REGISTER_OK = ok(201, { participant_id: "p2", display_name: "小满", returning: false });
const LEGACY_OK = ok(200, { session_id: "s1", messages: [] });

/**
 * Every backend call goes through a recorder, so a test can prove not only which
 * endpoint ran but which one did not.
 */
function harness(responses: Responses = {}, initialToken: string | null = null) {
  const calls: string[] = [];
  let storedToken = initialToken;
  const notified: IdentityState[] = [];

  const pick = (key: keyof AuthApi, fallback: Res) => responses[key] ?? fallback;

  const api: AuthApi = {
    me: async () => {
      calls.push("GET /api/me");
      return pick("me", ME_UNAUTHORIZED) as never;
    },
    login: async () => {
      calls.push("POST /api/login");
      return pick("login", LOGIN_OK) as never;
    },
    register: async () => {
      calls.push("POST /api/register");
      return pick("register", REGISTER_OK) as never;
    },
    logout: async () => {
      calls.push("POST /api/logout");
      return pick("logout", ok(200, { ok: true })) as never;
    },
    // The legacy path is the only one that can reach /api/state with a bearer
    // token, and it is only reached from an explicit click.
    legacyState: async () => {
      calls.push("GET /api/state (bearer)");
      return pick("legacyState", LEGACY_OK) as never;
    },
  };

  const storage = {
    readToken: () => storedToken,
    removeToken: () => {
      storedToken = null;
    },
  };

  const identity = createIdentity(api, storage, (s) => notified.push(s));

  return {
    identity,
    calls,
    notified,
    state: () => identity.state(),
    token: () => storedToken,
    respond: (key: keyof AuthApi, res: Res) => {
      responses[key] = res;
    },
  };
}

test("没有服务端会话时停在门禁，并且一次也不请求 /api/state", async () => {
  const h = harness();
  await h.identity.bootstrap();

  assert.equal(h.state().phase, "gate");
  assert.equal(h.state().gateError, null);
  assert.deepEqual(h.calls, ["GET /api/me"]);
});

test("gui_token 存在也不再决定首屏：仍然只有 /api/me 说了算", async () => {
  const h = harness({}, "legacy-token");
  await h.identity.bootstrap();

  assert.equal(h.state().phase, "gate");
  assert.equal(h.state().legacyAvailable, true);
  assert.deepEqual(h.calls, ["GET /api/me"]);
  assert.equal(h.token(), "legacy-token", "旧 token 要留着，但不能拿它当身份");
});

test("/api/me 说已登录时直接进入对话", async () => {
  const h = harness({ me: ok(200, { authenticated: true, participant_id: "p1", display_name: "阿明" }) });
  await h.identity.bootstrap();

  assert.equal(h.state().phase, "chat");
  assert.equal(h.state().displayName, "阿明");
  assert.equal(h.state().legacyOpen, false);
});

test("/api/me 坏了也落在门禁，不会卡在永远转圈", async () => {
  const h = harness({ me: down() });
  await h.identity.bootstrap();

  assert.equal(h.state().phase, "gate");
  assert.equal(h.notified.length, 1);
});

test("登录成功进入对话，清掉 gui_token，之后可以退出", async () => {
  const h = harness({}, "legacy-token");
  const r = await h.identity.login({ login_id: "aming", password: "long-enough-1" });

  assert.equal(r.ok, true);
  assert.equal(h.state().phase, "chat");
  assert.equal(h.state().displayName, "阿明");
  assert.equal(h.token(), null);

  await h.identity.logout();
  assert.equal(h.state().phase, "gate");
  assert.deepEqual(h.calls, ["POST /api/login", "POST /api/logout"]);
});

test("登录失败只显示账号或密码不正确，并停在门禁", async () => {
  const h = harness({
    login: fail(401, { error: "invalid_credentials", message: "账号或密码不正确" }),
  });
  const r = await h.identity.login({ login_id: "aming", password: "wrong" });

  assert.equal(r.ok, false);
  assert.equal(r.error, "账号或密码不正确");
  assert.equal(h.state().gateError, "账号或密码不正确");
  assert.equal(h.state().phase, "gate");
});

test("登录失败的文案不透露账号是否存在", () => {
  const bare = describeAuthFailure(fail(401, { error: "invalid_credentials" }));
  assert.equal(bare, "账号或密码不正确");
});

test("注册成功（201）进入对话并清掉 gui_token", async () => {
  const h = harness({}, "legacy-token");
  const r = await h.identity.register({
    invite_code: "CODE-1",
    login_id: "xiaoman",
    password: "long-enough-2",
    display_name: "小满",
  });

  assert.equal(r.ok, true);
  assert.equal(h.state().phase, "chat");
  assert.equal(h.state().displayName, "小满");
  assert.equal(h.token(), null);
  assert.deepEqual(h.calls, ["POST /api/register"]);
});

test("注册撞上已占用账号名时给出独立一句", async () => {
  const h = harness({ register: fail(409, { error: "login_taken" }) });
  const r = await h.identity.register({
    invite_code: "CODE-1",
    login_id: "taken",
    password: "long-enough-1",
  });

  assert.equal(r.ok, false);
  assert.equal(h.state().phase, "gate");
  assert.equal(h.state().gateError, "这个账号名已经有人用了。换一个，或者直接登录那个账号。");
});

test("邀请码的三种失败各不相同", () => {
  assert.equal(
    describeAuthFailure(fail(403, { error: "invalid_code", reason: "invalid" })),
    "这个邀请码不对，或者已经不能用了。",
  );
  assert.equal(
    describeAuthFailure(fail(403, { error: "invalid_code", reason: "used" })),
    "这个邀请码已经被用过了。请向我要一个新的。",
  );
  assert.match(
    describeAuthFailure(fail(403, { error: "invalid_code", reason: "revoked" })),
    /邀请码/,
  );
});

test("注册的其他后端错误各自映射成一句人话", () => {
  assert.equal(
    describeAuthFailure(fail(400, { error: "invalid_login_id" })),
    "账号名不符合要求。用 3-32 个字母、数字、下划线或连字符。",
  );
  assert.match(describeAuthFailure(fail(400, { error: "weak_password" })), /密码/);
  assert.match(describeAuthFailure(fail(429, { error: "too_many_attempts" })), /试的次数太多/);
  assert.match(describeAuthFailure(down()), /没有连上服务器/);
  assert.match(describeAuthFailure(fail(500, { error: "credential_failed" })), /再试一次/);
});

test("旧浏览器入口要点一下才生效，点了之后进入旧空间", async () => {
  const h = harness({}, "legacy-token");
  await h.identity.bootstrap();
  assert.equal(h.state().phase, "gate", "没点之前只有门禁");

  const r = await h.identity.openLegacySpace();
  assert.equal(r.ok, true);
  assert.equal(h.state().phase, "chat");
  assert.equal(h.state().legacyOpen, true, "对话表面要据此提示绑定账号");
  assert.deepEqual(h.calls, ["GET /api/me", "GET /api/state (bearer)"]);
});

test("旧浏览器 token 已失效时回到门禁并清掉它", async () => {
  const h = harness({ legacyState: fail(401, { error: "unauthorized" }) }, "legacy-token");
  const r = await h.identity.openLegacySpace();

  assert.equal(r.ok, false);
  assert.equal(h.state().phase, "gate");
  assert.equal(h.token(), null);
});

test("没有旧 token 时按旧入口不会凭空进入对话", async () => {
  const h = harness();
  const r = await h.identity.openLegacySpace();

  assert.equal(r.ok, false);
  assert.equal(h.state().phase, "gate");
  assert.deepEqual(h.calls, []);
});

test("对话中任何 401 都退回门禁并清掉 gui_token", async () => {
  const h = harness({}, "legacy-token");
  await h.identity.openLegacySpace();
  assert.equal(h.state().phase, "chat");

  h.identity.invalidate();
  assert.equal(h.state().phase, "gate");
  assert.equal(h.token(), null);
  assert.equal(h.state().legacyAvailable, false);
});

test("退出一只调用 /api/logout，绝不结束会话也不删除数据", async () => {
  const h = harness();
  await h.identity.login({ login_id: "aming", password: "long-enough-1" });
  h.calls.length = 0;

  await h.identity.logout();

  assert.deepEqual(h.calls, ["POST /api/logout"]);
  assert.equal(
    h.calls.some((c) => c.includes("end-session") || c.includes("delete-all")),
    false,
    "退出不是结束今天，更不是删掉一条生命记录",
  );
  assert.equal(h.state().phase, "gate");
});

test("/api/me 说已登录时，顺手清掉这台浏览器上遗留的 gui_token", async () => {
  const h = harness(
    { me: ok(200, { authenticated: true, participant_id: "p1", display_name: "阿明" }) },
    "legacy-token",
  );
  await h.identity.bootstrap();

  assert.equal(h.state().phase, "chat");
  assert.equal(h.token(), null);
  assert.equal(h.state().legacyAvailable, false);
});

test("只点了旧浏览器入口时 gui_token 要留着，Founder 不能被锁在外面", async () => {
  const h = harness({}, "legacy-token");
  await h.identity.openLegacySpace();

  assert.equal(h.state().legacyOpen, true);
  assert.equal(h.token(), "legacy-token");
});

test("同一个人退出后换成另一个人：身份不残留，界面钥匙必须变", async () => {
  const h = harness();
  h.respond("login", ok(200, { participant_id: "p-alice", display_name: "阿明" }));
  await h.identity.login({ login_id: "aming", password: "long-enough-1" });
  const aliceKey = spaceKey(h.state());
  assert.equal(aliceKey, "p-alice");

  await h.identity.logout();
  assert.equal(h.state().phase, "gate");
  assert.equal(h.state().participantId, "", "门禁不替任何人站着");
  assert.equal(h.state().displayName, "");
  assert.equal(spaceKey(h.state()), "", "门禁态不允许挂着任何人的对话界面");

  h.respond("login", ok(200, { participant_id: "p-bob", display_name: "小满" }));
  await h.identity.login({ login_id: "xiaoman", password: "long-enough-1" });
  assert.equal(h.state().participantId, "p-bob");
  assert.notEqual(spaceKey(h.state()), aliceKey, "换了人就要重挂，不能延用上一份对话");
});

test("对话中会话失效：退回门禁并说明话没丢", async () => {
  const h = harness();
  await h.identity.login({ login_id: "aming", password: "long-enough-1" });

  h.identity.invalidate();

  assert.equal(h.state().phase, "gate");
  assert.match(h.state().gateError ?? "", /都还在/);
});

test("自己删完数据时关掉空间，但不谎称登录失效", async () => {
  const h = harness();
  await h.identity.login({ login_id: "aming", password: "long-enough-1" });

  h.identity.invalidate("deleted");

  assert.equal(h.state().phase, "gate");
  assert.equal(h.state().gateError, null);
});
