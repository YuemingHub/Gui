#!/usr/bin/env node
// The same conversation, seen on the screens people actually hold.
//
//   npm run screens              headless
//   npm run screens -- --headed   watch it
//
// Checks, per viewport: nothing runs sideways, the place you type stays fully
// visible while the model is talking and after a long answer, the drawer and the
// delete confirmation are reachable, and a soft keyboard (when Chromium will
// emulate one) does not bury the composer.
//
// Evidence: e2e/evidence/responsive.json + e2e/evidence/screens/<size>/*.png

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { startHarness } from "./harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT = path.join(ROOT, "out");
const SCREENS = path.join(HERE, "evidence", "screens");

const PASSWORD = "long-enough-1";

const VIEWS = [
  { name: "375x812-phone", width: 375, height: 812, mobile: true },
  { name: "390x844-phone", width: 390, height: 844, mobile: true },
  { name: "768x1024-tablet", width: 768, height: 1024, mobile: false },
  { name: "1440x900-desktop", width: 1440, height: 900, mobile: false },
];

const LONG_TEXT =
  "我今天把三件拖着的事做完了一件，另外两件我承认是在躲。不是因为忙，是因为怕做不好就被看见。";

const ok = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function shot(page, dir, name) {
  await page.screenshot({ path: path.join(SCREENS, dir, name + ".png") });
}

/** Geometry that must hold in every state: nothing sideways, composer inside. */
async function measure(page) {
  return page.evaluate(() => {
    const vv = window.visualViewport;
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
    };
    const field = document.querySelector('textarea[aria-label="要说的话"]');
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom <= (vv ? vv.height : innerHeight) + 1 && r.top >= -1;
    };
    return {
      innerWidth,
      innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      visualHeight: vv ? Math.round(vv.height) : Math.round(innerHeight),
      composer: box(field),
      composerInSight: field ? visible(field) : false,
      chatScroller: box(document.getElementById("messages-scroll")),
    };
  });
}

async function login(page, origin) {
  await page.goto(origin + "/", { waitUntil: "load" });
  await page.getByLabel("账号", { exact: true }).fill("aming");
  await page.getByLabel("密码", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "进入我的空间" }).click();
  await page.getByLabel("要说的话").waitFor({ timeout: 10_000 });
}

