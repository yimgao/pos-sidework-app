# Architecture — pos-sidework-app

> Spec-driven context file 2 of 6. How the system is built, and what must not drift.

## Stack (do not change without a user decision)

- **Frontend:** Vite + React 18 (JavaScript, `.jsx` — the per-page TypeScript
  migration is scaffolding/config only, not done), Tailwind 3 (deps/config
  only; most components still use hand-written CSS in `frontend/src/index.css`).
- **Backend:** FastAPI + SQLAlchemy. SQLite by default; PostgreSQL 16 via
  `DATABASE_URL` (Docker Compose runs `postgres:16`). `backend/app/database.py`
  falls back to SQLite when `DATABASE_URL` is unset.
- **Auth:** PIN login, PIN hashed, token session. Seed PINs (demo only):
  manager `123456`, Anna `1111`, Ben `2222`, Chris `3333`.
- **Files:** uploads to `backend/uploads/<date>/`, 50 MB limit, jpg/png/mp4/
  webm/mov only. The database stores paths, not blobs.
- **Run:** `docker compose up --build` (repo root = app root, no `app/`
  subfolder on GitHub or on the user's Mac), or backend `uvicorn app.main:app
  --reload --port 8000` + frontend `npm run dev` (port 5173, proxy to 8000).
  `package-lock.json` is not in the repo; run `npm install` on a fresh clone.

## Module map

```
backend/app/
  main.py            entry, CORS (5173 only), /uploads static, seed on startup
  models.py          Employee, ShiftTemplate, Schedule, SideworkTemplate,
                     SideworkRecord, SideworkAssignment, AIDraft, DailyReport
  auth.py            PIN hash, token, get_current_user, require_manager
  database.py        engine, ensure_new_columns() migration for old DBs
  seed.py            demo data: manager + Anna/Ben/Chris, 6 shift templates,
                     10 sidework tasks (opening=A, running=B, closing=C)
  routers/           auth, employees, schedule, sidework, review, report, ai
  services/
    scoring.py       score_for_day, rolling_score_14, suggestion_for_score
    daily_report.py  build_daily_report (v2 format)
    draft_schedule.py  rule-based requirement parser
    ai_vision.py     photo screening (no-key fallback / OpenAI-compatible)
    email_report.py  SMTP send, preview-only without config

frontend/src/
  api.js             ALL backend calls live here, nowhere else
  i18n.js            EN / 中文 strings; data titles split on " || "
  App.jsx            login + left sidebar nav (desktop) / bottom tabs (mobile)
  pages/             Schedule, Today, Review, Score, Report, Suggest,
                     Draft, Tasks, Profile
```

## Invariants (never break these)

1. **Schedule and Sidework are two independent modules.** Scheduling works
   with no sidework records at all. Their only intersection is
   `score_for_day` → `suggestion_for_score`, read-only.
2. **Manager approval gate.** AI may draft, suggest, screen, and summarise.
   It may never publish, cancel, fail, message, dock, or fire. Every such
   action is a manager-only endpoint (`require_manager`) triggered by an
   explicit manager click.
3. **Cancel, don't delete.** Cancelling a shift sets `status='cancelled'`
   (audit kept, employee no longer sees it). Deactivating a sidework task
   sets `is_active=False` (history kept).
4. **Score denominator.** Assigned day → only assigned items count. No
   assignment that day → employee is not scored (`score=None`,
   `not_assigned=True`), never a 0 and never the full list. Full-list mode
   only when nobody is assigned that day.
5. **Provisional scores.** Quality defaults to 100 when nothing is reviewed,
   so any score with pending reviews is labelled provisional in the report.
6. **Language.** UI is English-first, Chinese second, single-language
   switch, default English, switch lives **only** in Profile
   (localStorage key `pos-lang`). Seed data titles are stored as
   `"English || 中文"`; existing databases keep old titles that do not switch
   — a migration for that was offered and never approved, do not silently
   rewrite old data.
7. **Supporting modules must not break the two core modules.** Auth,
   notifications, billing, and AI are supporting; if OAuth/Stripe/Twilio/AI
   keys are missing, those modules stay closed and the core still works.

## Known drift to be aware of (do not "fix" silently)

- The early charter (v0.1, outside this repo) says "first low score → talk,
  only after two consecutive low weeks → reduce". The implemented rule is
  single-day score < 70 → suggest minus half a day. The implemented rule is
  what the user has been using; changing it needs a user decision, recorded
  in `progress.md`.
- `backend/app/README.md` was partly stale (it once said the nav was a top
  bar and that rolling scores / cell editing were not done). `progress.md`
  is the current status; fix the README when you notice it drifting.

## Data model notes

- `Employee` has **no** phone / email / emergency-contact / hire-date
  fields. Profile shows those as "not in the system yet" placeholders —
  never fake them.
- `ShiftTemplate.end_time` may be the literal string `"closing"`. It is
  displayed as "Closing / 关门"; no weekday/weekend closing-hour resolution
  exists (22:00 vs 23:00 is not implemented).
- `SideworkTemplate.group_letter` is A–E, `is_active` defaults True.
  `ensure_new_columns()` adds both to old databases at startup.
