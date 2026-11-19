# Spec: Yardkoo theme, standard photos + multi-photo completion, delete user, notifications, split-screen login, responsive

> Follow-up to the BrewLab redesign (specs/brewlab-ui-redesign.md).
> User feedback 2026-11-18 after running the app on his Mac:
> (a) Anna/Ben/Chris show "Inactive" and anna/anna123 gets 401;
> (b) a Checklist Templates row shows a broken title "1" and duplicate
> row number 5; (c) each task should show a standard reference photo on
> top, then how to do it, then upload MULTIPLE own photos + notes, then a
> ☑️ complete button; (d) delete users as well as add them;
> (e) notifications bell + dropdown like the BrewLab reference;
> (f) whole theme re-done to match yardkoo.com, with the Yardkoo logo.
> Plus: login page as a split screen (BrewLab reference), and responsive
> is a hard requirement (iPad / desktop / phone).

## Goal

Fix the two reported bugs at their root, finish the task-photo workflow
the user described (example photo → how-to → my photos → notes → ☑️),
add real-data-only notifications and user deletion, re-skin the app in
Yardkoo's own brand (real logo file from yardkoo.com, real site colors),
rebuild login as a split screen, and prove the app fits desktop, iPad
(portrait + landscape) and phone.

## Findings (established before coding)

- **Inactive/login bug:** the ONLY backend write to
  `Employee.is_active=False` is `PATCH /api/accounts` (the
  Activate/Deactivate toggle). Seed never sets `is_active`, and the
  model default is `True`, so freshly seeded staff are active and can
  log in. No startup/seed/migration path deactivates anyone. Conclusion:
  the demo staff were deactivated by tapping Deactivate while testing.
  Fix is UX, not data: confirm before deactivating, make Inactive rows
  visually obvious, keep Activate prominent. Do NOT add a startup job
  that silently re-activates people (that would undo a deliberate
  manager decision).
- **Tasks row "1" / duplicate 5:** row numbers render `t.sort_order`,
  and `POST /templates` computes `sort_order = count in group + 1` —
  deactivated tasks shrink the count, so a new task can duplicate an
  existing sort_order. The "1" title is user-entered test data, not a
  code bug — do not delete user data.
- **Yardkoo brand (from yardkoo.com, fetched 2026-11-18):** real logo
  file `Yardkoo-03.png` (2560×2560 RGBA, from the site's own
  apple-touch-icon), dark forest green `#305020` artwork; site
  theme-color `#2F4F4F` (dark slate teal), text `#355858`, lighter teal
  `#406868`, pale mint `#C4D9D3` / `#CEE8E1` / `#DFF0EB`, page `#F7F7F7`,
  fonts Montserrat + Muli. The pixel-exact PNG was downloaded
  (kept in `~/workspace/your_files/pos-sidework-web/brand-assets/`).
  **The repo ships SVG recreations of that logo**
  (`frontend/public/yardkoo-logo.svg` + `yardkoo-mark.svg`: 4-petal
  mark + "YARDKOO" / "SEAFOOD & GRILL" in the same green) because the
  GitHub push channel only accepts UTF-8 text files — binary PNGs
  cannot be pushed through it. The SVGs are served locally, never
  hotlinked, and render crisp at any size.

## Scope

