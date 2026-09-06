// A stand-in for the Return runtime, faithful to the frozen contract in
// Return-to-oneself/docs/r0/GUI_RETURN_API_CONTRACT.md and web/server.js, plus a
// way to make each endpoint fail on purpose. Gui's job is display, interaction
// and API calling — so a scripted twin of the other side is enough to drive real
// browser journeys, and it is the only place these tests can say "the server
// said no" without shutting down a production machine.
//
// No provider key, no model, no data directory: nothing here can leak anything.

import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";

const COOKIE_NAME = "r0_session";
const LOGIN_ID_RE = /^[a-z0-9_-]{3,32}$/;
const PROVIDER_DOWN_MESSAGE = "暂时没有连上。你刚才说的话都在，没有丢。";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".woff2": "font/woff2",
};

function short(seed) {
  return createHash("sha256").update(seed).digest("hex").slice(0, 10);
}

export function createWorld() {
  return {
    /** one-time invite codes, as issued by `node operator.js invite` */
    invites: new Map([
      ["FOUND01", { label: "founder", used_by: null }],
      ["FRIEND", { label: "friend", used_by: null }],
      ["USED01", { label: "spent", used_by: "p-spent" }],
    ]),
    /** login_id -> { login_id, password, participant_id, display_name } */
    credentials: new Map(),
    /** cookie token -> participant_id */
    sessions: new Map(),
    /** participant_id -> { display_name, sessions: [...], active, ended } */
    participants: new Map(),
    /** seeded logins, so a journey can find the person it created */
    ids: {},
    /** what the far side does next */
    mode: {
      provider: "ok", // "ok" | "down"
      safetyNext: false,
      longReply: false,
      /** hold the reply open so a loading state can be seen and measured */
      replyDelayMs: 0,
      /** path -> status, consumed once: how a journey makes a button fail */
      failOnce: new Map(),
      /** path -> status, kept until cleared */
      failAlways: new Map(),
    },
    /** every API call in order, for assertions like "logout called once, alone" */
    calls: [],
  };
}

function ensureSession(world, pid) {
  const p = world.participants.get(pid);
  const open = p.active ? p.sessions.find((s) => s.id === p.active && !s.ended_at) : null;
  if (open) return open;
  const session = {
    id: "s" + short(pid + p.sessions.length + randomUUID()),
    started_at: new Date().toISOString(),
    ended_at: null,
    messages: [],
  };
  p.sessions.push(session);
  p.active = session.id;
  p.ended = false;
  return session;
}

function activeSession(world, pid) {
  const p = world.participants.get(pid);
  if (!p || !p.active || p.ended) return null;
  return p.sessions.find((s) => s.id === p.active && !s.ended_at) || null;
}

function sessionView(session) {
  const firstUser = session.messages.find((m) => m.role === "user");
  return {
    id: session.id,
    started_at: session.started_at,
    ended_at: session.ended_at,
    active: !session.ended_at,
    preview: firstUser ? firstUser.content.replace(/\s+/g, " ").trim().slice(0, 24) : null,
    message_count: session.messages.length,
  };
}

