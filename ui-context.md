# UI Context — pos-sidework-app

> Spec-driven context file 5 of 6. How the interface must look and behave.

## Design system (Apple-style, decided 2026-10-30)

- Background `#F5F5F7`, white cards, card radius 16–18, primary `#007AFF`,
  green `#34C759`, red `#FF3B30`, orange `#FF9500`, input fill `#F2F2F7`,
  secondary text `#86868B`, border `#E5E5EA`.
- System font stack, generous whitespace, no black top header on desktop.

## Layout

- **Desktop (≥ 768 px): left vertical sidebar.** Top: brand mark +
  "Schedule · Sidework". Then MY: Schedule / Today / Score. Then MANAGER:
  Review / Report / Suggestions / AI Draft / Tasks. Bottom: user card,
  which is the entry to Profile. Content is centred to the right of the
  sidebar, max-width 1080 px.
  - This was briefly changed to a top centred bar (`2b6c9c8`) and the user
    corrected it on 2026-10-31: the nav belongs on the **left**. Do not
    move it to the top again without a new user decision.
- **Mobile (< 768 px):** blurred sticky top header (brand + avatar button
  → Profile) and a bottom tab bar with safe-area padding. The sidebar is
  hidden. In full-page screenshots the fixed bottom bar appears mid-page;
  on a real phone it stays at the bottom — that is not a bug.
- **Login:** centred card, PIN input, full-width blue button. No language
  switcher on the login page.

## Language

- English first, Chinese second. Single-language display, default English.
- The EN / 中文 switch lives **only** in Profile (desktop: sidebar user
  card; mobile: top avatar). Logout is also in Profile.
- Data titles (shift names, sidework titles) are stored as
  `"English || 中文"` and split by `displayText()` / `_pick_title()`.
- Shift names in the UI show the name only — "Lunch shift", "Dinner shift",
  "Morning shift", "Evening shift", "Full day shift", "Closing shift" —
  never a time range. Custom time is a separate form below the schedule
  form, never appended to a shift name.

## Page behaviours (must keep)

- **Schedule:** weekly grid, Excel-style — manager clicks a cell to change
  the shift, × to cancel it, + to add one, Done to exit. Editing a
  published shift takes effect immediately; editing a draft stays a draft
  until Publish Week. The Add Schedule form above the grid stays.
- **Today (employee):** only the employee's assigned items for today
  (or the full checklist if nobody was assigned), grouped A–E, each with
  note + photo/video upload + Mark Complete.
- **Report (manager):** one card per person — score (with breakdown,
  provisional when pending review) → reasons → suggestion → message to
  the employee (English + Chinese reference).
- **Suggestions (manager):** per-employee cards, editable action / week /
  date / shift; nothing changes until Adopt is pressed.
- **Tasks (manager):** groups A–E, each collapsible, Collapse all /
  Expand all at the top; add a task, deactivate a task, assign per day.
- **Profile:** employee vs manager views; phone / emergency contact /
  hire date / hourly rate are shown as "not in the system yet" — never
  fake values; PIN is never shown.