async function main() {
  if (!fs.existsSync(path.join(OUT, "index.html"))) {
    throw new Error("没有 out/index.html —— 先跑 npm run e2e（它会构建一次同源导出的版本）");
  }
  const harness = await startHarness({ dir: OUT });
  const browser = await chromium.launch({ headless: !process.argv.includes("--headed") });
  const report = { builtAt: new Date().toISOString(), viewports: [] };

  for (const view of VIEWS) {
    harness.reset();
    const dir = view.name;
    fs.mkdirSync(path.join(SCREENS, dir), { recursive: true });
    const context = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      deviceScaleFactor: view.mobile ? 2 : 1,
      isMobile: view.mobile,
      hasTouch: view.mobile,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const entry = { viewport: dir, checks: [], keyboard: "unsupported" };
    const check = (name, fn) =>
      fn().then(
        (detail) => entry.checks.push({ name, pass: true, detail: typeof detail === "string" ? detail : undefined }),
        (e) => entry.checks.push({ name, pass: false, error: String(e?.message || e) }),
      );

    try {
      await login(page, harness.origin);
      await check("首屏不横着溢出", async () => {
        const m = await measure(page);
        ok(m.scrollWidth <= m.innerWidth + 1, `scrollWidth ${m.scrollWidth} > ${m.innerWidth}`);
        return `${m.innerWidth}x${m.innerHeight}`;
      });
      await shot(page, dir, "01-门禁后的对话");

      await check("输入框完整可见", async () => {
        const m = await measure(page);
        ok(m.composerInSight, "输入框不在可视区：" + JSON.stringify(m.composer));
        return `composer bottom ${Math.round(m.composer.bottom)} / ${m.visualHeight}`;
      });

      // The loading state must not move the composer away. Replies are held open
      // for a moment so this state can actually be looked at.
      harness.slowReply(1500);
      harness.world.mode.longReply = true;
      const loading = page.getByText("正在回应").first();
      await page.getByLabel("要说的话").fill(LONG_TEXT);
      await page.getByLabel("要说的话").press("Enter");
      await loading.waitFor({ timeout: 5000 });
      await shot(page, dir, "02-正在回应");
      await check("等待回应时输入框仍在原位", async () => {
        const m = await measure(page);
        ok(m.composerInSight, "回应中输入框跑出可视区");
        return `可视 ${m.visualHeight}px`;
      });

      // A long answer, and the turn that ends the day.
      await loading.waitFor({ state: "hidden", timeout: 20_000 });
      await shot(page, dir, "03-长回应");
      await check("长回应之后不横溢、仍可继续说", async () => {
        const m = await measure(page);
        ok(m.scrollWidth <= m.innerWidth + 1, "长回应把页面撑出横向滚动");
        ok(m.composerInSight, "长回应之后输入框不见了");
        return `composer bottom ${Math.round(m.composer.bottom)}`;
      });

      // Safety card (the backend decides kind; here it is switched on).
      harness.world.mode.longReply = false;
      harness.slowReply(0);
      harness.world.mode.safetyNext = true;
      await page.getByLabel("要说的话").fill("有人说过如果不见面就让我后悔。");
      await page.getByLabel("要说的话").press("Enter");
      await page.getByText("这句话里有你会受伤的部分").waitFor({ timeout: 20_000 });
      await shot(page, dir, "04-安全提示卡");
      await check("安全提示卡不破版", async () => {
        const m = await measure(page);
        ok(m.scrollWidth <= m.innerWidth + 1, "提示卡撑出横向滚动");
        return "ok";
      });

      // Drawer + history.
      await page.getByRole("button", { name: "过去的对话" }).click();
      await page.getByRole("dialog").waitFor({ timeout: 4000 });
      await shot(page, dir, "05-抽屉与历史");
      await check("抽屉在窄屏不超过屏宽", async () => {
        const box = await page.getByRole("dialog").boundingBox();
        ok(box.width <= view.width * 0.9, `抽屉 ${Math.round(box.width)}px > ${Math.round(view.width * 0.9)}px`);
        ok(box.height <= view.height + 1, "抽屉高出屏幕");
        return `${Math.round(box.width)}x${Math.round(box.height)}`;
      });

      // An older session, read-only. Close the drawer first: the header belongs
      // to the conversation, not to the panel on top of it.
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.locator('header button[aria-label="新的对话"]').click();
      await page.waitForTimeout(400);
      await page.getByRole("button", { name: "过去的对话" }).click();
      await page.getByRole("dialog").waitFor();
      const entries = page.locator('[role="dialog"] li button');
      await entries.last().waitFor({ timeout: 5000 });
      ok((await entries.count()) >= 2, "开一段新的之后，历史里少于两段对话");
      await entries.last().click();
      await page.getByText("过去的对话，只读。").waitFor({ timeout: 4000 });
      await shot(page, dir, "06-历史只读");
      await check("只读历史可以回到当前", async () => {
        await page.getByRole("button", { name: "返回当前对话" }).click();
        await page.getByLabel("要说的话").waitFor({ timeout: 4000 });
        return "ok";
      });

      // End the day, then the delete confirmation.
      await page.getByRole("button", { name: "今天先到这里" }).click();
      await page.getByRole("button", { name: "带走这句" }).waitFor({ timeout: 3000 });
      await shot(page, dir, "07-结束今天");
      await check("结束今天的面板里两个按钮都在", async () => {
        ok((await page.getByRole("button", { name: "什么都不带" }).count()) === 1, "少了「什么都不带」");
        ok((await page.getByRole("button", { name: "再聊会" }).count()) === 1, "少了「再聊会」");
        const m = await measure(page);
        ok(m.scrollWidth <= m.innerWidth + 1, "结束面板撑出横向滚动");
        return "ok";
      });
      await page.getByRole("button", { name: "再聊会" }).click();

      await page.getByRole("button", { name: "过去的对话" }).click();
      await page.getByRole("button", { name: "关于这里" }).click();
      await page.getByRole("button", { name: "删除我的全部数据" }).click();
      await page.getByRole("button", { name: "全部删除" }).waitFor({ timeout: 3000 });
      await shot(page, dir, "08-删除确认");
      await check("删除确认在屏内且可以取消", async () => {
        const m = await measure(page);
        ok(m.scrollWidth <= m.innerWidth + 1, "删除确认撑出横向滚动");
        const cancel = await page.getByRole("button", { name: "先不删" }).boundingBox();
        const cancelBottom = cancel.y + cancel.height;
        ok(
          cancelBottom <= m.visualHeight + 1,
          `取消按钮跑到可视区外面：bottom ${Math.round(cancelBottom)} > 可视 ${m.visualHeight}`,
        );
        await page.getByRole("button", { name: "先不删" }).click();
        return "ok";
      });
      // Back to the conversation whatever the check said, so the next step has a
      // place to type.
      await page.getByRole("button", { name: "返回对话" }).click().catch(() => {});
      await page.getByLabel("要说的话").waitFor({ timeout: 5000 }).catch(() => {});

      // A soft keyboard, if Chromium will fake one for us; otherwise the same
      // geometry test with the visible area simply made shorter. Either way the
      // wiring is checked: the shell must lay itself out from --vvh, and --vvh
      // must equal what visualViewport says is visible.
      await check("可视区变矮时输入框不被埋住", async () => {
        const before = await measure(page);
        const cdp = await context.newCDPSession(page).catch(() => null);
        let emulated = false;
        if (cdp) {
          try {
            await cdp.send("Emulation.setVirtualKeyboardOverride", { enabled: true, width: 0, height: 300 });
            const probe = await measure(page);
            if (probe.visualHeight < before.visualHeight - 100) emulated = true;
            if (!emulated) await cdp.send("Emulation.setVirtualKeyboardOverride", { enabled: false }).catch(() => {});
          } catch {
            emulated = false;
          }
        }
        if (emulated) {
          entry.keyboard = "cdp-emulated";
        } else {
          entry.keyboard = "viewport-shrink proxy";
          await page.setViewportSize({ width: view.width, height: Math.max(360, view.height - 300) });
        }
        await page.getByLabel("要说的话").focus();
        await page.waitForTimeout(500);
        const during = await measure(page);
        ok(
          during.visualHeight < before.visualHeight - 100,
          "可视区没有变短，测不出键盘弹起（前 " + before.visualHeight + " / 后 " + during.visualHeight + "）",
        );
        ok(
          during.composer.bottom <= during.visualHeight + 1,
          `键盘弹起后输入框底边 ${Math.round(during.composer.bottom)} 落在可视区 ${during.visualHeight} 之外`,
        );
        // While the visible area is short, the shell must be sized to it.
        const wiring = await page.evaluate(() => {
          const shell = document.querySelector('[style*="--vvh"]');
          const declared = getComputedStyle(document.documentElement).getPropertyValue("--vvh").trim();
          return {
            shellUsesVar: Boolean(shell),
            declared,
            visible: Math.round(window.visualViewport.height),
          };
        });
        if (cdp) await cdp.send("Emulation.setVirtualKeyboardOverride", { enabled: false }).catch(() => {});
        await page.setViewportSize({ width: view.width, height: view.height });
        await page.waitForTimeout(400); // the visible area is back
        const restored = await page.evaluate(() => ({
          declared: getComputedStyle(document.documentElement).getPropertyValue("--vvh").trim(),
          visible: Math.round(window.visualViewport.height),
        }));
        ok(
          Math.abs(parseFloat(restored.declared) - restored.visible) <= 2,
          `键盘收起以后没有恢复：--vvh ${restored.declared}，实际 ${restored.visible}px`,
        );

        ok(wiring.shellUsesVar, "对话外壳没有按可视区高度布局（找不到 var(--vvh)）");
        ok(
          Math.abs(parseFloat(wiring.declared) - wiring.visible) <= 2,
          `可视区变矮后 --vvh 是 ${wiring.declared}，实际可视高却是 ${wiring.visible}px`,
        );
        return `可视高 ${before.visualHeight} → ${during.visualHeight}；--vvh ${wiring.declared}`;
      });
      await shot(page, dir, "09-键盘弹起");
    } catch (e) {
      entry.checks.push({ name: "journey", pass: false, error: String(e?.message || e) });
      await page.screenshot({ path: path.join(SCREENS, dir, "ZZ-出错.png") }).catch(() => {});
    }

    await context.close();
    report.viewports.push(entry);
    const bad = entry.checks.filter((c) => !c.pass);
    console.log(
      `${bad.length ? "FAIL" : "PASS"}  ${dir}  (${entry.checks.length - bad.length}/${entry.checks.length} 项, 键盘=${entry.keyboard})`,
    );
    for (const b of bad) console.log(`        ✗ ${b.name} — ${b.error}`);
  }

  const failed = report.viewports.flatMap((v) => v.checks.filter((c) => !c.pass));
  fs.writeFileSync(path.join(HERE, "evidence", "responsive.json"), JSON.stringify(report, null, 2));
  await browser.close();
  await harness.close();
  console.log(`\n${failed.length === 0 ? "全部通过" : failed.length + " 项未通过"} · 证据：e2e/evidence`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
