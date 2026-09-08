# CaseGO Current Build
Build: v0.6.2 CASE CREATION FIX
Date: 2026-09-08
Base: CaseGO_v0.6.1_SAFE_CORE_REBUILD_GITHUB_READY.zip

## Fix
Firm Owner/Admin case creation used insert().select().single(). The recovered
restrictive SELECT policy calls STABLE can_access_case(id), which looks up the
new case in the statement's pre-insert snapshot. The row is not visible to that
lookup, even for an Owner/Admin with cases.create permission. System Admin
returns true before the lookup and therefore succeeds.

The frontend now generates the case UUID, inserts without RETURNING, then reads
that exact UUID and effective firm in a separate request. Existing RLS and role
permissions still govern both requests. No database migration is required.

Repeated clicks are blocked while saving. If the case is saved but its readback,
team or calendar save fails, the page says the case exists and prevents another
case insert. A failed/uncertain network response also asks the user to check
existing cases before retrying.

## Preserved from v0.6.1
- Supabase remains the only practice-data source.
- Firm writes use CaseGOAuth.effectiveFirmId().
- System Admin firm_id remains NULL; selected firm provides support context.
- Add Client omits unconfirmed date_of_birth/preferred_language columns.
- No SQL from withdrawn v0.6.0 should be run for this build.
- No changes to tenant permissions, role assignments, theme or visual design.

## Verification
Reproduced original 42501 denial for Owner/Admin and success for System Admin
in local PostgreSQL (PGlite) using recovered conversation SQL. Patched production
case workflow passed case/team/calendar creation, assigned-attorney access,
cross-firm denial, inactive/no-create-role denial, partial-save handling,
uncertain-network handling and duplicate-submit checks. JavaScript syntax passed.

This is not a fresh live-schema audit or authenticated hosted-browser test.
If the live schema differs, retain the exact error message for diagnosis.

## Deploy/test
Upload ZIP CONTENTS to the existing GitHub repo root. No SQL step.
Open the hosted app and refresh. app.js URLs include ?v=0.6.2.
Sign in as the firm's Owner/Admin, open an existing client, Add Case,
choose a case type, optional primary/team and court/legal dates, Create Case.
Confirm the case on Client Profile after refresh. Also retest System Admin.