- In scope:
  1. **Deactivate safety:** `window.confirm` before deactivating an
     account ("停用后该员工无法登录…"); Inactive rows dimmed with an
     amber Inactive pill; Activate stays prominent.
  2. **Tasks list:** row number = display index within the filtered
     list (never `sort_order`); backend `sort_order` = max in group
     + 1; backend rejects an empty title after trim (400).
  3. **Standard photo + multi-photo:**
     - `SideworkTemplate.standard_photo_path` (new column via
       `ensure_new_columns`); new `SideworkPhoto` table (id, record_id
       FK, photo_path, file_name, created_at) via `create_all`.
     - `POST /api/sidework/templates/{id}/standard-photo` (manager
       only, one file; Blob when configured, else local uploads —
       same helper as completions).
     - `POST /api/sidework/complete` accepts multiple `files` (plus
       the old single `file` for compatibility); every uploaded file
       becomes a `SideworkPhoto` row; the first also fills the
       record's `photo_path`/`file_name` (backward compatibility).
     - `POST /api/sidework/records/{id}/photos` (record owner only,
       multiple files) to add photos to an existing record.
     - `GET /api/sidework/my/today` returns `standard_photo_url` and
       `photos: [{url, file_name}]` per item (legacy `photo_path`
       synthesized as one photo when no rows exist yet).
     - Today item layout, top to bottom: standard reference photo
       (labelled as the example) → standard text → "your photos"
       multi-file picker with thumbnails → notes → big ☑️ complete
       button. Completion still requires ≥1 photo (new or previously
       uploaded) AND a non-empty note (backend 400 otherwise).
     - Tasks modal gains a standard-photo file input (uploaded right
       after the task is created); each template row shows its
       standard-photo thumbnail and a change-photo input.
     - No standard photos or standard text are invented — empty until
       the manager uploads them.
  4. **Delete user:** `DELETE /api/accounts/{id}`. Manager may delete
     employees only; owner may delete anyone except themselves and
     except the last owner account. Deletes the employee row plus
     their schedules, assignments, sidework records and photos
     (stated in the UI confirm dialog). Frontend Delete button next
     to Activate/Deactivate in Team & Roles, with confirm dialog.
     Activate/Deactivate stay.
  5. **Notifications (real data only):** `GET /api/notifications`
     (`?lang=`), manager+owner see all, employee sees only their own.
     Built from existing tables only:
     - done + unreviewed records → one "N tasks awaiting review"
       item (latest `completed_at` as its time);
     - schedule conflicts (same employee, same date within the next
       7 days, non-cancelled, overlapping shift times; `end_time`
       "closing" counts as 23:00) → one item per conflict;
     - today's scores via `score_for_day` + `suggestion_for_score`
       where the suggestion is not "keep" → "new AI suggestion" item;
     - today's completions grouped by employee → "X finished N tasks
       today" item (latest `completed_at` as its time).
     No fake timestamps, no fake people, no clocked-in events (we have
     no clock-in data — never invent them). Frontend: bell in the top
     bar (and in the mobile header) with unread-count badge and a
     dropdown panel; opening the panel marks the shown items read
     (read ids in localStorage).
  6. **Yardkoo theme + logo:** tokens in `index.css` recolored to the
     site palette — primary deep teal `#2F4F4F` (hover `#243D3D`,
     soft `rgba(47,79,79,.10)`), page `#F7F7F7`, fill pale mint
     `#EDF3F1`, track `#DCE8E4`, focus ring teal; role map in
     `roles.js`: Server/"all" teal (`#2F4F4F` on `#DFF0EB`), other
     roles keep distinct hues. Sidebar brand uses the Yardkoo logo
     image (wide logo; circular mark when collapsed); login page uses
     the wide logo; favicon = the logo. App name stays StorePulse;
     the logo/wordmark is Yardkoo (the restaurant).
  7. **Login split screen (desktop ≥900px):** left dark-teal panel
     (badge pill, big two-line headline, one-line subtext, 3
     green-check bullets) + right "Welcome back" form (labelled
     Username + Password, primary Sign in, "QUICK DEMO LOGIN"
     divider with Owner / Manager / Anna quick buttons that fill and
     submit). Username+password AND the PIN-login toggle both kept;
     demo-accounts hint kept. Below 900px the panel collapses to a
     compact brand header above the form.
  8. **Responsive (hard requirement):** no horizontal overflow at
     1440, 1180, 820, 390 widths; sidebar visible on desktop and
     iPad-landscape, bottom nav on phone and iPad-portrait; tables
     scroll inside their card instead of overflowing the page;
     modals and dropdowns fit without clipping; tap targets ≥ 40px
     on touch.
