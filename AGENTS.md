# AGENTS.md — pos-sidework-app

> Read this file first, before writing any code in this repo.

## Start here

Read the six context files in this repo root, in this order:

1. `project-overview.md` — what the product is and is not.
2. `architecture.md` — stack, module map, and the invariants that must not break.
3. `code-standards.md` — how code must look.
4. `ai-workflow.md` — spec-first workflow, verification, and review rules.
5. `ui-context.md` — design system and page behaviours.
6. `progress.md` — what is done, what is next, what is blocked, what is undecided.

Then read the spec for the feature you are building in `specs/`. If there
is no spec, write one (`specs/TEMPLATE.md`) and get it approved before coding.

## The three rules that matter most

1. **Schedule and Sidework are independent modules.** Their only
   intersection is the score → suggestion, read-only.
2. **AI never acts alone.** Drafts, suggestions, screening, and summaries
   are advisory only. Publishing, cancelling, failing, messaging, docking,
   and firing are manager-only, explicit clicks.
3. **Score denominator.** On an assigned day, only assigned items count.
   An unassigned employee is not scored — never a 0, never the full list.

## Do not

- Do not change the stack, move the nav, or add a dependency without a
  user decision.
- Do not invent real data (checklist, employee names, POS brand, prices).
- Do not expose PINs, keys, or tokens.
- Do not implement a proposal the user has not answered. "好" = approved,
  "都要" = decided. Silence is not approval.

## After finishing

Update `progress.md` with the change and the commit hash, verify the build
and the changed flow end-to-end (including the employee's view), screenshot
any changed page, and verify the repo head after pushing.
