# Spec: BrewLab-style UI redesign

> User sent 14 screenshots of a "BrewLab" app (2026-11-18) and asked to
> redesign our app to that UI, employee views first. Also: every checklist
> task requires a photo upload AND notes to complete; manager checklist
> templates must be categorized by role (server, bus, host, manager, bar…).

## Goal

The app keeps every page and behaviour it has today, but looks and reads
like the BrewLab reference: indigo primary, light lavender-gray page,
white cards, role pills, stat cards with progress bars, avatar circles,
checklist cards per segment — and the employee Today page becomes the
polished checklist experience (photo + note required per task), while the
manager Tasks page groups templates by role.

## Scope

- In scope:
  - New design tokens in `frontend/src/index.css` (indigo `#4F46E5`,
    page bg `#F4F5FB`, white cards radius 14px, soft shadow, 15px base).
    Tailwind directives stay at the top of `index.css`.
  - Desktop top bar: static store name "Yardkoo", decorative search
    input, avatar + name + role at right. No fake multi-store selector,
    no fake "View as …" role switcher — roles come from real login.
  - Left sidebar: indigo brand mark, WORKSPACE label, new nav labels
    (below), active = light indigo bg + indigo text, user card at
    bottom, Collapse button that hides nav labels (sidebar narrows).
  - One shared role → color map in `frontend/src/roles.js`, used by
    every role pill, schedule chip and avatar: Server indigo/blue,
    Busser/Bar amber, Host cyan, Manager purple, Cook red/pink,
    Cashier green, Shift Lead purple, Dishwasher gray, "all" indigo.
  - Nav mapping (all existing pages kept, only relabelled/regrouped):
    - Employee: My Schedule → SchedulePage, My Checklists → TodayPage,
      My Score → ScorePage.
    - Manager AND Owner: Live Operations → DashboardPage,
      Schedule Builder → SchedulePage, Checklist Templates → TasksPage,
      Team & Roles → AccountsPage, AI Assistant → Suggestions page
      with a tab toggle at top to switch to the AI Draft page
      (DraftPage rendered inline as the second tab, no new route),
      Report → ReportPage, Analytics → ScorePage.
    - Owner still sees NO "My" section (commit `35a1ec88`, do not
      regress). Manager keeps the My section.
  - TodayPage: one checklist card per segment (Opening/Midday/Closing)
    with header, "x of y complete" + progress bar. Each item: status
    circle, title, role pill, standard text, photo upload + note
    input. Done items: green check circle + strikethrough +
    "Completed at HH:MM" line. Mark Complete requires BOTH a photo
    file (or a previously uploaded photo) AND a non-empty note —
    frontend validation with a clear message AND backend enforcement.
  - TasksPage (Checklist Templates): role tabs across the top
    (All + one tab per role from GET /api/roles). Each task row:
    drag-handle look (visual only), order number, title, role pill,
    segment + optional tags, standard text. Add-task form becomes a
    modal (overlay card) with role select, segment select, optional
    checkbox, standard input, photo-required checkbox. Daily
    assignment section kept, filtered by the same role tab.
  - SchedulePage: Excel-style click-to-edit grid unchanged, but each
    shift renders as a colored chip by the shift template's role
    (shared role map), plus a role legend under the grid.
  - DashboardPage (Live Operations): stat cards row from the existing
    overview data only (completion %, done/total, pending review,
    low-score count), per-person rows with avatar + role pill +
    progress bar, watchlist as the flagged list, by-segment rates,
    timeline, leaderboard, per-person reports, Send button — all
    restyled, no invented metrics (no fake deltas).
  - AccountsPage (Team & Roles): table with avatar, name, role pills,
    status, app-role control, plus a working search filter by name.
    Add-account form, roles management and owner settings kept,
    restyled.
  - ScorePage (Analytics): restyled with the new tokens; same table
    data and meaning.
  - Login page: indigo brand mark; demo-accounts hint and both login
    modes kept.
  - Backend: `POST /api/sidework/complete` rejects with 400 when no
    photo file is attached AND no photo was previously uploaded for
    that record, OR the note is empty. Applies to ALL tasks now,
    regardless of the template's `requires_photo` flag (kept for
    compatibility, not removed). `GET /api/sidework/my/today` also
    returns `completed_at` (additive, for the "Completed at" line).
  - `seed.py`: idempotent `ensure_roles()` runs on EVERY startup
    (before the empty-employees early return) and adds missing roles
    "Busser" and "Bar" (plus Server/Cook/Manager/Host). Demo
    employees/tasks untouched.
