# CaseGO v0.6.3 — dates, calendar and record settings

Base: v0.6.2 (user confirmed Owner/Admin case creation works).
No migration; no policy/grant changes; no live data edits.

## What was missing
v0.6.2 already inserted court/legal calendar_events after saving a case, but
Case Detail did not read them. The Clients directory hardcoded a dash in Cases;
Client Profile hardcoded the next-date cells. Calendar had no loader and its
Previous/Today/Next functions were no-ops. Missing display did not prove a
failed insert; this release reads the existing records.

## Database contract
- calendar_events: id, firm_id, client_id, case_id, event_type, title,
  description, start_at, end_at, all_day, created_by; existing timestamps/RLS.
- Court = court; legal = legal_deadline. Date/time is start_at; comments use
  description. Existing comments held in title by earlier builds still display.
- Tasks displayed in Calendar come from tasks.due_at; completed/cancelled tasks
  are omitted. Task creation/editing remains the next development step.
- No extra court/legal tables or columns. Events are linked to actual case/client IDs.
- New case ID insert/read remains separated to preserve the v0.6.2 Owner/Admin fix.

## Included behavior
Case Detail: Court & Legal Dates panel, persisted values, Edit Date with date/time/
comments fields, add additional dates, confirmed event removal. Each date is a
separate existing-schema event; editing does not replace all case history.

Client directory: real case names/numbers/status and links; search and alphabet
filter. Client Profile: case rows plus next upcoming court and legal date/time/
comment (past events remain on Case Detail/Calendar). Cases list: fixed header
alignment, real search/status filtering; removed unsupported Agreed Fee column.

Calendar: monthly grid, Previous/Today/Next, filters, selected-day details,
case/client links, add firm or case-linked event, edit/delete, task due dates.
Month requests ignore stale responses. Queries remain firm-scoped and RLS-limited.

Record deletion: client and case detail gear menu, explicit named confirmation,
Cancel default focus, duplicate click protection, permission check through
has_casego_permission plus actual RLS. Delete checks that one row was affected.
No production record was deleted as part of development.

## Time behavior
My Profile timezone takes precedence; visible firm_settings.timezone next;
America/New_York fallback. New timed values convert the chosen wall-clock time
to an explicit UTC instant; date-only values store midnight UTC and display by
UTC calendar day. Nonexistent DST times are rejected. Older timestamps are
displayed as stored, not migrated; older builds submitted times without offsets.

## Validation
Local PostgreSQL via PGlite, using recovered conversation schema/policies:
- Owner/Admin/System Admin creation regression, teams and dates.
- Attorney assignment; inactive/no-create role denial and cross-firm rejection.
- Production HTML/JS with a DOM test harness and real SQL/RLS test adapter.
- Court/legal date+time+comment persistence; edits without duplicates.
- Legacy title comments; summer/winter conversion and missing DST hour.
- Case Detail initialization, Clients cases, Client Profile next dates.
- Calendar navigation/filters/task dates; create/edit/date-only/delete dialogs.
- Gear/confirmation/Cancel and unauthorized/foreign deletion denial.
- Case deletion removes linked calendar events while keeping the client.
- JavaScript syntax and packaged file integrity.

This is local verification, not a live Supabase/PostgREST or rendered-browser
audit. No database credentials or application dependency installs are needed.
