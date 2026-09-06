#!/usr/bin/env node
// Real browser journeys for the conversation space, driven against a scripted
// twin of the Return API (e2e/harness.mjs). No framework, no fixture tree:
// one file, one pass/fail table, and screenshots a person can actually look at.
//
//   npm run e2e                  headless (builds out/ first)
//   npm run e2e:headed           watch it with your own eyes
//   npm run e2e -- --no-build    reuse the existing out/
//   npm run e2e -- --only 抽屉    run one journey by name
//
// Evidence: e2e/evidence/journeys.json + e2e/evidence/screens/*.png

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { startHarness } from "./harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT = path.join(ROOT, "out");
const EVIDENCE = path.join(HERE, "evidence");
const SCREENS = path.join(EVIDENCE, "screens");

const HEADED = process.argv.includes("--headed");
const SKIP_BUILD = process.argv.includes("--no-build");
const onlyIndex = process.argv.indexOf("--only");
const ONLY_NAME = onlyIndex > -1 ? process.argv[onlyIndex + 1] || "" : "";

const PASSWORD = "long-enough-1";
const slug = (s) => s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 48);

let harness = null;
let current = null;

// ---------------------------------------------------------------- build step

function build() {
  return new Promise((resolve, reject) => {
    // The agent harness around this shell exports its own __NEXT_PRIVATE_*
    // variables; inheriting them makes Next ignore this repository's config.
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (key.startsWith("__NEXT_PRIVATE") || key === "NEXT_DEPLOYMENT_ID" || key === "PORT") {
        delete env[key];
      }
    }
    env.NEXT_PUBLIC_BASE_PATH = "";
    const child = spawn("npm", ["run", "build"], { cwd: ROOT, env, stdio: "inherit", shell: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("npm run build 失败：" + code))));
  });
}

// ------------------------------------------------------------- mini runner

const results = [];

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function journey(name, fn) {
  if (ONLY_NAME && !name.includes(ONLY_NAME)) return;
  const context = await current.browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const seen = { api: [], media: [], errors: [], consoleErrors: [] };
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.pathname.startsWith("/api/")) {
      seen.api.push({ method: r.method(), path: url.pathname, post: r.postData() });
    } else if (/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(url.pathname)) {
      seen.media.push(url.pathname);
    }
  });
  page.on("pageerror", (e) => seen.errors.push(String(e.message)));
  page.on("console", (m) => {
    // A 401 from /api/me is the question "am I here?" answered honestly; only an
    // uncaught exception (pageerror above) counts as the app being broken.
    if (m.type() === "error") seen.consoleErrors.push(m.text());
  });

  const previous = current;
  current = { ...previous, page, context, seen, name };
  const started = Date.now();
  try {
    await fn(page, context, seen);
    results.push({
      name,
      pass: true,
      ms: Date.now() - started,
      // Kept for the report: a 401 on /api/me is an honest question, not a bug.
      consoleErrors: seen.consoleErrors.length ? seen.consoleErrors : undefined,
    });
    console.log(`  PASS  ${name}`);
  } catch (e) {
    results.push({ name, pass: false, ms: Date.now() - started, error: String(e?.message || e) });
    console.log(`  FAIL  ${name}\n        ${String(e?.message || e).split("\n")[0]}`);
    await shoot(page, "FAIL-" + slug(name));
  } finally {
    current = previous;
    await context.close();
  }
}

async function shoot(page, name) {
  try {
    await page.screenshot({ path: path.join(SCREENS, name + ".png") });
  } catch {
    /* a screenshot never decides the result */
  }
}

// ------------------------------------------------------------- page helpers

const composer = (page) => page.getByLabel("要说的话");
const plain = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const drawer = (page) => page.getByRole("dialog");

async function openGate(page) {
  await page.goto(harness.origin + "/", { waitUntil: "load" });
  await page.getByRole("heading", { name: /你是谁/ }).waitFor({ timeout: 10_000 });
}

