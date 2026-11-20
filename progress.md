# Progress — pos-sidework-app

> Spec-driven context file 6 of 6. What is done, what is next, what is blocked.
> Update this file with every change. Last updated: 2026-11-20.
> Repo head: `8592abe`; responsive UI work below is uncommitted, not pushed.

## Responsive workspaces (2026-11-20)
- Approved scope: `specs/responsive-workspaces.md`. Phone role-specific bottom
  tabs and More directory; compact tablet rail; full/collapsible desktop sidebar.
- Schedule: phone daily list, tablet day/week toggle, desktop week grid;
  retained custom shifts, drafts, editing, cancellation and explicit publishing.
- Accounts/score tables become labelled phone rows; account search remains visible.
  Dashboard prioritizes review/exceptions; workspace widths vary by task.
- Touch sizing, safe areas, visible focus and constrained mobile task modal;
  modal traps Tab, restores focus and supports Escape. EN/ZH navigation labels.
- Verified `npm run build` (47 modules) and `git diff --check`.
- Playwright: 304 rendered page checks across Owner/Manager/Anna, EN/ZH and
  widths 375, 390, 540, 768, 834, 1024, 1280, 1440; no page-level overflow
  or browser JavaScript errors. Screenshots visually inspected for phone,
  tablet and desktop. Tests wait for loaded content, not merely loading screens.
- Real local API/UI flow verified: custom shift → draft → publish → employee
  visibility → edit → cancel → employee removal. All mutations used isolated
  `/tmp/pos-responsive-verification.db`, not the project's normal database.
- Modal verified at 390×844, reduced-height 390×480, 834×1194, 1440×1000;
  16px inputs, viewport bounds, Tab trap and Escape. Physical iOS keyboard/
  Safari behavior has NOT been verified; reduced viewport is only an approximation.
- Reusable checks: `scripts/verify_responsive.py`, `scripts/verify_responsive_flow.py`
  (requires `POS_ISOLATED_TEST_DB=1`), `scripts/verify_responsive_modal.py`.
  They require a running demo frontend on port 5173, seeded backend on port 8000,
  and Python Playwright with Chromium (installed in `/tmp/pos-responsive-venv`).
- Screenshots/results: `/tmp/pos-responsive-artifacts/` (temporary local files).
  Backend business logic and repository dependencies unchanged; pre-existing
  context-document relocation left intact. No commit or push performed.

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

