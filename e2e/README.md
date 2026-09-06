# e2e — 真实浏览器旅程

不做测试框架，只做两件事：

1. `run.mjs` — 用 Chromium 把一个真人会走的路完整走一遍，对着一台**脚本化的 Return 替身**（`harness.mjs`，按 `docs/r0/GUI_RETURN_API_CONTRACT.md` 的形状应答，可注入故障）。
2. `responsive.mjs` — 同一段对话在 375/390/768/1440 四种屏上走一遍，量几何：不横溢、输入框始终在可视区、抽屉不超屏、删除确认够得着。

```bash
npm run e2e                  # 无头；先 next build（NEXT_PUBLIC_BASE_PATH 置空，同源 /api）
npm run e2e:headed           # 打开浏览器窗口，用眼睛看
npm run e2e -- --no-build    # 复用已有 out/
npm run e2e -- --only 抽屉    # 只跑名字含关键词的旅程
npm run screens              # 四种屏 + 截图（需要 out/，先跑一次 npm run e2e）
npm run screens -- --headed
```

- 证据：`evidence/journeys.json`、`evidence/responsive.json`、`evidence/screens/**.png`
- 依赖：`playwright-core`（devDependency）+ 本机已装的 Chromium（`PLAYWRIGHT_BROWSERS_PATH` 默认路径）；不下载浏览器、不进 CI
- 替身服务器只起在 `127.0.0.1` 随机端口，没有任何密钥、模型或真实数据

## 旅程清单（run.mjs）

| 旅程 | 证明的事 |
|---|---|
| 第一次打开 | 只有门禁；首屏只问一次 `/api/me`；点哪里都不会冒出音频；`<audio>` 不存在；viewport 允许双指缩放 |
| 注册 | 账号/密码规则写在界面上；本地能发现的错（账号不合规则、两次密码不一样）不发请求；显示/隐藏密码可用；成功后服务器上真的有这个账号 |
| 登录 | 错密码说「账号或密码不正确」并停在门禁；对了才进来，进来后向服务器要当前对话 |
| 说一句 → 得到回应 | 「正在回应」可见；回应只补一次，服务器上只有一句用户话 |
| 连不上模型 | 503 后那句话还在屏幕上；「再试一次」发出 `retry:true`，不产生重复发言 |
| 新的对话 → 历史 → 当前 | 新段是空的；抽屉里找得回旧段（只读）；能回到当前 |
| 退出 | 只调 `/api/logout`，不碰 end-session/delete-all；再登录话还在 |
| 登录失效 | 回到门禁并说明「登录刚刚失效，你说过的话都还在」；重新登录确实都在 |
| 删除全部 | 失败时说「没有删除成功」且话还在、后端数据没被动过；成功后后端真的空了 |
| 断网 | 说「网络断了一下」；网通了再试，同一句话只存一次 |
| 失败不沉默 ×6 | 载入 / 新的对话 / 历史列表 / 打开历史 / 结束今天 / 退出，每一种失败都有一句话；退出失败时人还留在空间里 |
| 换人 | 退出后换账号，看不到上一段人的话；抽屉里没有「本地工具」入口 |
| 只用键盘 | 抽屉是 `role=dialog` + `aria-modal`；焦点进得去、Tab 出不来、Escape 关闭后焦点回到原按钮；之后还能靠键盘说完一句话 |
| 安静、私人 | 无音频请求；localStorage/sessionStorage 里没有凭据类 key；无未捕获异常 |

## responsive.mjs 检查项

每个视口：首屏不横向溢出 → 输入框完整可见 → 「正在回应」时位置不动 → 长回应后仍可继续说 → 安全提示卡不破版 → 抽屉不超屏宽 → 历史只读可返回当前 → 结束今天面板完整 → 删除确认在屏内可取消 → **可视区变矮（软键盘的代理测试）时输入框不被埋住，且外壳确实按 `--vvh` 布局、恢复时跟随**。

> 诚实说明：本机的 Chromium 不支持 `Emulation.setVirtualKeyboardOverride`，所以「键盘弹起」用可视区变矮来代替（Playwright 把视口高度压矮 300px），并额外断言外壳读的是 `--vvh`（visualViewport 高度）而不是 `100dvh`。在真机上仍应手动按一次键盘确认。
