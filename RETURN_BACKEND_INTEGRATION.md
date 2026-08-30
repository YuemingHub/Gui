# Product architecture note · Gui and Return are independent products

> Current authority. Updated 2026-08-30.
>
> This corrects an earlier framing of this document. The earlier text described
> Gui as the future formal frontend for the Return backend. That framing is
> withdrawn; see the correction note below. The earlier content is retained
> after this section for provenance, but it is historical only.

## Current relationship

```text
ymai.me
  = shared entry surface (two doors)

YuemingHub/Gui
  = existing independent product
  = local-first personal space (seven modules, localStorage only)
  = its own data, its own state model, no backend

YuemingHub/Return-to-oneself
  = independent product
  = 「我和自己 / Self Space」
  = server-side conversation runtime (memory authority, safety, correction,
    reality return, provider orchestration) served by the Return Node backend

ymai.me provides one entry to each. They are not frontend/backend of each other.
```

Neither repository is the frontend or backend of the other:

- Gui must not call the Return backend, must not embed Return conversation/memory/safety logic, and must not migrate its local data to any server.
- Return ships its own product interface (the Founder Alpha shell in `web/public/`) and does not render inside Gui.
- The ymai.me entry surface links to both; it does not merge them.

The deployment on ymai.me is purely an entry/routing concern:

```text
ymai.me/        → two-door entry page
ymai.me/gui/    → Gui static export (independent product)
ymai.me/return/ → Return product (Founder Alpha shell + Node backend)
```

## Withdrawn statement

Wrong previous statement:

```text
Gui = Return formal frontend
Return = Gui backend
```

Corrected to:

```text
Gui and Return are independent products behind the ymai.me entry surface.
```

The earlier text below remains as historical design context. Where it implies
Gui is the intended frontend for the Return backend, that implication is
superseded by this note.

---

# (Historical) Gui ↔ Return-to-oneself integration boundary

> Coordination target: 2026-08-29. Historical reference only; the current
> relationship is defined above.

## 1. Product relationship (historical framing — superseded)

The text below described a future in which Gui served as the presentation
layer for the Return backend. That is not the current architecture.

## 2–8. (Retained for provenance)

The sections that followed described a possible frontend/backend split:
ownership of visual/navigation/local state in the frontend; no duplication of
life interpretation, product routing, safety authority, long-term memory,
correction semantics, reality-return logic, embodied-learning state or
provider policy; and an API rule that treats the backend as the source of
session truth and makes failure honest.

Those constraints still describe a sound boundary *if a frontend/backend split
were ever adopted between two products*, but they do not make Gui and Return
one product. As of 2026-08-30 they are independent products each reached from
the ymai.me entry surface.
