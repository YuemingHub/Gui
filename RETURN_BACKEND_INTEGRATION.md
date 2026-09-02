# Gui ↔ Return-to-oneself Integration Boundary

> Coordination target: 2026-08-29
>
> This document is the live integration boundary for the first Gui vertical slice. The frozen HTTP contract lives in Return `docs/r0/GUI_RETURN_API_CONTRACT.md`. The seven-module local space remains as recoverable provenance and is not auto-migrated.

## 1. Product relationship

```text
Gui
  = 「我和自己」的正式前端呈现层

Return-to-oneself
  = 「我和自己」的后端 / 产品内核
```

Target relationship:

```text
Gui
  ↓ stable, explicit API
Return-to-oneself
  ↓
conversation / continuity / memory authority / correction / safety / learning / reality loop
```

The frontend should feel like one coherent place. The architecture underneath may remain replaceable.

## 2. What Gui owns

Gui may own:

- visual system and brand expression;
- responsive layout;
- navigation;
- conversation rendering;
- composer interaction;
- session/history presentation;
- accessibility;
- loading/retry/error states;
- user-visible privacy/data controls;
- local ephemeral UI state;
- graceful offline/read-only presentation where appropriate.

## 3. What Gui must not duplicate

Do not implement a second copy of:

- life interpretation rules;
- product capability routing;
- Safety authority;
- long-term memory authority;
- correction semantics;
- “what counts as reality return” logic;
- embodied-learning state/contract;
- AI hypotheses as durable user facts;
- provider orchestration policy.

Those responsibilities belong to Return backend/runtime.

A visual component may display backend-owned state when the user benefits from seeing it, but the frontend must not independently infer the state from conversation text and then treat the inference as truth.

## 4. Current seven-module UI

The existing local MVP currently exposes seven sections (`回到自己 / 真戏工坊 / 清场室 / 静音舱 / 三色节奏 / 半成品花园 / 月度清场`).

They are useful design/product experiments, but they are **not automatically the final information architecture** once the Return backend is connected.

Do not delete or expand them merely for conceptual consistency.

Before deciding whether a section survives, ask:

1. Does a real Self Space user need this surface?
2. Is the same value already available naturally through conversation/reality loops?
3. Does showing this section increase agency and clarity, or create another system the person must manage?
4. Is the data represented here user-authored reality or an AI inference?
5. Can the surface remain quiet until it is actually useful?

The final product may retain, merge, hide or remove sections based on real use.

## 5. First backend integration slice

Do not connect every historical feature at once.

The first stable integration should cover only:

```text
enter/auth
current session state
send message
provider failure + retry
new session
session list
read-only historical session
end session / 今天先到这里
return continuity
delete all
```

This mirrors capabilities already present in the Return R0 backend and is enough to replace the temporary Founder Alpha shell without moving product logic into Gui.

## 6. Later capability surfaces

Only after real use proves the need, Gui may add user-visible surfaces for:

- what the system currently remembers;
- user correction/removal of remembered items;
- reality-return review;
- embodied-learning progress based on actual practice evidence;
- user-approved external execution handoff;
- personal archives/reflections.

These should not become dashboards by default.

## 7. Interaction principles

Keep the existing useful constraints:

- no scores/rankings/streak pressure;
- no artificial growth anxiety;
- no notification coercion;
- no fake urgency;
- no “AI knows the real you” framing;
- current reality can always overturn old system understanding;
- the person can stop, change topic, reject an interpretation or delete data.

## 8. API design rule

Prefer semantic endpoints and stable contracts over frontend knowledge of backend internals.

For example, the frontend should ask the backend for session state rather than reconstructing session truth from local message arrays.

The API must make failure honest:

- provider unavailable is not represented as user failure;
- message persistence and response-generation success are separate facts;
- retry must not silently duplicate participant messages;
- old sessions are not silently merged into a new active session;
- deletion has a clear, user-visible consequence.

## 9. Migration rule

When Return backend is ready for Gui integration:

1. preserve the current local-only MVP as a recoverable baseline;
2. connect one vertical journey end-to-end;
3. verify desktop and mobile;
4. verify new-session/history/scroll/retry/return/delete behavior;
5. run real semantic conversations, not only mocked UI tests;
6. remove duplicated frontend logic only after the backend path is proven;
7. do not migrate local data to the server implicitly.

## 10. Immediate non-goals

Until the Return backend behavior is stable, do not:

- redesign all seven sections;
- build a frontend memory engine;
- add a client-side AI router;
- add growth analytics;
- create a second identity/profile model;
- bind Gui directly to Workbench/AAOP;
- make Gui responsible for Family Space.

The near-term goal is simpler: let the mature Self Space backend eventually inhabit a calm, coherent frontend without splitting the product into two brains.
