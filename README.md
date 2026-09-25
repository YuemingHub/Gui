> ⚠️ **SUPERSEDED / ARCHIVE-READY · 2026-09-25**
>
> This repository is no longer the canonical Self Space frontend repository.
>
> Since 2026-09-12, Gui has been physically merged into `YuemingHub/Self-Space/gui`. `YuemingHub/Self-Space` is the only active Self Space product/code/deployment source.
>
> Do not make new product changes here, sync this repo back into Self-Space, or treat its README/state as current product truth.
>
> This repository is preserved for Git history/provenance and is ready for GitHub archive when repository-admin action is available.

---

# 回到自己 · Gui

> **当前形态（2026-09）**：这是一个靠账号进入的私人对话空间（“我和自己”）。打开应用先看到登录门禁，对话、记忆、记录保存在 Return 后端自己的服务器上；换设备登录，还能回到同一段对话。
> 最初的“本地优先七模块”表面代码保留，但默认不再出现在正式入口里；它只属于当前浏览器，不会跟着账号走。本文档中旧的“本地优先”描述指的是那个历史表面。

一个安静克制的对话空间：说话、被听见、结束一天。

它不是任务管理器，不是打卡系统，也不是仪表盘。它不会评分、排名、制造连续性焦虑，也没有推送。

## 当前状态

正式表面是一个对话空间：

- 账号 + 密码进入（一次性邀请码开张），服务端会话 cookie 是唯一身份来源
- 发送 → 回应；说话先存住，回应失败可重试，不重复、不丢字
- 新的对话 / 历史对话（只读）/ 结束今天（可带走一句话）
- 退出只是退出；删除全部是真实删除，没删成就说没删成
- 任何动作失败都有一句话的提示，没有“按了没反应”的按钮

历史版本（本地优先七模块 MVP）的能力见 `PRODUCT_NOTES.md` 与 `ARCHITECTURE.md`。

## 浏览器旅程（真实浏览器 E2E）

```bash
npm run e2e          # 无头：构建 + 起本地脚本化 Return 替身 + Chromium 走完整旅程
npm run e2e:headed   # 同上，用你自己的眼睛看
npm run screens      # 375/390/768/1440 四种屏：横溢、键盘、长回应、安全卡、抽屉、删除确认
```

详见 `e2e/README.md`。

## 产品结构

应用包含 7 个核心模块：

1. **回到自己**：写下今天真正要照看的事
2. **真戏工坊**：沉淀 1–3 件真实重要的事
3. **清场室**：识别占用你的人和事，并决定限制、降级或移除
4. **静音舱**：提前写下边界与回应方式
5. **三色节奏**：按绿色 / 黄色 / 红色状态安排推进、维护或保护
6. **半成品花园**：收纳草稿、想法与未成熟项目
7. **月度清场**：做无评分的月度整理

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- localStorage 本地持久化

## 运行方式

```bash
npm install --include=dev
npm test
npm run dev
```

默认开发命令使用 Webpack 版本的 Next dev，以优先保证本地开发稳定性。

打开浏览器访问：

```text
http://localhost:3000
```

## 可用脚本

```bash
npm run dev        # 本地开发（webpack）
npm run dev:turbo  # 备用 turbo dev
npm run lint       # ESLint
npm run build      # 生产构建
npm run start      # 启动生产构建产物
```

## 数据与隐私

- 对话、记忆、记录存在这个产品自己的服务器上，只属于你这个参与者；凭据只有服务端会话 cookie（HttpOnly），浏览器不保存账号密码或 token
- 旧的本地七模块数据只留在当前浏览器里，不参与账号、不跨设备
- 没有埋点或后台分析逻辑；正式 build 默认要求搜索引擎不要收录（见 `app/robots.ts`）
- 长期保留靠服务端备份（见 `docs/DEPLOYMENT.md`）；本地七模块若在用，靠“导出本地备份”

## 交互原则

这个项目刻意避免以下机制：

- 分数
- 排名
- 连续打卡
- 进度羞辱
- 夸张提醒
- 仪表盘式压迫感

界面与文案尽量保持温和、低刺激、反劫持。

## 目录概览

```text
app/
  layout.tsx                 # 文档元信息、viewport（允许双指缩放）
  page.tsx                   # 对话表面入口
  LocalSpace.tsx             # 旧本地七模块表面（默认不挂载）
  robots.ts                  # 门口告诉爬虫：这里不收录
  hooks/
    useReturnSession.ts      # 对话状态机（发送/重试/历史/结束/删除/失败面）
    useModalDialog.ts        # 抽屉的键盘契约（Escape/焦点圈/还焦点）
    useVisualViewportHeight.ts # 手机键盘弹起时外壳跟随可视区
    useAppStorage.ts         # 旧本地表面存储
  lib/
    identity.ts              # 身份状态机 + 账号规则（与后端一致）
    returnApi.ts             # Return API 薄客户端
    actionTruth.ts           # 统一的动作失败文案表
    sessionTruth.ts          # 重试/删除的数据真相判定
    storage.ts / defaults.ts / types.ts  # 旧本地表面
components/
  conversation/              # 门禁、消息、输入、抽屉、失败提示
  layout/                    # 旧本地表面外壳 + AmbientBgm（仅旧表面，点一下才响）
  sections/                  # 旧本地七模块
  ui/                        # 通用 UI
e2e/                         # 真实浏览器旅程 + 四种屏检查（见 e2e/README.md）
```

## 相关文档

- `ARCHITECTURE.md`：数据流、状态结构、持久化设计
- `PRODUCT_NOTES.md`：产品原则、范围边界、后续建议
- `QA_CHECKLIST.md`：手动验证清单

## 已知边界

当前版本有意不包含：

- 开放注册（靠一次性邀请码开张）
- 推送、打卡、排行、留存机制
- 自动播放的背景音乐（音乐只在旧本地表面，点一下才响，随时可停）
- 搜索引擎收录（正式 build 默认 noindex）

目标不是做大而全，而是先做一个干净、稳定、能长期迭代的私人对话空间。