function replyTo(text, world) {
  if (world.mode.safetyNext) {
    world.mode.safetyNext = false;
    return {
      kind: "safety",
      content:
        "这句话里有你会受伤的部分。先停一下：如果这是正在发生的事，先联系一个能到场的人，而不是这里。",
    };
  }
  if (world.mode.longReply) {
    const para =
      "你说的这部分我听到了。它听起来不像一个待办，更像一件你一直在替别人背着的事。" +
      "如果先只看它属于你的那一段，你会注意到什么？不用一次说完，可以下一句再说。";
    return { kind: "normal", content: Array.from({ length: 6 }, (_, i) => `${i + 1}. ${para}`).join("\n\n") };
  }
  return { kind: "normal", content: `我听到了：「${text}」。这件事里，哪一部分是你真的想照看的？` };
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(data) });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 200_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function cookieToken(req) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function setCookie(res, token, maxAge) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`,
  );
}

/** Authenticated participant id, or null. */
function authed(world, req) {
  const token = cookieToken(req);
  if (!token) return null;
  return world.sessions.get(token) || null;
}

async function handleApi(world, req, res, url) {
  const body = ["POST", "PUT"].includes(req.method) ? await readBody(req) : {};
  const pid = authed(world, req);
  const path2 = url.pathname;
  world.calls.push({ method: req.method, path: path2, authed: Boolean(pid) });

  const failNow = (status) =>
    json(res, status, { error: "injected", message: "这里出了点问题，请稍后再试。" });

  // A key may end with "*" to cover a dynamic path (/api/sessions/*).
  const matched = [];
  for (const [key, status] of world.mode.failOnce) {
    if (key.endsWith("*") ? path2.startsWith(key.slice(0, -1)) : path2 === key) matched.push([key, status]);
  }
  for (const key of matched.map(([k]) => k)) world.mode.failOnce.delete(key);
  const injected =
    matched[0]?.[1] ??
    [...world.mode.failAlways].find(
      ([key]) => (key.endsWith("*") ? path2.startsWith(key.slice(0, -1)) : path2 === key),
    )?.[1];
  if (injected) return failNow(injected);

  const requireAuth = () => {
    if (pid) return true;
    json(res, 401, { error: "unauthorized" });
    return false;
  };

  if (req.method === "GET" && path2 === "/api/me") {
    if (!pid) return json(res, 401, { authenticated: false });
    const p = world.participants.get(pid);
    return json(res, 200, {
      authenticated: true,
      participant_id: pid,
      display_name: p?.display_name || "",
    });
  }

  if (req.method === "POST" && path2 === "/api/register") {
    const code = String(body.invite_code || "").trim().toUpperCase();
    const invite = world.invites.get(code);
    if (!invite) return json(res, 403, { error: "invalid_code", reason: "invalid" });
    if (invite.used_by) return json(res, 403, { error: "invalid_code", reason: "used" });
    const loginId = String(body.login_id || "").trim().toLowerCase();
    if (!LOGIN_ID_RE.test(loginId)) return json(res, 400, { error: "invalid_login_id" });
    const pw = String(body.password || "");
    if (pw.length < 10 || pw.length > 200) return json(res, 400, { error: "weak_password" });
    if (world.credentials.has(loginId)) return json(res, 409, { error: "login_taken" });

    const newId = "p" + short(loginId + randomUUID());
    world.participants.set(newId, {
      display_name: String(body.display_name || "").slice(0, 40),
      sessions: [],
      active: null,
      ended: false,
    });
    world.credentials.set(loginId, {
      login_id: loginId,
      password: pw,
      participant_id: newId,
      display_name: String(body.display_name || "").slice(0, 40),
    });
    invite.used_by = newId;
    const token = randomUUID();
    world.sessions.set(token, newId);
    setCookie(res, token, 60 * 60 * 24);
    return json(res, 201, {
      participant_id: newId,
      display_name: world.credentials.get(loginId).display_name,
      returning: false,
    });
  }

  if (req.method === "POST" && path2 === "/api/login") {
    const loginId = String(body.login_id || "").trim().toLowerCase();
    const cred = world.credentials.get(loginId);
    if (!cred || cred.password !== String(body.password || "")) {
      return json(res, 401, { error: "invalid_credentials", message: "账号或密码不正确" });
    }
    const token = randomUUID();
    world.sessions.set(token, cred.participant_id);
    setCookie(res, token, 60 * 60 * 24);
    return json(res, 200, {
      participant_id: cred.participant_id,
      display_name: cred.display_name,
    });
  }

  if (req.method === "POST" && path2 === "/api/logout") {
    const token = cookieToken(req);
    if (token) world.sessions.delete(token);
    setCookie(res, "", 0);
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && path2 === "/api/state") {
    if (!requireAuth()) return;
    const session = ensureSession(world, pid);
    const p = world.participants.get(pid);
    return json(res, 200, {
      returning: p.sessions.length > 1,
      ended: p.ended,
      session_id: session.id,
      messages: session.messages,
    });
  }

  if (req.method === "POST" && path2 === "/api/message") {
    if (!requireAuth()) return;
    const session = activeSession(world, pid);
    if (!session) return json(res, 409, { error: "no_active_session" });
    const text = String(body.text || "").trim();
    const retry = Boolean(body.retry);
    if (!retry && !text) return json(res, 400, { error: "empty_or_too_long" });

    const last = session.messages[session.messages.length - 1] || null;
    if (retry) {
      if (!last || last.role !== "user") return json(res, 409, { error: "nothing_to_retry" });
    } else {
      session.messages.push({ role: "user", content: text, kind: "user", ts: new Date().toISOString() });
    }

    if (world.mode.provider === "down") {
      // The turn stays stored: persistence and reply are different facts.
      return json(res, 503, { error: "provider_unavailable", message: PROVIDER_DOWN_MESSAGE });
    }
    if (world.mode.replyDelayMs > 0) {
      await new Promise((r) => setTimeout(r, world.mode.replyDelayMs));
    }
    const reply = replyTo(last && last.role === "user" ? last.content : text, world);
    const assistant = {
      role: "assistant",
      content: reply.content,
      kind: reply.kind,
      ts: new Date().toISOString(),
    };
    session.messages.push(assistant);
    return json(res, 200, { reply: reply.content, kind: reply.kind, messages: session.messages });
  }

  if (req.method === "POST" && path2 === "/api/end-session") {
    if (!requireAuth()) return;
    const session = activeSession(world, pid);
    if (!session) return json(res, 409, { error: "no_active_session" });
    session.ended_at = new Date().toISOString();
    const carry = String(body.carry_forward || "").trim().slice(0, 500);
    if (carry) {
      session.messages.push({ role: "assistant", content: `你带走的是：${carry}`, kind: "carry_ack", ts: new Date().toISOString() });
    }
    world.participants.get(pid).ended = true;
    return json(res, 200, { ended: true });
  }

  if (req.method === "GET" && path2 === "/api/sessions") {
    if (!requireAuth()) return;
    const p = world.participants.get(pid);
    return json(res, 200, { sessions: p.sessions.map(sessionView).reverse() });
  }

  if (req.method === "GET" && path2.startsWith("/api/sessions/")) {
    if (!requireAuth()) return;
    const id = decodeURIComponent(path2.slice("/api/sessions/".length));
    const p = world.participants.get(pid);
    const session = p.sessions.find((s) => s.id === id);
    if (!session) return json(res, 404, { error: "not_found" });
    return json(res, 200, { session_id: session.id, messages: session.messages });
  }

  if (req.method === "POST" && path2 === "/api/new-session") {
    if (!requireAuth()) return;
    const p = world.participants.get(pid);
    const current = activeSession(world, pid);
    if (current) current.ended_at = new Date().toISOString();
    p.ended = false;
    const session = ensureSession(world, pid);
    return json(res, 200, {
      returning: p.sessions.length > 1,
      session_id: session.id,
      messages: session.messages,
    });
  }

  if (req.method === "POST" && path2 === "/api/delete-all") {
    if (!requireAuth()) return;
    const token = cookieToken(req);
    if (token) world.sessions.delete(token);
    setCookie(res, "", 0);
    // The account stays (a person may come back); the life records do not.
    world.participants.set(pid, { display_name: "", sessions: [], active: null, ended: false });
    return json(res, 200, { deleted: true });
  }

  return json(res, 404, { error: "not_found" });
}

/** Seed the two people the journeys switch between, so login can be tested. */
export function seedAccounts(world) {
  for (const [loginId, displayName] of [
    ["aming", "阿明"],
    ["xiaoman", "小满"],
  ]) {
    const pid = "p" + short(loginId);
    world.ids[loginId] = pid;
    world.participants.set(pid, { display_name: displayName, sessions: [], active: null, ended: false });
    world.credentials.set(loginId, {
      login_id: loginId,
      password: "long-enough-1",
      participant_id: pid,
      display_name: displayName,
    });
  }
}

export async function startHarness({ dir, port = 0 }) {
  if (!existsSync(path.join(dir, "index.html"))) {
    throw new Error(`没有 ${path.join(dir, "index.html")} —— 先跑 npm run build`);
  }
  const world = createWorld();
  seedAccounts(world);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      try {
        await handleApi(world, req, res, url);
      } catch (e) {
        if (!res.headersSent) json(res, 500, { error: "internal" });
        console.error("[harness] api error", e);
      }
      return;
    }

    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(dir, path.normalize(rel).replace(/^([/\\])+/, ""));
    if (!file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(file).pipe(res);
  });

  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const bound = server.address().port;
  const origin = `http://127.0.0.1:${bound}`;

  const reset = () => {
    world.calls.length = 0;
    world.mode.provider = "ok";
    world.mode.safetyNext = false;
    world.mode.longReply = false;
    world.mode.replyDelayMs = 0;
    world.mode.failOnce.clear();
    world.mode.failAlways.clear();
    // Accounts stay; each journey starts with an empty history, so a number in
    // an assertion means what this journey made it mean.
    for (const p of world.participants.values()) {
      p.sessions = [];
      p.active = null;
      p.ended = false;
    }
  };

  return {
    origin,
    world,
    reset,
    paths: () => world.calls.map((c) => c.method + " " + c.path),
    /** make the next call to this endpoint answer with `status` (a trailing * matches a prefix) */
    failOnce: (p, status = 500) => world.mode.failOnce.set(p, status),
    failAlways: (p, status = 500) => world.mode.failAlways.set(p, status),
    stopFailures: () => world.mode.failAlways.clear(),
    /** hold replies open so a loading state can be seen and measured */
    slowReply: (ms = 1500) => {
      world.mode.replyDelayMs = ms;
    },
    /** drop every server session of a person: the cookie now points at nothing */
    expireSessionsOf: (pid) => {
      for (const [token, value] of world.sessions) if (value === pid) world.sessions.delete(token);
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
