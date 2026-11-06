# AI Workflow — pos-sidework-app

> Spec-driven context file 4 of 6. How an AI coding agent works on this repo.
> Method adopted from the "How Senior Engineers Actually Build With AI in
> 2026" video (spec-driven development). The video's *stack* is not adopted.

## The rule

**Spec first, code second. The human decides architecture and trade-offs;
the agent implements to the spec and proves it with a test.**

Vibe coding (idea → prompt → code → fix → repeat) is what produced the
early drift in this project — e.g. the score denominator bug, where the
assignment feature and the scoring feature were built in different sessions
and nobody re-checked the denominator. The six context files in this repo
exist to stop that: a new session must read them before writing code.

## Before writing any code

1. Read all six context files in this repo root
   (`project-overview.md`, `architecture.md`, `code-standards.md`,
   this file, `ui-context.md`, `progress.md`), plus `AGENTS.md`.
2. Read the spec for the feature you are about to build. Every feature has
   its own spec in `specs/` (see below). If there is no spec, write one
   first and get the user to approve it — do not start coding from a
   one-line request.
3. Check `progress.md` for open decisions and blocked items. Do not build
   something the user has not approved, and do not build around a blocked
   account/key by inventing credentials.

## Feature spec template

Each spec lives at `specs/<feature>.md` and contains:

- **Goal** — one paragraph, user-visible outcome.
- **Scope** — in scope / explicitly out of scope.
- **Invariants** — which rules from `architecture.md` it must not break.
- **Acceptance checklist** — observable behaviours, each testable through
  the API or the UI (e.g. "Anna assigned 2 items, completes both → score
  100, provisional until reviewed; Ben unassigned → not scored").
- **What it does not change** — modules and endpoints that must stay
  untouched.

A template is at `specs/TEMPLATE.md`.

## While coding

- One feature per commit. Keep the change surface small: name the files you
  will touch in the spec, and do not modify unrelated modules. If a fix
  touches a second module, say so in the spec first.
- When an error appears, narrow the fix: error, reproduction steps, related
  files, expected behaviour. Never "fix everything" in one pass.
- After coding, update `progress.md` (what changed, commit hash, what is
  still open) in the same commit or the next one — a finished feature with
  a stale progress file is not finished.

## Verification (mandatory, not optional)

- Build passes (`npm run build`).
- End-to-end API test of the changed flow, including the employee's view
  after a manager action (the manager's view alone is not proof).
- Screenshot of any changed page.
- After a push, verify the repo head. If the push dies mid-call, check the
  head before retrying.

## Code review

- Every AI-generated change gets a review pass before it is shown to the
  user: permissions (can an employee see another employee's data?),
  the approval gate (did anything auto-apply?), the score denominator,
  and language (every new string in `i18n.js`, EN + 中文).
- The user is the final reviewer for product decisions. Short replies are
  approvals: "好" = approved, "都要" = decided. A proposal the user has
  not answered is not approved — do not implement it.
