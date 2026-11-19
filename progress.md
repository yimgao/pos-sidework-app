# Progress — pos-sidework-app

> Spec-driven context file 6 of 6. What is done, what is next, what is blocked.
> Update this file with every change. Last updated: 2026-11-18.
> Repo head: `35a1ec88` (2026-11-18, owner nav fix).

## Done (verified by API test + screenshot)

- Route A: keep existing POS, separate lightweight app (`2026-10-29`).
- Schedule core: draft → publish, Excel-style cell editing (`32b140a`).
- Shift names only, custom time separate (`47b08030`).
- Sidework groups A–E, manager add/deactivate, daily assignment
  (`cb355534`, `35e9d772`); Tasks page collapsible groups.
- Actionable suggestions, Adopt applies a reduction (`39db694d`).
- AI batch: rule-based AI draft scheduling, 14-day rolling score, photo
  screening (no-key fallback), report email preview (`b10a015e`).
- Left sidebar nav restored after the top-bar correction (`f3aaf69`).
- Score denominator by assignment + daily report v2 (`7fa2d22`,
  2026-11-01, user picked "only these two first"): assigned days score
  only assigned items; unassigned employees are not scored and do not
  appear in suggestions; report is per-person cards in the order score →
  reasons → suggestion → message to the employee.
- Tech stack v2 scaffolding: TypeScript / Tailwind / Docker / PostgreSQL /
  OAuth / payments / SMS configs exist; only the core is actually built
  (see Blocked).

## BrewLab-style UI redesign (2026-11-18, spec specs/brewlab-ui-redesign.md)
- Indigo design system (#4F46E5, page #F4F5FB, white cards radius 14px,
  soft shadow, 15px base); shared role → color map in frontend/src/roles.js
  (Server indigo, Busser/Bar amber, Host cyan, Manager purple, Cook red,
  Cashier green, Shift Lead purple, Dishwasher gray); desktop top bar with
  static store name "Yardkoo", decorative search, avatar + name + role;
  sidebar Collapse button.
- Nav relabelled (all pages kept): employee My Schedule / My Checklists /
  My Score; manager + owner Live Operations / Review / Schedule Builder /
  Checklist Templates / Team & Roles / AI Assistant (Suggestions + AI Draft
  tabs, no new route) / Report / Analytics. Owner still sees no My section.
  Review kept in the manager nav — the BrewLab screenshots had no Review
  page, but approving/rejecting sidework evidence has no other home.
- Today: one checklist card per segment with progress bar; done items get
  green check + strikethrough + "Completed at HH:MM". Every task now
  requires a photo AND a note to complete — frontend validation + backend
  enforcement in POST /api/sidework/complete (400 otherwise, all tasks,
  regardless of requires_photo). GET /api/sidework/my/today also returns
  completed_at.
- Tasks: role tabs (All + one per role from /api/roles), rows with
  drag-handle look (visual only), order number, role pill, segment/optional
  tags, standard text; add-task form is now a modal. Assignment section
  filtered by the same role tab.
- Schedule: Excel click-to-edit grid unchanged, shifts render as
  role-colored chips + role legend. Dashboard: stat cards from existing
  overview data only, per-person avatar + role pill + progress bar,
  watchlist as flagged list. Accounts: member table + name search.
  Score: Analytics restyle, same data.
- seed.py: idempotent ensure_roles() runs every startup, adds missing
  "Busser" and "Bar" (plus Server/Cook/Manager/Host).
- Verified 2026-11-18: frontend build passes; backend smoke test (16/16)
  on SQLite — complete validation 400/400/400/200, completed_at returned,
  roles seeded, restart keeps exactly 6 roles, dashboard 200 for
  owner/manager and 403 for employee; Playwright screenshots 23–27.
- App name NOT renamed (still "Schedule · Sidework" — user still deciding).

## Fix 2026-11-18 (owner nav)
- Owner no longer sees the MY section (Schedule / Today / Score) in the sidebar or bottom nav; only the management pages (Dashboard / Review / Report / Suggestions / AI Draft / Tasks / Accounts). Manager and employee nav unchanged. Profile back button returns owner to Dashboard. (User feedback 2026-11-18: owner does not need Schedule/Today.)
- Still open: app rename (user wants a nicer name than "Schedule · Sidework").
  UI polish done 2026-11-18 (BrewLab-style redesign, see above).

