# ARCHITECTURE

## 目标

这个项目的技术目标很明确：

- 只做前端
- 本地优先
- 刷新不崩
- 数据结构集中
- 存储访问统一
- 对损坏数据有恢复能力
- 尽量不引入额外依赖

## 应用结构

```text
app/
  layout.tsx
  page.tsx
  globals.css
  hooks/
    useAppStorage.ts
  lib/
    defaults.ts
    storage.ts
    types.ts
components/
  layout/
    AppShell.tsx
    Navigation.tsx
    WelcomePanel.tsx
    DataToolsPanel.tsx
  sections/
    HomeSection.tsx
    TruthWorkshop.tsx
    ClearingRoom.tsx
    SilenceCabin.tsx
    RhythmSection.tsx
    GardenSection.tsx
    MonthlyReview.tsx
  ui/
    ConfirmButton.tsx
    EmptyState.tsx
    Field.tsx
    GentleNotice.tsx
    SectionFrame.tsx
```

## 状态模型

顶层状态由 `AppState` 统一描述，定义在 `app/lib/types.ts`。

核心字段：

- `daily`
- `truths`
- `clearings`
- `boundaries`
- `rhythm`
- `gardenItems`
- `monthlyReviews`
- `preferences`

其中：

- `preferences.onboardingDismissed` 用来记录欢迎引导是否已被关闭

这样做的目的，是把所有持久化内容都纳入同一棵状态树，避免散落在多个 localStorage key 或多个局部组件状态里。

## 初始值

`app/lib/defaults.ts` 负责：

- 定义默认枚举项
- 创建初始对象
- 生成默认边界数据
- 生成默认偏好配置

`createInitialState()` 是整个应用的初始状态入口。

所有重置与异常回退，最终都应回到这套默认结构。

## 持久化设计

### 1. 单一存储入口

`app/lib/storage.ts` 是唯一的存储层：

- `loadStateFromStorage()`
- `saveStateToStorage()`
- `normalizeState()`
- `exportStateToJson()`
- `importStateFromJson()`
- `resetStoredState()`

组件本身不直接处理 JSON 结构，也不自己做局部存储协议。

### 2. 归一化优先

`normalizeState(raw)` 是稳定性的关键。

无论数据来自：

- 浏览器已有 localStorage
- 用户导入的 JSON 文件
- 旧版本不完整结构
- 部分字段被污染或手动修改

都会先经过归一化，再进入 React 状态。

这样可以避免：

- 刷新后因结构异常直接崩溃
- 字段缺失导致页面 render 失败
- 非法枚举值污染 UI

### 3. localStorage-only

当前版本不接入：

- 服务端数据库
- 认证系统
- 远程 API
- 云同步

因此持久化完全依赖浏览器 localStorage。

## Hook 设计

`app/hooks/useAppStorage.ts` 是客户端状态编排中心。

它负责：

- 首次挂载后安全读取 localStorage
- 状态变化后自动保存
- 暴露 `saveMessage`
- 暴露 onboarding 操作
- 暴露 import / export / reset 操作
- 处理读取失败与保存失败提示

### 为什么要延迟到 effect 中读写

项目使用 App Router，并优先保证 SSR / hydration 稳定。

因此：

- 初始 render 使用 `createInitialState()`
- 挂载后再读取浏览器存储
- 通过 `setTimeout(..., 0)` 避免触发 React 相关 lint 问题与不必要的水合冲突

## 页面装配

`app/page.tsx` 只做两件事：

1. 从 `useAppStorage()` 拿到全局状态和动作
2. 按 `SectionId` 渲染对应 section，并把更新回调接回 `setState`

它不负责业务存储细节，也不承担复杂 UI 布局职责。

## Shell 设计

`components/layout/AppShell.tsx` 是产品外壳。

它负责：

- 页面总体结构
- 顶部说明与氛围文案
- 导航切换
- hash section 恢复
- WelcomePanel 接入
- DataToolsPanel 接入
- 各 section 的渲染容器

### hash 恢复

当前通过 `window.location.hash` 解析初始 section。

这样刷新后可以尽量停留在用户刚才所在模块，而不是每次都回到首页。

## UI 组件原则

UI 层遵循几个约束：

- 优先复用已有基础组件
- 不做大而泛的抽象
- 文案温和、低刺激
- destructive 操作必须确认

典型复用组件：

- `Field`
- `SectionFrame`
- `GentleNotice`
- `ConfirmButton`
- `EmptyState`

## 数据工具区

`components/layout/DataToolsPanel.tsx` 提供四类动作：

- 导出本地备份
- 导入备份文件
- 再看一次开始说明
- 重置全部内容

其作用不是“设置中心”，而是最低必要的数据主权入口。

## 欢迎引导

`components/layout/WelcomePanel.tsx` 是轻量 onboarding。

特点：

- 不是弹窗拦截
- 不阻断输入
- 可以关闭
- 可以从数据工具区重新打开

这符合项目“安静、不逼迫、不制造操作负担”的方向。

## 当前已知取舍

### 刻意保留的简单性

- 没有状态管理库
- 没有表单库
- 没有后端接口层
- 没有复杂路由系统
- 没有测试框架接入

### 原因

当前阶段先保证：

- 结构清楚
- 数据稳定
- UI 可维护
- lint / build 可通过

等真实使用模式稳定后，再决定是否需要更重的技术方案。

## 后续扩展建议

如果进入下一阶段，优先顺序建议为：

1. 补齐手动 QA 并固化 checklist
2. 增加少量关键单元测试（先围绕 `normalizeState`）
3. 完善文档与发布说明
4. 视需要再考虑 PWA / 多端导入导出体验

不建议过早引入后端或复杂协同能力。