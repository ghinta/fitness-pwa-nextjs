# Product Definition

## Purpose

Fitness PWA lets one person record HIT-style strength workouts quickly, without an account or network connection. It prioritizes reliability and low interaction during a workout over broad fitness features.

## Version 1 scope

Version 1 includes exactly:

- Two active templates, **Training A** and **Training B**, each containing six ordered movement slots, including Triceps in A and Biceps in B.
- Selecting an exercise from slot alternatives immediately before performing it; the primary is preselected and can optionally become the future default.
- Starting, resuming, completing, or discarding one in-progress session.
- For each slot, timing an optional warm-up set and exactly one working set from persisted timestamps; the stopped duration can be corrected before saving.
- Adding, replacing, and removing a locally resized exercise image and thumbnail, both included in backup/restore.
- Viewing previous working-set results for the current exercise, newest first.
- A non-binding next-weight suggestion: above 90 seconds suggests a 2.5% increase rounded to a configurable equipment increment; at 90 seconds or below it suggests retaining weight. Recommendations never alter stored values.
- On-device IndexedDB persistence, an offline application shell, installability, and safe update notification.
- Exporting and importing all durable application data in one versioned JSON file. Import is validated and requires explicit confirmation before replacement.
- German UI copy, accessible touch interaction, and narrow-screen support.

## Explicit exclusions

No accounts, login, backend, cloud sync, multi-user support, social features, subscriptions, health-platform integration, external APIs, analytics, advertising, AI features, complex charts, or automatic training-plan generation. V1 does not track repetitions, body measurements, rest timers, multiple working sets, or plates.

## Success criteria

A user can install the app, finish Training A or B offline with minimal typing, reopen an interrupted workout, inspect prior results, understand the recommendation, and export/import a complete backup without silent data loss.

## Final Version 1 rules

Kilograms are the only unit; dates display in the device time zone; there is at most
one active session; and deactivation replaces deletion. Warm-ups are persisted.
Custom exercises are supported. Session substitutions do not alter template defaults
unless **Als Standard verwenden** is explicitly selected. Exercise increments default to 2.5 kg
and are editable. Import replaces all data only after validation, confirmation, and
creation of a pre-import backup.
