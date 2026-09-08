CaseGO v0.6.3 — DATES, CALENDAR & RECORD SETTINGS
Based on v0.6.2, confirmed working by the user for Owner/Admin case creation.

UPLOAD: Replace the existing GitHub repository root with this ZIP's contents.
NO SQL MIGRATION. Keep existing Supabase data, tables, functions and permissions.
Both app.js and casego_records.js must be uploaded. Page asset URLs use v0.6.3.

WHAT WORKS IN THIS BUILD
- Court and legal dates, times and comments are stored in calendar_events.
- Add Case now includes Legal Time and validates date/time/comments before saving.
- Case Detail displays saved dates; Edit Date opens the fields to change them.
- Add Court Date / Add Legal Date adds another event without replacing history.
- Clients directory lists its actual visible cases instead of a dash.
- Client Profile shows next upcoming court/legal dates and comments.
- Cases list columns now match their headings; search/status filters work.
- Calendar month navigation, date selection, filters, event details, and existing
  task due dates. Add Date / Edit Date / Remove Date use the same database records.
- Client and Case Detail: gear menu -> Delete -> named confirmation.
  Cancel does not delete. Actual delete remains protected by Supabase permissions.

TEST ON THE HOSTED APP
1. Sign in as firm Owner/Admin.
2. Add a case with a court date/time/comment and legal date/time/comment.
3. Open Case Detail; confirm both appear under Court & Legal Dates.
4. Edit a date, save, reload; confirm it persists and appears in Calendar.
5. Check Clients -> Cases links and Client Profile -> next court/legal columns.
6. Navigate calendar months/filter/select a date; test Add Date linked to a case.
7. Open each record's gear and cancel its delete confirmation.
8. Retest System Admin support mode and an assigned attorney.

TIMES
Displayed timezone: My Profile timezone, otherwise visible firm timezone,
otherwise America/New_York. The actual timezone is shown on date screens.
New timed entries carry a UTC offset correctly; date-only entries retain the day.
Older builds submitted times without an offset. This build does not rewrite
those stored timestamps; verify an older court time and edit it if needed.

Local PostgreSQL/RLS and page interaction tests passed; live hosted acceptance
is still required. No production data was changed during development.

Next recommended work: Tasks + running case notes, then secure user creation/
role management. Those older unfinished forms are not completed by this release.
See CURRENT_BUILD.md for the schema contract and validation details.
