# Spec — Owner / Manager / Employee v2 (check-in + standards + owner dashboard)

> User decisions 2026-11-18 (boss talk): consulting company focus is
> management via check-in. Three user types. Manager adds roles. Owner has
> all manager functions. Dashboard for owner (must-have), manager (optional,
> owner can toggle). Report sent to manager by email + SMS. Employee flow:
> opening / midday (optional) / evening, username+password from manager,
> standard visible while doing a task, photo upload, AI per-person report.
> Standards content is NOT in this spec — manager/owner add it in the app
> later, with photos taken in store. Do not invent checklist content.

## Goal

Turn pos-sidework-app into a check-in management tool: the owner sees the
whole store on one dashboard, the manager runs the day, employees check in
tasks with photo evidence against a visible standard, and an AI per-person
report follows each completion.

## Scope — in scope

1. **Three user types, one hierarchy.** Employee < Manager < Owner.
   - Employee: own schedule, own tasks, own score, own check-ins.
   - Manager: everything employee-facing for the store, plus scheduling,
     task/role management, assignments, review, reports, suggestions.
   - Owner: ALL manager functions, plus managing manager accounts,
     store settings, and the owner dashboard. Owner can toggle whether
     the manager sees per-person AI reports (default: yes).
2. **Username + password login** (replaces PIN as the primary login).
   Accounts are created by a human, never self-registered. Owner creates
   any account; manager creates employee accounts only. No phone-number
   login. Demo accounts (seed, change before real use): owner
   `owner` / `owner123`, manager `manager` / `manager123`, Anna `anna` /
   `anna123`, Ben `ben` / `ben123`, Chris `chris` / `chris123`.
   PIN login stays as a fallback for demo data only, not for new accounts.
3. **Configurable roles.** Manager (and owner) can add / rename /
   deactivate roles in the app (e.g. server, cook, host). No role is
   hard-coded except the three user types. Each employee has one role;
   each task belongs to one role (or "all roles").
4. **Configurable checklists with a standard.** Manager/owner adds a task:
   segment (opening / midday / evening), group A–E, role, title EN+ZH,
   photo-required, optional flag, and a `standard` text (how the task
   must be done, shown to the employee while doing it). Midday segment
   is optional by default. Standards are entered in the app later; this
   spec invents no task content.
5. **Employee Today by segment.** Opening → Midday (optional) → Evening,
   each item shows its standard, note + photo/video upload + Mark Complete.
6. **Per-person AI report.** After an employee uploads, the manager is
   notified (in-app; email/SMS when configured) and an AI per-person
   report is available: done items, missed items, where to improve.
   Rule-based from scores when no AI key is set; AI vision/text when a
   key is set. It never changes a review outcome.
7. **Owner dashboard (+ manager dashboard, same page).** One screen:
   today overview (completion %, on-time %, pending review, low-score
   count), per-person bar chart + table (score, done count, late count,
   14-day average), completion by segment (opening/midday/evening),
   check-in timeline (who checked in when, late, missing), AI daily
   report, leaderboard + watchlist (top performers, consecutive low
   scores flagged). Buttons: Generate report, Send to manager
   (email + SMS; if SMTP/Twilio not configured, returns preview-only
   and records an in-app send — never errors).
8. **Owner settings.** Toggle "manager can see per-person AI reports".
   Manager dashboard hides those reports when off; owner always sees them.

## Scope — explicitly out of scope

- Real checklist content / standards text (added in-app later).
- Multi-store. Payroll. POS replacement. Automatic shift cuts / firing /
  pay docking. SMTP/Twilio account setup (blocked on user providing
  accounts; code only).
- Changing the score formula, the approval gate, or the score-denominator
  rule.

## Invariants (from architecture.md — must not break)

1. Schedule and Sidework stay independent modules; only intersection is
   score → suggestion, read-only.
2. Approval gate: AI drafts/suggests/screens/summarises only. Publishing,
   cancelling, failing, messaging, docking, firing are manager/owner-only
   explicit clicks.
3. Cancel, don't delete; deactivate, don't delete.
4. Score denominator: assigned day → only assigned items count;
   unassigned employee is not scored, never 0, never the full list.
5. Provisional scores when anything is pending review.
6. Language: EN first, ZH second, switch only in Profile.

## Acceptance checklist

1. Log in as owner (`owner`/`owner123`): sees Dashboard, all manager
   pages, Accounts page; can create a manager account and an employee
   account; can turn off "manager can see per-person AI reports".
2. Log in as manager: can add a role "Host", add a task with a standard
   in the opening segment for that role, assign it; cannot create a
   manager/owner account (403); cannot open owner Settings.
3. Log in as Anna: sees only her own schedule/tasks/score; Today shows
   opening/midday/evening groups with the standard text on each item;
   midday items marked optional; completes one with a photo → manager
   dashboard shows the check-in and a per-person AI report lists it done.
4. Owner turns off manager visibility → manager dashboard no longer shows
   per-person AI reports; owner dashboard still does.
5. Dashboard: completion % and per-person bars match the API scores;
   leaderboard top = highest 14-day average; watchlist flags score < 70.
6. Send to manager with no SMTP/Twilio configured returns preview-only,
   does not error, and records the send in-app.
7. Employee cannot open Dashboard, Report, or Accounts (403). Manager
   cannot see another employee's per-person report beyond the store view
   they already have — no, manager sees all employees' reports in store
   scope (that is their job); the toggle only controls the per-person AI
   report block.
8. Build passes; end-to-end API test incl. employee view after manager
   action; repo head verified after push.

## What it does not change

- Score formula, suggestion thresholds, daily report v2 format, schedule
  publish flow, Excel-style grid editing, photo screening fallback.
- Docker / local run commands. PIN demo accounts remain in seed for
  backward compatibility.

## Files to touch

- Backend: `models.py` (Employee username/password_hash/is_owner,
  Role, AppSetting, SideworkTemplate standard/segment/optional/role),
  `auth.py` (password auth + role helpers), `database.py` (migrations),
  `seed.py` (owner + username accounts), `routers/auth_router.py`,
  new `routers/accounts_router.py`, `routers/roles_router.py`,
  `routers/dashboard_router.py`, `routers/settings_router.py`,
  `services/person_report.py`, `routers/sidework_router.py`
  (standard + segment), `routers/ai_router.py` (person report endpoint).
- Frontend: `api.js`, `App.jsx` (Dashboard nav, owner-only Settings),
  `pages/LoginPage.jsx` (username+password), new `pages/DashboardPage.jsx`,
  new `pages/AccountsPage.jsx`, `pages/TasksPage.jsx` (standard field,
  segment, role picker), `pages/TodayPage.jsx` (standard display, segments).
