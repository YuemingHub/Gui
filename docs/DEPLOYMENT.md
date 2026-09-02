# Self Space · 正式部署准备（Gui + Return）

> Status: production runbook · 2026-09-02
> 权威：Return `docs/self-space/`（Constitution / Kernel Contract / R1 Hypothesis）；接口权威：Return `docs/r0/GUI_RETURN_API_CONTRACT.md`

## 1. 架构（单一来源原则）

```text
浏览器
  ↓ https://<domain>（同一源）
nginx
  ├─ /            Gui 静态导出（next build → out/）
  └─ /api/*       反向代理 → 127.0.0.1:3000（Return runtime）
                        ↓
                 replaceable LLM provider（密钥只在 Return 服务器）
```

两条硬规则（来自 PR #6 审查与 Return Kernel Contract）：

1. **`NEXT_PUBLIC_RETURN_ORIGIN` 必须保持为空**（生产默认同源 `/api`）。任何公网 API 地址都会把参与者数据路径和 CORS 暴露面扩大，违背最小暴露原则。
2. **Provider 密钥（`USER_LLM_*`）只存在于 Return 服务器进程**。永远不出现在 Gui 源码、构建产物、localStorage 或浏览器网络面板可见的任何位置。

GitHub Pages 只保留旧本地优先七模块表面的手动发布口（`pages.yml` 已改为 `workflow_dispatch` 且带发布守卫）；**对话表面必须由 nginx 同源部署**，因为 Pages 无法提供 `/api`。

## 2. Return 后端部署（单机，node 22）

```bash
# 系统依赖：Node >= 22（tests 使用 node --test --experimental-strip-types）
git clone git@github.com:YuemingHub/Return-to-oneself.git /opt/return
cd /opt/return/web

npm ci                      # 期望 0 vulnerabilities
npm test                    # 期望 69/69 PASS —— 部署门禁，红灯不得上线
```

### 2.1 环境配置（`web/.env.local`，已 gitignore，永不入库）

```text
USER_LLM_API_KEY=<provider key，只在服务器>
USER_LLM_BASE_URL=<OpenAI 兼容 endpoint>
USER_LLM_MODEL=<model name>
LLM_TIMEOUT_MS=90000
R0_DATA_DIR=/var/lib/self-space      # 持久数据目录（对话/记忆/证据/邀请）
PORT=3000
```

- 服务器上 `npm start`（`node --env-file-if-exists=.env.local server.js`）。
- **只监听 127.0.0.1**：用 systemd/防火墙保证 3000 端口不直接暴露公网，浏览器只经 nginx `/api` 进入。

### 2.2 systemd 单元（示例 `/etc/systemd/system/self-space.service`）

```ini
[Unit]
Description=Self Space Return runtime
After=network.target

[Service]
WorkingDirectory=/opt/return/web
ExecStart=/usr/bin/node --env-file-if-exists=.env.local server.js
Restart=on-failure
Environment=NODE_ENV=production
# 数据目录属主 = 运行用户；权限 700（参与者数据的最低暴露）
User=selfspace
ReadOnlyPaths=/opt/return

[Install]
WantedBy=multi-user.target
```

### 2.3 Founder 邀请码引导（真实使用入口）

```bash
cd /opt/return/web
node operator.js invite --label founder    # 输出单次使用邀请码，交给 Founder 本人
node operator.js list                      # 查看邀请码/参与者状态（不含对话内容）
node operator.js revoke --code <code>      # 撤销未用邀请码或参与者
node operator.js delete --participant <id> # 服务端删除全部数据（对话/记忆/证据）
```

身份认的是人，不是浏览器：`r0_session` 是服务端会话 cookie（HttpOnly / SameSite=Strict / Path=/ / Secure），前端读不到也不存。`/api/register` 用一次性邀请码建立账号（`login_id` + 密码），`/api/login` 换回会话，`/api/logout` 只关掉这一次会话（不结束今天、不删数据）。

过渡期例外：旧版前端把 bearer token 留在 `localStorage["gui_token"]`。新版只在门禁上一个明确按钮（`继续用这台浏览器上原来的空间`）后使用它，绝不自动进入；`/api/me` 认证通过或成功退出即删除它。Founder 绑定账号密码后删除这一整块。

## 3. Gui 前端构建与发布

```bash
git clone git@github.com:YuemingHub/Gui.git /opt/gui-build
cd /opt/gui-build
npm ci --include=dev
npm test                # 43/43（数据真相 + 身份门禁 + 请求层）
npm run lint
npm run build           # 静态导出 → out/
rsync -a --delete out/ /var/www/self-space/gui/
```