async function loginAs(page, loginId, password = PASSWORD) {
  await openGate(page);
  await page.getByLabel("账号", { exact: true }).fill(loginId);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "进入我的空间" }).click();
  // Either the door opens or it says why; a journey then checks which happened.
  await Promise.race([
    composer(page).waitFor({ timeout: 10_000 }),
    page.getByText(/账号或密码不正确/).waitFor({ timeout: 10_000 }),
  ]);
}

async function send(page, what) {
  await composer(page).click();
  await composer(page).fill(what);
  await composer(page).press("Enter");
}

/** The assistant bubble is the only place these lines can come from. */
async function waitReply(page, timeout = 30_000) {
  await page.locator("text=/我听到了：|这句话里有/").first().waitFor({ timeout });
}

function participant(loginId) {
  return harness.world.participants.get(harness.world.ids[loginId]);
}

function lastSession(loginId) {
  const p = participant(loginId);
  return p.sessions[p.sessions.length - 1] || { messages: [] };
}

const countRole = (session, role) => session.messages.filter((m) => m.role === role).length;

// --------------------------------------------------------------- the runner

async function main() {
  fs.mkdirSync(SCREENS, { recursive: true });
  if (!SKIP_BUILD) {
    console.log("构建静态导出（NEXT_PUBLIC_BASE_PATH 置空，与 /api 同源）…");
    await build();
  }
  harness = await startHarness({ dir: OUT });
  const browser = await chromium.launch({ headless: !HEADED });
  current = { browser };
  const reset = () => harness.reset();

  console.log(`\n旅程开始 ${harness.origin}${HEADED ? "（headed）" : ""}\n`);

  // ---- 1. first arrival
  await journey("第一次打开：只有门禁，不播音乐，不替人决定", async (page, context, seen) => {
    reset();
    await openGate(page);
    await shoot(page, "01-第一次打开-门禁");

    ok(seen.api.some((r) => r.path === "/api/me"), "首屏没有问过服务器「我是谁」");
    ok(!seen.api.some((r) => r.path === "/api/state"), "还没有身份，却载入了对话");
    ok(seen.media.length === 0, "首屏加载了音频文件：" + seen.media.join(","));

    // The forbidden gesture: an ordinary first click anywhere on the page.
    await page.getByRole("button", { name: "第一次来？" }).click();
    await page.locator("h1").click();
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForTimeout(400);
    ok(seen.media.length === 0, "第一次点击之后出现了音频请求：" + seen.media.join(","));
    ok((await page.locator("audio").count()) === 0, "正式对话表面挂载了 AmbientBgm");

    const meta = await page.getAttribute('meta[name="viewport"]', "content");
    ok(meta && /width=device-width/.test(meta), "缺少可用的 viewport：" + meta);
    ok(!/maximum-scale|max-scale/i.test(meta), "禁掉了缩放：" + meta);
    ok(!/user-scalable\s*=\s*no/i.test(meta), "禁掉了缩放：" + meta);
  });

  // ---- 2. registration
  await journey("注册：规则写在脸上，本地能发现的错不浪费一次请求", async (page, context, seen) => {
    reset();
    await openGate(page);
    await page.getByRole("button", { name: "第一次来？" }).click();

    const rules = await plain(page);
    ok(/3-32/.test(rules), "账号规则没写在界面上");
    ok(/至少 10 个字符/.test(rules), "密码规则没写在界面上");
    ok(!/向我要/.test(rules), "文案里还有只对 Founder 说话的一句");
    await shoot(page, "02-注册-规则");

    await page.getByLabel("邀请码").fill("FRIEND");
    await page.getByLabel("账号", { exact: true }).fill("ab");
    await page.getByLabel("密码", { exact: true }).fill(PASSWORD);
    await page.getByLabel("再输一次密码").fill(PASSWORD);
    await page.getByRole("button", { name: "创建我的空间" }).click();
    await page.getByText(/账号名不符合要求/).waitFor({ timeout: 3000 });
    ok(!seen.api.some((r) => r.path === "/api/register"), "两个字符的账号名被送到服务器了");

    await page.getByLabel("账号", { exact: true }).fill("xiaolin");
    await page.getByLabel("再输一次密码").fill("another-one-10");
    await page.getByRole("button", { name: "创建我的空间" }).click();
    await page.getByText(/两次输入的密码不一样/).waitFor({ timeout: 3000 });
    ok(!seen.api.some((r) => r.path === "/api/register"), "两次密码不同却发到了服务器");
    await shoot(page, "02b-注册-两次不一样");

    const reveal = page.getByRole("button", { name: /显示密码|隐藏密码/ }).first();
    await reveal.click();
    ok((await page.getByLabel("密码", { exact: true }).getAttribute("type")) === "text", "显示密码没有真的显示");
    await shoot(page, "02c-注册-显示密码");
    await reveal.click();
    ok((await page.getByLabel("密码", { exact: true }).getAttribute("type")) === "password", "隐藏密码没有真的隐藏");

    await page.getByLabel("再输一次密码").fill(PASSWORD);
    await page.getByLabel("称呼（可留空）").fill("小林");
    await page.getByRole("button", { name: "创建我的空间" }).click();
    await composer(page).waitFor({ timeout: 10_000 });
    ok(harness.world.credentials.has("xiaolin"), "服务器上没有真的创建这个账号");
    await shoot(page, "02d-注册-进入对话");
  });

  // ---- 3. login
  await journey("登录：错一次说一句，对了就进来", async (page, context, seen) => {
    reset();
    await loginAs(page, "aming", "wrong-password-1");
    await page.getByText("账号或密码不正确").waitFor({ timeout: 3000 });
    ok((await page.locator("textarea").count()) === 0, "密码不对却像是进来了");
    await shoot(page, "03-登录-密码不对");

    await page.getByLabel("密码", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "进入我的空间" }).click();
    await composer(page).waitFor({ timeout: 10_000 });
    ok(seen.api.some((r) => r.path === "/api/state"), "进来以后没有向服务器要当前对话");
  });

  // ---- 4. send → response
  await journey("说一句 → 得到回应，只存一次", async (page) => {
    reset();
    // Hold the reply open so the waiting state is something a person can see.
    harness.slowReply(1200);
    await loginAs(page, "aming");
    const line = "今天我先接了一个电话，没有先道歉。";
    await send(page, line);
    await page.getByText("正在回应").first().waitFor({ timeout: 5000 });
    await shoot(page, "04-正在回应");
    harness.slowReply(0);
    await waitReply(page);

    ok(countRole(lastSession("aming"), "user") === 1, "一句话在服务器上存了不止一次");
    ok(countRole(lastSession("aming"), "assistant") === 1, "回应不止一条");
    ok((await plain(page)).includes(line), "屏幕上找不到刚才那句");
    await shoot(page, "04b-得到回应");
  });

  // ---- 5. provider failure → retry
  await journey("连不上模型：说的话还在，再试一次不重复", async (page, context, seen) => {
    reset();
    await loginAs(page, "aming");
    harness.world.mode.provider = "down";
    const line = "这件我不想再替他解释了。";
    await send(page, line);
    await page.getByText(/暂时没有连上/).waitFor({ timeout: 5000 });
    await shoot(page, "05-连不上模型");

    ok((await plain(page)).includes(line), "话没保住：屏幕上找不到刚才那句");
    ok(countRole(lastSession("aming"), "user") === 1, "服务端多存了一句");

    harness.world.mode.provider = "ok";
    await page.getByRole("button", { name: "再试一次" }).click();
    await waitReply(page);

    const calls = seen.api.filter((r) => r.path === "/api/message");
    ok(calls.length === 2, "重试发出了 " + calls.length + " 次请求");
    ok(JSON.parse(calls[1].post).retry === true, "第二次不是 retry:true，会重复发言");
    ok(countRole(lastSession("aming"), "user") === 1, "重试之后出现两句重复的话");
    ok(countRole(lastSession("aming"), "assistant") === 1, "重试没有只补一次回应");
    await shoot(page, "05b-重试后只补一次");
  });

  // ---- 6. new session → history → current
  await journey("新的对话 → 历史里找回来 → 回到当前", async (page) => {
    reset();
    await loginAs(page, "aming");
    const oldLine = "上周我没有回那条消息。";
    await send(page, oldLine);
    await waitReply(page);

    await page.getByRole("button", { name: "新的对话" }).click();
    await page.waitForTimeout(600);
    ok(!(await plain(page)).includes(oldLine), "新会话里还留着上一段的话");
    await shoot(page, "06-新的对话-空的");

    await page.getByRole("button", { name: "过去的对话" }).click();
    await drawer(page).waitFor({ timeout: 4000 });
    const entries = page.locator('[role="dialog"] li button');
    await entries.first().waitFor({ timeout: 5000 });
    ok((await entries.count()) >= 2, "历史里没有那两段对话");
    await shoot(page, "06b-抽屉-历史");

    await entries.last().click();
    await page.getByText("过去的对话，只读。").waitFor({ timeout: 4000 });
    ok((await plain(page)).includes(oldLine), "打开了历史却没有那句话");
    await shoot(page, "06c-历史只读");

    await page.getByRole("button", { name: "返回当前对话" }).click();
    await page.waitForTimeout(600);
    ok(!(await plain(page)).includes(oldLine), "回到当前却还显示旧对话");
    ok((await composer(page).count()) === 1, "回不到可以说话的地方");
  });

  // ---- 7. logout is only logout
  await journey("退出只是退出：话留在原处，再登录还在", async (page, context, seen) => {
    reset();
    await loginAs(page, "aming");
    const line = "退出前我说一句：我今天没有假装忙。";
    await send(page, line);
    await waitReply(page);

    await page.getByRole("button", { name: "过去的对话" }).click();
    await page.getByRole("button", { name: "退出这个空间" }).click();
    await page.getByRole("heading", { name: /你是谁/ }).waitFor({ timeout: 4000 });
    await shoot(page, "07-退出之后");

    const from = seen.api.findIndex((r) => r.path === "/api/logout");
    const after = seen.api.slice(from);
    ok(
      !after.some((r) => /end-session|delete-all/.test(r.path)),
      "退出顺手动了别的东西：" + after.map((r) => r.path).join(","),
    );
    ok(participant("aming").sessions.some((s) => s.messages.length), "退出把话弄丢了");

    await loginAs(page, "aming");
    ok((await plain(page)).includes(line), "重新登录以后话不在了");
  });

  // ---- 8. session expired
  await journey("登录失效：说清楚，不让人以为话没了", async (page) => {
    reset();
    await loginAs(page, "aming");
    const line = "这句是在失效之前说的。";
    await send(page, line);
    await waitReply(page);

    harness.expireSessionsOf(harness.world.ids.aming);
    await page.getByRole("button", { name: "新的对话" }).click();
    await page.getByRole("heading", { name: /你是谁/ }).waitFor({ timeout: 4000 });
    await page.getByText(/刚刚失效/).waitFor({ timeout: 3000 });
    await page.getByText(/都还在/).waitFor({ timeout: 3000 });
    await shoot(page, "08-登录失效");

    await loginAs(page, "aming");
    ok((await plain(page)).includes(line), "失效之后重新登录，话应该还在");
  });

  // ---- 9. delete-all truth
  await journey("删除全部：没删成就说没删成，删成了才真的没了", async (page) => {
    reset();
    await loginAs(page, "aming");
    const line = "这句话我打算先删掉。";
    await send(page, line);
    await waitReply(page);

    await page.getByRole("button", { name: "过去的对话" }).click();
    await page.getByRole("button", { name: "关于这里" }).click();
    await page.getByRole("button", { name: "删除我的全部数据" }).click();
    await shoot(page, "09-删除确认");

    harness.failOnce("/api/delete-all", 500);
    await page.getByRole("button", { name: "全部删除" }).click();
    await page.locator("[data-action-area]").waitFor({ timeout: 4000 });
    ok(/没有删除成功/.test(await plain(page)), "删除失败却没有说法");
    ok((await plain(page)).includes(line), "服务器没删，界面却把话藏起来了");
    ok(
      participant("aming").sessions.some((s) => s.messages.length),
      "后端数据被偷偷清掉了",
    );
    await shoot(page, "09b-删除失败说了话");

    await page.getByRole("button", { name: "知道了" }).click();
    await page.getByRole("button", { name: "全部删除" }).click();
    await page.getByRole("heading", { name: /你是谁/ }).waitFor({ timeout: 5000 });
    ok(
      participant("aming").sessions.every((s) => s.messages.length === 0),
      "后端没有真的删除",
    );
    await shoot(page, "09c-删除之后");

    await loginAs(page, "aming");
    ok(!(await plain(page)).includes(line), "删完之后又把它显示回来");
  });

  // ---- 10. network failure
  await journey("断网：说一句「网络断了一下」，网通了再说不重复", async (page, context, seen) => {
    reset();
    await loginAs(page, "aming");
    const line = "这句是在断网的时候说的。";
    await context.setOffline(true);
    await send(page, line);
    await page.getByText(/网络断了一下/).waitFor({ timeout: 10_000 });
    await shoot(page, "10-断网");
    await context.setOffline(false);

    await page.getByRole("button", { name: "再试一次" }).click();
    await waitReply(page);
    const stored = lastSession("aming").messages.filter((m) => m.role === "user" && m.content === line);
    ok(stored.length === 1, "断网重发把同一句话存了 " + stored.length + " 次");
    ok(seen.api.some((r) => r.path === "/api/message"), "没有真的再发一次");
  });

  // ---- 11. every action failure says something
  const failureCases = [
    {
      area: "载入对话",
      needle: /没能载入你的对话/,
      async run(page) {
        harness.failOnce("/api/state", 500);
        await loginAs(page, "aming");
      },
    },
    {
      area: "新的对话",
      needle: /没能开始新的对话/,
      async run(page) {
        await loginAs(page, "aming");
        harness.failOnce("/api/new-session", 500);
        await page.getByRole("button", { name: "新的对话" }).click();
      },
    },
    {
      area: "历史列表",
      needle: /没能载入过去的对话列表/,
      async run(page) {
        await loginAs(page, "aming");
        harness.failOnce("/api/sessions", 500);
        await page.getByRole("button", { name: "过去的对话" }).click();
        await drawer(page).waitFor();
      },
    },
    {
      area: "打开某段历史",
      needle: /没能打开这段过去的对话/,
      async run(page) {
        await loginAs(page, "aming");
        await send(page, "打开历史要用的那句话");
        await waitReply(page);
        await page.getByRole("button", { name: "新的对话" }).click();
        await page.waitForTimeout(500);
        // The older of the two sessions, by server id — so only this one fails.
        const older = participant("aming").sessions[0].id;
        harness.failOnce("/api/sessions/" + older, 500);
        await page.getByRole("button", { name: "过去的对话" }).click();
        await drawer(page).waitFor();
        await page.locator('[role="dialog"] li button').last().click();
      },
    },
    {
      area: "结束今天",
      needle: /今天还没有真正结束/,
      async run(page) {
        await loginAs(page, "aming");
        harness.failOnce("/api/end-session", 500);
        await page.getByRole("button", { name: "今天先到这里" }).click();
        await page.getByRole("button", { name: "带走这句" }).click();
      },
    },
    {
      area: "退出",
      needle: /没有退出成功/,
      async run(page) {
        await loginAs(page, "aming");
        harness.failOnce("/api/logout", 500);
        await page.getByRole("button", { name: "过去的对话" }).click();
        await page.getByRole("button", { name: "退出这个空间" }).click();
      },
    },
  ];

  for (const c of failureCases) {
    await journey(`失败不沉默：${c.area}`, async (page) => {
      reset();
      await c.run(page);
      await page.getByText(c.needle).waitFor({ timeout: 5000 });
      await shoot(page, "11-失败不沉默-" + slug(c.area));
      // A failed logout must not pretend the door closed.
      if (c.area === "退出") {
        ok((await composer(page).count()) === 1, "说没退出成功，界面却已经把人赶出去了");
      }
    });
  }

  // ---- 12. two people, one browser
  await journey("同一个浏览器换人：看不到上一个人在这里的话", async (page) => {
    reset();
    await loginAs(page, "aming");
    const secret = "这句只有阿明说过。";
    await send(page, secret);
    await waitReply(page);

    await page.getByRole("button", { name: "过去的对话" }).click();
    await page.getByRole("button", { name: "退出这个空间" }).click();
    await loginAs(page, "xiaoman");
    ok(!(await plain(page)).includes(secret), "换了一个人，却还看得到上一个人在这里说的话");
    await page.getByRole("button", { name: "过去的对话" }).click();
    await drawer(page).waitFor();
    const drawerText = await drawer(page).innerText();
    ok(!/本地工具|旧版草稿区/.test(drawerText), "抽屉里还留着第二套「自己的空间」入口");
    await shoot(page, "12-换人之后");
  });

  // ---- 13. keyboard all the way through
  await journey("只用键盘：抽屉是对话框，Escape 回到原处，然后说一句话", async (page) => {
    reset();
    await loginAs(page, "aming");

    await page.getByRole("button", { name: "过去的对话" }).focus();
    await page.keyboard.press("Enter");
    await drawer(page).waitFor({ timeout: 4000 });
    ok((await drawer(page).getAttribute("aria-modal")) === "true", "抽屉没有声明 aria-modal");
    ok(await drawer(page).getAttribute("aria-labelledby"), "对话框没有名字");

    const inside = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        const panel = document.querySelector('[role="dialog"]');
        return Boolean(panel && el && panel.contains(el));
      });
    ok(await inside(), "打开抽屉以后焦点没有进到里面");
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      ok(await inside(), "Tab 走出了对话框，键盘用户会迷路");
    }
    await shoot(page, "13-键盘在抽屉里");

    await page.keyboard.press("Escape");
    await drawer(page).waitFor({ state: "hidden", timeout: 4000 });
    const backTo = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || "");
    ok(backTo === "过去的对话", "关闭以后焦点没有回到原来的按钮，实际：" + backTo);

    await page.getByLabel("要说的话").focus();
    await send(page, "这一句是键盘打完的。");
    await waitReply(page);
  });

  // ---- 14. quiet and private
  await journey("安静、私人：没有自动播放，也没有把凭据留在浏览器", async (page, context, seen) => {
    reset();
    await loginAs(page, "aming");
    await send(page, "安静这句话也要说完。");
    await waitReply(page);
    await page.getByRole("button", { name: "过去的对话" }).click();
    await drawer(page).waitFor();
    await page.keyboard.press("Escape");
    await page.mouse.click(200, 400);
    await page.waitForTimeout(500);

    ok(seen.media.length === 0, "出现了音频请求：" + seen.media.join(","));
    const storage = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    ok(
      !storage.local.concat(storage.session).some((k) => /token|key|secret|api/i.test(k)),
      "本地存了凭据类的东西：" + storage.local.join(","),
    );
    ok(seen.errors.length === 0, "页面抛出了未捕获的错：" + seen.errors.join(" | "));
  });

  await browser.close();
  await harness.close();

  const failed = results.filter((r) => !r.pass);
  const report = {
    builtAt: new Date().toISOString(),
    node: process.version,
    chromium: chromium.executablePath(),
    headed: HEADED,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.map((f) => ({ name: f.name, error: f.error })),
    journeys: results,
  };
  fs.writeFileSync(path.join(EVIDENCE, "journeys.json"), JSON.stringify(report, null, 2));

  console.log(`\n${results.length - failed.length}/${results.length} 通过`);
  console.log("证据：" + path.relative(ROOT, EVIDENCE));
  if (failed.length) {
    for (const f of failed) console.log("  ✗ " + f.name + " — " + f.error.split("\n")[0]);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
