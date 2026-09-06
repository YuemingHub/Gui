import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 字体自托管回归：构建期不得再依赖 Google Fonts。
// 2026-09-06 实测：next/font/google 让 npm run build 在国内构建机的全新目录
// 直接失败（fonts.googleapis.com 不可达）。字体由 geist 包（next/font/local）
// 随仓库依赖提供，这条线不能再被打开。

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(here, "..");

function listAppFiles(dir) {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listAppFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

test("no app file imports next/font/google — build must not need Google Fonts", () => {
  const offenders = listAppFiles(appDir)
    .filter((f) => !f.endsWith(".test.ts"))
    .filter((f) => /from\s+["']next\/font\/google["']/.test(fs.readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});

test("font variable chain stays intact: geist package feeds the same CSS variables", () => {
  const layout = fs.readFileSync(path.join(appDir, "layout.tsx"), "utf8");
  assert.match(layout, /from ["']geist\/font\/sans["']/);
  assert.match(layout, /from ["']geist\/font\/mono["']/);
  const globals = fs.readFileSync(path.join(appDir, "globals.css"), "utf8");
  assert.match(globals, /var\(--font-geist-sans\)/);
});