- Explicitly out of scope:
  - Any change to the score formula, approval gate, module
    independence, or any API shape except the additions above.
  - Real checklist / employee / standard content (do not invent),
    new dependencies, Neon/Vercel deployment (separate, blocked).
  - Search that actually filters anything (top-bar search stays
    decorative); clocked-in notifications (no data).

## Invariants

- Schedule and Sidework stay independent; score → suggestion is the
  only intersection, read-only. Approval gate unchanged.
- Score denominator unchanged. Language: every new string in
  `i18n.js`, EN + 中文; switch stays only in Profile.
- Cancel-don't-delete for shifts and tasks stays; account deletion is
  the one deliberate exception (user asked for it) and always
  confirms first, stating what is deleted.

## Acceptance checklist

- [ ] `npm run build` passes; `py_compile` passes on all changed .py.
- [ ] Scratch-DB smoke test: seed → staff active, anna/anna123 login
      200; complete with no photo → 400, note-only → 400,
      photo-only → 400, photo+note → 200; multi-photo upload
      round-trips and appears in my/today; delete account works,
      self-delete refused, last-owner delete refused; notifications
      endpoint returns only real items (seeded demo: pending-review
      aggregate present, no clocked-in items).
- [ ] Tasks page: row numbers are 1..N in the filtered list, never
      duplicated; empty title rejected.
- [ ] Today: standard photo (when set) shows above the standard text;
      multiple photos selectable with thumbnails; ☑️ button completes.
- [ ] Team & Roles: deactivating asks first; inactive rows visibly
      dimmed; Delete removes the account after confirm.
- [ ] Bell shows real notifications with unread badge; opening marks
      read; employee sees only their own.
- [ ] Logo is the real Yardkoo file served from `public/`; theme is
      teal/mint, readable; login split screen renders on desktop and
      stacks on phone.
- [ ] Playwright screenshots at 1440×900, 1180×820 (iPad landscape),
      820×1180 (iPad portrait), 390×844 (phone) for Login, Dashboard,
      Today — no horizontal overflow at any width; issues found are
      fixed, not just noted.
- [ ] Screenshots of Today, Checklist Templates, Team & Roles
      (desktop) taken.

## What it does not change

- Scoring, suggestions, report generation, review flow, auth,
  schedule publish/cancel, AI draft parser, photo screening,
  email/SMS. `requires_photo` field kept for compatibility.
- Demo seed employees, shifts, tasks, schedule (except the new
  standard-photo column, empty by default).
- Nav structure and page mapping from the BrewLab redesign.

## Files to touch

- `specs/yardkoo-theme-and-task-photos.md` (this file)
- `frontend/public/yardkoo-logo.svg`, `frontend/public/yardkoo-mark.svg` (new; SVG recreations — see Findings)
- `frontend/src/index.css` (Yardkoo tokens, login split, bell, responsive fixes)
- `frontend/src/roles.js` (Server/all → teal)
- `frontend/src/i18n.js` (new strings, EN + 中文)
- `frontend/src/api.js` (notifications, record photos, standard photo, delete account)
- `frontend/src/App.jsx` (logo brand, login split screen, Bell)
- `frontend/src/pages/TodayPage.jsx` (standard photo, multi-photo, ☑️ button)
- `frontend/src/pages/TasksPage.jsx` (display-index numbering, standard-photo upload)
- `frontend/src/pages/AccountsPage.jsx` (delete, deactivate confirm, inactive rows)
- `frontend/index.html` (favicon)
- `backend/app/models.py` (standard_photo_path, SideworkPhoto)
- `backend/app/database.py` (ensure_new_columns: standard_photo_path)
- `backend/app/routers/sidework_router.py` (multi-file complete, record photos, standard-photo upload, today photos, sort_order fix, title validation)
- `backend/app/routers/accounts_router.py` (DELETE)
- `backend/app/routers/notifications_router.py` (new)
- `backend/app/main.py` (include notifications router)
- `progress.md`, `ui-context.md` (docs update)