## Fix 2026-11-18 (Docker on Mac, login 500)
- Login returned 500 in both PIN and username+password modes. Root cause: vite.config.js proxied /api to http://localhost:8000, but in Docker the frontend container's own localhost:8000 has nothing on it (backend is at http://backend:8000). The request never reached the backend. vite.config.js now reads VITE_PROXY_TARGET (default localhost:8000 for non-Docker dev) and docker-compose.yml sets it to http://backend:8000 for the frontend service.

## Fix 2026-11-18 (Docker on Mac, backend exited code 1)
- SQLAlchemy 2.1 makes postgresql:// default to the psycopg (v3) driver, but requirements install psycopg2-binary. database.py now rewrites postgresql:// to postgresql+psycopg2:// so the backend starts on Docker and on Vercel.

## Owner / Manager / Employee v2 (2026-11-18, spec specs/owner-manager-employee-v2.md)
- Three user types (owner > manager > employee); username+password login (PIN fallback kept); owner creates any account, manager only employees; owner settings toggle for manager visibility of per-person AI reports.
- Configurable roles (manager adds in app), tasks carry standard + segment (opening/midday/evening, midday optional) + role; Today groups by segment and shows the standard.
- Owner/manager Dashboard: overview, per-person bars, by-segment rates, check-in timeline, leaderboard, watchlist, per-person AI reports, Send to manager (email+SMS, preview-only without SMTP/Twilio).
- Verified 2026-11-18 by API test: owner/manager/employee logins, role creation, account permission boundaries, dashboard, toggle off/on, send-report preview.
- Still blocked: hosted Postgres (Neon login pending), SMTP/Twilio accounts, real checklist standards (added in-app later by user).

## Online hosting (2026-11-18, user asked to host online for manager + staff)
- Prep: JWT login (stateless, replaces in-memory tokens), CORS from ALLOWED_ORIGINS, frontend API base from VITE_API_URL, photo uploads to Vercel Blob when BLOB_READ_WRITE_TOKEN is set (local disk fallback), photo URLs absolute when API_PUBLIC_URL is set, Vercel serverless entry backend/api/index.py + backend/vercel.json.
- Still needed: hosted Postgres DATABASE_URL, Blob store + token, JWT_SECRET, two Vercel projects (frontend root=frontend, backend root=backend).

## Next (approved in principle, not yet built)

From the 2026-10-31 audit, the user has **not** approved these yet, except
where noted. Do not start them without a user go-ahead.

1. Suggestions based on the 14-day rolling score instead of the single-day
   score (single-day score stays visible as a reference).
2. Daily report auto-generated after closing (manual Regenerate / Email
   buttons exist; auto-send needs SMTP + manager email).
3. Employee management page: rename, change PIN, deactivate an employee.
4. One-time migration of old databases' seed titles to the `" || "`
   bilingual format.
5. Technical debt: per-page TypeScript migration, per-component Tailwind
   migration, pushing `package-lock.json`.

## Blocked (needs the user)

- AI API key (`AI_API_KEY`, Gemini Flash-Lite recommended) — real vision
  screening and LLM report narrative.
- SMTP + manager email (`SMTP_HOST`, `MANAGER_EMAIL`) — real report email.
- Google OAuth app (Client ID/Secret), Stripe account + charging scenario,
  Twilio account + number — those modules stay closed without them.
- Real data, still unconfirmed: the restaurant's real sidework checklist,
  employee roster and count, current POS brand, single vs multi-store,
  how strict the reduction rule should be, whether this is specifically
  for Yardkoo. Do not invent any of it.

## Open decisions (user has not answered)

- Report "message to the employee" language: currently English + Chinese
  reference, as proposed. No objection received; treat as accepted unless
  the user corrects it.
- Tasks page default: currently all groups expanded. Collapsed-by-default
  was offered, never answered.
- Charter vs implemented reduction rule: charter says talk first, reduce
  only after two consecutive low weeks; implemented rule is single-day
  score < 70 → suggest minus half a day. Needs a user decision before
  changing either side.
- Whether the user has verified the latest build on their Mac (`git pull`
  then `docker compose up --build`) — never confirmed.

## How to work from here

New work follows `ai-workflow.md`: write a spec in `specs/` first, then
implement, then test, then update this file. The detailed design docs
(`00`–`13`) live outside this repo in the workspace docs folder; these six
files are the repo-internal source of truth for a coding agent.
