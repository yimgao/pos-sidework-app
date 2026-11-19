# UI Context — pos-sidework-app

> Spec-driven context file 5 of 6. How the interface must look and behave.

## Design system (BrewLab-style, decided 2026-11-18, supersedes Apple-style)

- Background `#F4F5FB`, white cards, card radius 14px, soft shadow
  `0 1px 3px rgba(16,24,40,.06)`, primary indigo `#4F46E5`
  (hover `#4338CA`, soft `rgba(79,70,229,.10)`), green `#16A34A`,
  red `#DC2626`, orange `#EA580C`, amber `#D97706`, input fill `#F3F4F6`,
  secondary text `#6B7280`, border `#E5E7EB`, base text 15px,
  semibold headings.
- Role pills use one shared map (`frontend/src/roles.js`): Server
  indigo/blue, Busser/Bar amber, Host cyan, Manager purple, Cook
  red/pink, Cashier green, Shift Lead purple, Dishwasher gray,
  "all" indigo. The same map colors schedule chips and avatar circles.
- Stat cards: small tinted icon square, gray label, big number,
  small sub-line. Progress bars: light track, indigo fill (red under
  70, green otherwise for scores). Completed checklist items: green
  check circle + strikethrough + "Completed at HH:MM" line.
- Buttons: indigo primary, light gray secondary. Modals: clean white
  card, labeled fields, Cancel + primary action.

## Layout

- **Desktop (≥ 768 px): left vertical sidebar + top bar.** Sidebar top:
  indigo brand mark + "StorePulse". Then MY: My Schedule /
  My Checklists / My Score (employee + manager only — owner never
  sees this section). Then MANAGER/OWNER: Live Operations / Review /
  Schedule Builder / Checklist Templates / Team & Roles / AI Assistant /
  Report / Analytics. Bottom: Collapse button, then user card, which
  is the entry to Profile. Content is centred to the right of the
  sidebar, max-width 1080 px.
  - The nav belongs on the **left** (user correction 2026-10-31).
    Do not move it to the top again without a new user decision.
    The top bar is a header only (store name, decorative search,
    user chip) — it is not navigation.
- **Top bar (desktop only):** static store name "Yardkoo" (not a
  multi-store selector — there is one store), a search input that is
  decorative for now (no backend behind it), avatar + name + role at
  right (click → Profile). Roles come from real login — there is no
  "View as Employee/Manager/Owner" switcher.
- **Mobile (< 768 px):** blurred sticky top header (brand + avatar button
  → Profile) and a bottom tab bar with safe-area padding. The sidebar
  and the top bar are hidden. In full-page screenshots the fixed bottom
  bar appears mid-page; on a real phone it stays at the bottom — that
  is not a bug.
- **Login:** centred card, indigo brand mark, username + password by
  default with a toggle to PIN login, demo-accounts hint. No language
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
  until Publish Week. Shifts render as role-colored chips, with a role
  legend under the grid. The Add Schedule form above the grid stays.
- **Today (employee):** one checklist card per segment
  (Opening/Midday/Evening) with "x of y complete" + progress bar.
  Only the employee's assigned items for today (or the full checklist
  if nobody was assigned). **Every item needs a photo AND a note to
  complete** — the button refuses with a clear message otherwise, and
  the backend rejects with 400. Each item shows its standard text and
  role pill; done items show the photo, the note, and "Completed at".
- **Checklist Templates (manager):** role tabs across the top (All +
  one per role from GET /api/roles; a role tab also lists "all"-role
  tasks). Each row: drag-handle look (visual only, no reordering),
  order number, title, role pill, segment + optional tags, standard
  text, Delete (= deactivate, history kept). Add-task form is a modal.
  Daily assignment below, filtered by the same role tab.
- **Live Operations (Dashboard, manager/owner):** stat cards from the
  existing overview data only (completion %, done/total, pending
  review, low-score count — no invented deltas), per-person rows with
  avatar + role pill + progress bar, by-segment rates, leaderboard,
  watchlist as the flagged list, check-in timeline, per-person AI
  reports, Send to manager (email + SMS, preview-only without config).
- **Team & Roles (Accounts, manager/owner):** table with avatar, name,
  role pills, status, app role, activate/deactivate; search filter by
  name; add-account form, roles management, owner settings kept.
- **AI Assistant (manager/owner):** one nav entry, two tabs at top —
  Suggestions and AI Draft (DraftPage rendered inline, no new route).
  Both keep their approval gates.
- **Analytics (Score):** employee sees My Score with a big number and
  breakdown bars (completion / approval / on-time); manager sees the
  table with avatar, score bar, 14-day rolling, done/total, passed,
  late. Same data and meaning as before.
- **Report (manager):** one card per person — score (with breakdown,
  provisional when pending review) → reasons → suggestion → message to
  the employee (English + Chinese reference).
- **Suggestions (manager):** per-employee cards, editable action / week /
  date / shift; nothing changes until Adopt is pressed.
- **Profile:** employee vs manager views; phone / emergency contact /
  hire date / hourly rate are shown as "not in the system yet" — never
  fake values; PIN is never shown.
