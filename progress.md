# Progress — pos-sidework-app

> Spec-driven context file 6 of 6. What is done, what is next, what is blocked.
> Update this file with every change. Last updated: 2026-11-06.
> Repo head: `7fa2d22` (2026-11-02).

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
