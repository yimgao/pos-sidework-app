# Spec: <feature name>

> One feature, one spec. Get this approved before coding. See `ai-workflow.md`.

## Goal

One paragraph: the user-visible outcome.

## Scope

- In scope:
- Explicitly out of scope:

## Invariants

Which rules from `architecture.md` must not break (module independence,
approval gate, score denominator, language, cancel-don't-delete, …).

## Acceptance checklist

Observable, testable behaviours (API or UI). Example:

- [ ] Anna assigned 2 items, completes both → score 100, provisional until reviewed.
- [ ] Ben unassigned that day → not scored, absent from Suggestions.
- [ ] Manager's Adopt is the only thing that changes a schedule.

## What it does not change

Modules and endpoints that must stay untouched.

## Files to touch

- `backend/...`
- `frontend/src/...`
