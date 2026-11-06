# Project Overview — pos-sidework-app

> Spec-driven context file 1 of 6. Source of truth for what this product is.
> Updated: 2026-11-06. Repo head at time of writing: `7fa2d22` (score denominator + report v2).

## What this is

A lightweight web app for a restaurant. It does **two things only**, and keeps
them separate:

1. **Scheduling** — who works which shift, on which day.
2. **Sidework checking** — whether each employee did their opening / running /
   closing sidework tasks, with photo or video as evidence.

It does **not** replace the restaurant's existing POS. Route A, decided by the
user on 2026-10-29: keep the existing POS, build this as a separate app.

## Users

- **Employee (server):** sees only their own schedule; records only their own
  sidework; sees only their own score and review result.
- **Manager:** sees the daily report, does scheduling, reviews sidework
  evidence, and approves or rejects every AI suggestion. No AI output ever
  publishes a schedule, cuts a shift, fails a review, sends a message, docks
  pay, or fires anyone on its own.

## The one intersection

Scheduling reads the sidework score **once**, as a suggestion: score < 70
suggests reducing by half a day (one shift); 70–84 suggests talking first;
≥ 85 or no record yet means keep the schedule. The manager must explicitly
adopt the suggestion before anything changes to a schedule. See
`architecture.md` — this is the most commonly broken invariant in this
project, so read it before touching either module.

## Core features (built, verified)

- Weekly schedule: draft → Publish Week → employees see published shifts only.
  Manager can click a grid cell to change / remove / add a shift (Excel-style,
  `32b140a`); editing a published shift takes effect immediately.
- Shifts are named, not timed, in the UI: Lunch shift, Dinner shift, Morning
  shift, Evening shift, Full day shift, Closing shift. Custom shifts with a
  custom start time and an end of "closing" or a specific time are created
  separately on the Schedule page.
- Sidework tasks in groups A–E; manager adds tasks and deactivates them
  (delete = deactivate, history kept); manager assigns tasks per employee per
  day. If any assignment exists for a day, that day runs on assignments only;
  if none exists, the full active checklist applies.
- Score: completion 40% + review quality 40% + on-time 20%. On assigned
  days the denominator is **only the items assigned to that employee**
  (`7fa2d22`); an employee with no assignment that day is not scored and does
  not appear in the suggestion list.
- 14-day rolling score: mean of daily scores on days with records only.
- Daily report v2: per person, in fixed order — score (with breakdown,
  provisional when anything is pending review) → reasons (concrete item
  names only) → suggestion → message to the employee (English, with a
  Chinese reference for the manager; never another employee's facts, never a
  reduction decision).
- AI draft scheduling: rule-based parser (employee + weekday + shift name),
  draft → approve (creates schedule drafts only) / reject. No LLM is wired in.
- Photo screening: no API key → file check only, verdict always
  unclear/needs review; with a key → OpenAI-compatible vision endpoint.
  Screening never changes a review outcome.
- Report email: without SMTP + manager email it returns preview-only.

## Non-goals (do not build these without a new user decision)

- Replacing the POS, inventory, payroll, or hiring.
- Automatic pay deduction, automatic firing, automatic shift cuts.
- Multi-store support, leave / shift-swap requests, labour-cost estimates,
  drag-and-drop scheduling. These appear in the early charter (v0.1) as
  aspirations; they are **not** in the product today and must not be assumed
  to exist.
- Migrating the stack to Next.js / Liveblocks / Clerk / Trigger.dev or any
  other stack from the Ghost AI video. That video's *method* (spec-driven
  development) is adopted here; its *stack* is not.

## What is still missing (see `progress.md` for the full list)

- Score suggestions still use the single-day score, not the 14-day rolling
  score. Daily report is not auto-sent after closing. No employee-management
  page (rename / change PIN / deactivate). OAuth, Stripe, Twilio, and the AI
  API key are all blocked on the user providing accounts/keys. The real
  sidework checklist, employee roster, POS brand, and how strict the
  reduction rule should be are still unconfirmed by the user — do not invent
  them.