- Explicitly out of scope:
  - App rename (name choice still open with the user — keep
    "Schedule · Sidework" / `L.appName` as is).
  - Any change to the score formula, approval gate, module
    independence, or any API shape except the complete-endpoint
    validation and the additive `completed_at` field.
  - Real checklist / employee data (do not invent), new dependencies,
    moving the nav to the top, multi-store, drag-and-drop reordering
    (drag handle is visual only), search that actually filters
    anything (top-bar search is decorative for now).

## Invariants

- Schedule and Sidework stay independent modules; score → suggestion
  is the only intersection, read-only.
- Approval gate unchanged: nothing auto-publishes, cancels, fails,
  messages or docks.
- Score denominator unchanged: assigned day → only assigned items
  count; unassigned → not scored.
- Language: every new string in `i18n.js`, EN + 中文; switch stays
  only in Profile; default English.
- Cancel-don't-delete, deactivate-don't-delete unchanged.
- Mobile: bottom tab bar + sticky blurred top header kept; sidebar
  hidden under 768px.

## Acceptance checklist

- [ ] `npm run build` passes.
- [ ] Owner login: sidebar shows only Live Operations / Schedule
      Builder / Checklist Templates / Team & Roles / AI Assistant /
      Report / Analytics — no My section.
- [ ] Manager login: My section present (My Schedule, My Checklists,
      My Score) plus the manager section; AI Assistant tab switches
      between Suggestions and AI Draft without a route change.
- [ ] Employee login (anna/anna123): My Checklists shows segment
      cards with progress; Mark Complete with no photo → clear error
      and no record created; with photo but empty note → clear error;
      with photo + note → done, green check + strikethrough.
- [ ] Backend: POST /api/sidework/complete with no file and no prior
      photo → 400; with file but empty note → 400; with both → 200.
- [ ] Tasks page: role tabs filter the list; "Bar" and "Busser" tabs
      exist (seeded); add-task modal creates a task with role/segment/
      standard and it appears under its role tab.
- [ ] Schedule grid still edits by click; shifts render as role-colored
      chips.
- [ ] Dashboard shows the same numbers as before the redesign
      (completion, done/total, pending review, low count).
- [ ] Screenshots of Dashboard, Today, Tasks (desktop) taken.

## What it does not change

- Scoring (`services/scoring.py`), suggestions, report generation,
  review flow, auth, schedule publish/cancel logic, AI draft parser,
  photo screening, email/SMS.
- `requires_photo` field semantics elsewhere (still stored, still
  shown); only the complete endpoint now requires photo+note for all.
- Demo seed employees, shifts, tasks, schedule.

## Files to touch

- `specs/brewlab-ui-redesign.md` (this file)
- `frontend/src/index.css` (design tokens + new classes)
- `frontend/src/roles.js` (new: shared role → color map, RolePill, Avatar)
- `frontend/src/i18n.js` (new nav labels + page strings, EN + 中文)
- `frontend/src/App.jsx` (nav mapping, top bar, sidebar collapse, AI Assistant tab)
- `frontend/src/pages/AiAssistantPage.jsx` (new: Suggestions/Draft tab wrapper)
- `frontend/src/pages/TodayPage.jsx` (checklist cards, photo+note validation)
- `frontend/src/pages/TasksPage.jsx` (role tabs, modal add form)
- `frontend/src/pages/SchedulePage.jsx` (role-colored shift chips + legend)
- `frontend/src/pages/DashboardPage.jsx` (stat cards, per-person rows)
- `frontend/src/pages/AccountsPage.jsx` (table + search filter)
- `frontend/src/pages/ScorePage.jsx` (Analytics restyle)
- `backend/app/routers/sidework_router.py` (complete validation, completed_at)
- `backend/app/seed.py` (ensure_roles)
- `progress.md`, `ui-context.md` (docs update)
