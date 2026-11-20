# Responsive workspaces

## Goal and approval
User approved the proposed mobile task-first / tablet touch-first / desktop management-first redesign on 2026-11-19 ("可以，按照你的逻辑来！"). This spec records that approved scope, not a new architecture.

## Scope
App.jsx, index.css, i18n.js; SchedulePage and its scoped stylesheet; DashboardPage, AccountsPage, ScorePage; TasksPage modal focus behavior; shared styling for ReviewPage; verification scripts and progress.md. Preserve the user's in-progress relocation of context documentation.

## Design
System font, left-aligned content, quiet white surfaces on #F7F7F7, Yardkoo #2F4F4F primary, #1F2A2A text, #6B7280 secondary, #E5E7EB dividers. Keep red/amber/green for statuses. No extra decorative accent palette or shadows.

Phone: header/profile; single-column workspace; employee Today/Schedule/Score bottom tabs or manager Overview/Schedule/Review/More. More is a full-page navigation directory, not an overcrowded bottom bar.
Tablet: compact left rail with persistent labels; optional full navigation directory. Wide desktop: full left sidebar, collapsible. No top navigation migration.
Desktop workspace widths depend on task: wide scheduling/team/analytics, constrained personal work. Dashboard prioritizes review and exceptions alongside daily progress rather than a uniform stack.

Refinement against brief: retain brand rather than adopting a generic blue/purple dashboard. Remove the nonfunctional global search; retain working account search on all widths. Avoid excessive card nesting. Mobile schedules use a daily list rather than shrinking a week table.

## Invariants
No backend, database, auth, score calculation or dependency changes. Role permissions remain server enforced. No automatic approval, publish, report delivery, or destructive actions. Employees retain only their API-scoped data; owner does not gain personal pages. Language switch remains Profile only. All new strings in EN/ZH dictionaries.

## Acceptance
- Mobile manager navigation has four entries; employee has three. Every existing permitted page remains reachable, including Profile.
- Widths 375/390, tablet 768/834/1024, laptop 1280 and desktop 1440: no page-level horizontal overflow. Schedule week grid may scroll locally; phone defaults to day list.
- Compact tablet navigation does not consume a full 264px sidebar. Short viewports allow sidebar scrolling.
- Schedule preserves add, edit, cancel, publish and custom shifts. Dates are timezone safe. Phone daily employee list and desktop grid use the same data.
- Accounts and score lists reflow on phone; search remains usable.
- Touch controls are at least 44px high; inputs use 16px text. Focus is visible; main navigation labels and selection are accessible.
- Mobile modal fits dynamic viewport and safe area; desktop modal remains constrained.
- Build passes; real rendered desktop/mobile/tablet inspection and role/navigation checks. Test fixtures, if used, explicitly distinguished from live API verification.

## Not changed
No stack migration, invented metrics, real data mutation, payroll/leave functionality, commits, pushes, or changes to context relocation.
