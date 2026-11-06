# Code Standards — pos-sidework-app

> Spec-driven context file 3 of 6. How code in this repo must look.

## General

- Small, reviewable commits, one feature per commit, message in English
  describing the user-visible change (e.g. "Score denominator by assignment
  + daily report v2"). Never bundle an unrelated refactor into a feature
  commit.
- Never invent numbers, names, or business data. Demo data is Anna / Ben /
  Chris and the 10 seeded sidework tasks only. Real checklists, employee
  names, and the POS brand are unknown — do not fabricate them.
- Never expose a PIN, password, API key, or token in code, logs, screenshots,
  or commit messages. PINs are hashed only; the seed PINs above are demo
  values, not production secrets.
- Do not add a dependency, a new service, or a new stack without a user
  decision. The stack is fixed in `architecture.md`.

## Backend (FastAPI + SQLAlchemy)

- All backend calls go through routers in `backend/app/routers/`; business
  rules go in `backend/app/services/`, never inline in a router.
- Manager-only actions use `require_manager`; employee-scoped reads use
  `get_current_user` and must filter by that employee's id. Employees must
  never see other employees' schedules, records, scores, or report messages.
- New columns on an existing table go through `database.py::
  ensure_new_columns()` (ALTER TABLE if missing) so the user's existing Mac
  database keeps working — never assume a fresh database.
- Errors: return a clear message in the user's language when it is a
  user-facing error; do not leak stack traces to the client.
- AI paths must degrade gracefully without keys: no-key mode returns a
  safe fallback (screening → unclear/needs review; email → preview-only),
  never an exception and never a fabricated verdict.

## Frontend (React + Vite)

- All API calls live in `frontend/src/api.js`. Pages never call `fetch`
  directly.
- All user-visible strings go through `frontend/src/i18n.js` (EN + 中文).
  Never hard-code a user-facing string in a page. Data titles use the
  `"English || 中文"` format and `displayText()`.
- Keep the Apple-style design system: background `#F5F5F7`, white cards,
  radius 16–18, primary `#007AFF`, green `#34C759`, red `#FF3B30`. See
  `ui-context.md`.
- Do not change the approval gate in the UI: a suggestion, draft, or
  screening result must never apply itself. The manager's explicit click
  (Adopt / Publish / Approve / Pass / Fail) is the only trigger.

## Testing before a push

1. `cd frontend && npm run build` must pass.
2. Start backend + frontend, seed demo data, and exercise the changed flow
   end-to-end through the API (not just by reading the code): create → read
   → the manager action → the employee's view.
3. Screenshot the changed page (desktop, and mobile width if the layout
   changed). Screenshots live outside the repo in
   `~/workspace/screenshots/pos-app/`.
4. Push with the NUL-delimited paths file (newline lists fail) and verify
   the repo head afterwards; a push that dies mid-call must be checked
   against the head before any retry — never blind-retry.