环境变量（构建期）：

| 变量 | 生产值 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_RETURN_ORIGIN` | **留空** | 同源 `/api`（见硬规则 1） |
| `NEXT_PUBLIC_BASE_PATH` | `/gui`（默认） | 站点挂在 `/gui/` 下；若要挂根目录，构建时显式置空 |

## 4. nginx 配置（同源 `/api`，模板）

```nginx
server {
    listen 443 ssl http2;
    server_name ymai.fun;                 # 以实际域名为准（Gui CNAME: ymai.fun）

    # ssl_certificate     /etc/letsencrypt/live/ymai.fun/fullchain.pem;   # certbot
    # ssl_certificate_key /etc/letsencrypt/live/ymai.fun/privkey.pem;

    # —— Gui 静态导出（basePath=/gui；out/ 内容去掉 /gui 前缀后映射）——
    location /gui/ {
        alias /var/www/self-space/gui/;
        try_files $uri $uri/ $uri/index.html =404;
    }
    location = / { return 302 /gui/; }

    # —— Return runtime（同源 API）——
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 150s;          # LLM 长响应（Return 内部超时 90s + 余量）
        client_max_body_size 128k;        # Return 侧限制 64kb JSON，留余量
    }
}
```

若选择 `NEXT_PUBLIC_BASE_PATH=""`（根路径部署）：把 `location /gui/` 改为 `location / { root /var/www/self-space/gui; try_files $uri $uri/ $uri/index.html =404; }`，并删除 302 跳转。

## 5. 上线核对清单（Founder Alpha 之前逐项打勾）

- [ ] DNS：域名 A/AAAA 记录指向主机；`certbot` TLS 就绪
- [ ] Return：`npm test` 69/69 PASS（部署机上真实执行）；systemd active；`ss -tlnp | grep 3000` 仅 127.0.0.1
- [ ] Provider：`USER_LLM_*` 已配置且 **CF001 真实模型重放已人工评审**（`npm run alpha:canonical`，结果 PASS/REVISE/FAIL 三选一记录——这是 Founder Alpha 门禁的一部分，部署不替代评审）
- [ ] 邀请码：`node operator.js invite` 已生成并私下交付 Founder
- [ ] Gui：`npm test` 43/43、`npm run lint`、`npm run build` 全绿；`out/` 已发布
- [ ] 身份：第二个人在同一浏览器（不清存储、不删 cookie）打开只看到门禁；`/api/me` 未认证必须返回 401
- [ ] 身份：`退出这个空间` 只调用 `/api/logout`——对话与记录原样留在服务端，重新登录立即可见
- [ ] nginx：`nginx -t` 通过；`/gui/` 可打开；`/api/state` 未认证返回 401（不是 404/502）
- [ ] 端到端真实旅程：进入 → 发送 → 离开 → 回归（reality return 可见）→ 结束会话（带/不带 carry）→ 删除全部（真实删除）
- [ ] 故障演练：停掉 provider（错误 key）→ Gui 显示「暂时没有连上。你刚才说的话都在，没有丢。」且重试不重复发言
- [ ] 备份：`R0_DATA_DIR` 定时 rsync/快照；恢复演练一次
- [ ] 隐私核对：服务器访问日志不记录 `/api/message` 请求体（nginx 默认只记行，确认无 body 日志）；evidence 只存指纹（Return 侧已保证）

## 6. 运行期纪律（来自 Constitution / Kernel Contract）

- 系统退出后，人应该更能自己生活——**不建留存机制、不推送、不打卡**。
- 真实失败驱动： Founder 使用中发现失败 → 复现 → 最小结构修正 → 永久回归 → 重跑原场景。
- 下一阶段新任务只能由真实 Founder 使用产生；本 runbook 的后续变更走正常 PR + `gui-ci` / `return-core-ci` 门禁。
- GitHub Pages 不再自动发布（见 §1）；如需重新启用静态发布，先满足 `pages.yml` 守卫的书面条件。

## 7. 回滚

- Gui：保留上一版 `out/`（`rsync` 前先 `cp -al` 一份带时间戳的副本），`mv` 秒级回滚。
- Return：systemd `Restart=on-failure`；版本回滚 = `git checkout <上一次 69/69 PASS 的 sha>` + `npm ci && npm test` 通过后再重启。
- 数据：只增不删（除参与者主动 delete-all / operator delete）；回滚代码不回滚数据。