## 登录页去掉品牌大面板，只留 logo (2026-11-19，用户亲口：那块没必要，取消掉，但可以有一个 logo)
- 登录页改回居中一张白卡：顶部只放 Yardkoo logo，下面是 Welcome back + 账号密码 / PIN 登录 + 快速演示登录（都保留）。分屏 `.login-split` / `.login-brand` 样式已删。
- 验证：build 通过；Playwright 截图验过电脑 1440 与手机 390，零横向溢出（`login-desktop.png`、`login-phone.png`）。
- **经过：** 用户在 Team & Roles 里把 owner 账号停用了，owner 登不上。之前只禁了删 owner，没禁停用 owner——这是个缺口。
- **修复：** `PATCH /api/accounts` 停用 owner 直接 403（"Owner 账号不能停用"）；停用自己的账号也 403（防止把自己锁在外面）。Team & Roles 里 owner 行和自己的行不再显示停用按钮，改显示 "Owner 账号不能停用"。员工停用/启用不变。
- **恢复已停用的 owner：** `seed()` 启动时新增 `ensure_active_owner()`——若没有任何 active owner，就把所有 owner 账号重新激活（只动 owner，不碰员工/经理的停用状态）。用户 Mac 上 `git pull` 后重启容器，owner 自动恢复、直接能登。
- **验证：** scratch DB 10/10 通过（停用 owner 403、经理停用自己 403、停用 Anna 200 且登录 401、重新启用后登录 200）；另测启动自愈：库里 owner 置 0 后重启，owner 恢复 1 且登录 200，Anna 状态不受影响。前端 build 通过。
- **Inactive/login bug — root cause found:** only `PATCH /api/accounts` writes `is_active=False`; seed never sets it, default is True, no startup/migration path deactivates anyone. The demo staff were deactivated by tapping Deactivate while testing — not a code bug. Fix is UX: confirm before deactivating ("停用后该员工无法登录，确定停用？"), Inactive rows dimmed with amber pill, Activate stays prominent. No silent re-activation job added (would undo a deliberate manager decision). Verified on a fresh scratch DB: seeded staff active, anna/anna123 login 200.
- **Tasks list:** row numbers are now the display index in the filtered list (never `sort_order`); backend `sort_order` = max in group + 1 (deactivated tasks no longer cause duplicates); blank title rejected (400). The "1"-titled row was user test data, not deleted.
- **Standard photo + multi-photo:** `SideworkTemplate.standard_photo_path` + new `SideworkPhoto` table; `POST /api/sidework/templates/{id}/standard-photo` (manager); `POST /api/sidework/complete` takes multiple `files`; `POST /api/sidework/records/{id}/photos` adds photos to an existing record; `GET /api/sidework/my/today` returns `standard_photo_url` + `photos[]`. Today item: standard photo on top → standard text → your photos (multi, thumbnails) → notes → big ☑️ button. Photo + note still enforced (400 otherwise). No standard content invented — empty until the manager uploads.
- **Delete user:** `DELETE /api/accounts/{id}`; manager deletes employees only, owner deletes anyone except self and the last owner; cascades schedules/assignments/records/photos; UI confirm dialog states what is deleted.
- **Notifications:** `GET /api/notifications` built only from real tables — pending review aggregate, shift conflicts (next 7 days, "closing" = 23:00), today's non-keep AI suggestions, today's completions by employee. No clocked-in events (no data). Bell in top bar + mobile header, unread badge, dropdown, opening marks read (localStorage). Manager/owner see all, employee sees only own.
- **Yardkoo theme + logo:** real logo from yardkoo.com (`Yardkoo-03.png`, the site's own apple-touch-icon) — the pixel-exact PNG is kept in `brand-assets/` outside the repo; the repo ships SVG recreations (`frontend/public/yardkoo-logo.svg` / `yardkoo-mark.svg`, same 4-petal mark + wordmark in `#305020`) because the GitHub push channel only accepts UTF-8 text files. Tokens recolored to the site palette — primary deep teal `#2F4F4F`, pale mint `#DFF0EB`/`#EDF3F1`, page `#F7F7F7`; Server/"all" role color teal. App name stays StorePulse; logo/wordmark is Yardkoo.
- **Login split screen:** dark-teal brand panel (logo on white chip, badge, two-line headline, subtext, 3 green-check bullets) + "Welcome back" form (Username/Password, Sign in, QUICK DEMO LOGIN with Owner/Manager/Anna buttons that fill and submit). Username+password AND PIN toggle both kept; demo hint kept. Stacks on phone.
- **Responsive (verified):** Playwright, no horizontal overflow at 1440×900, 1180×820 (iPad landscape), 820×1180 (iPad portrait), 390×844 (phone) for Login, Dashboard, Today (+ Tasks, Team & Roles, notifications panel on desktop). Sidebar on desktop/iPad-landscape, bottom nav on phone; top-bar search hidden ≤1100px; tables scroll inside their card; modal max-height 90vh. Screenshots `~/workspace/screenshots/pos-app/28`–`35`.
- Verification: `npm run build` passes; `py_compile` passes; scratch-DB smoke test 29/29 (seed active + anna 200; complete 400/400/400/200; 2-photo round-trip + add 1 = 3; standard photo round-trips; blank title 400; sort_order unique; delete works, self-delete + manager-delete-owner refused, owner deletes manager ok; notifications real-only, employee scoped).

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

## Rename 2026-11-18 (user picked StorePulse)
- App renamed from "Schedule · Sidework" to StorePulse (user picked it from the three options). i18n appName/login title (EN+ZH), sidebar subtitle, index.html title, FastAPI title. Store name in the top bar stays "Yardkoo".

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
