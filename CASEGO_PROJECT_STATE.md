# CaseGO Project State

## Latest: v0.6.3
User confirmed v0.6.2 case creation works. The next issues were missing date
display, blank case columns, nonfunctional Calendar and exposed Delete Client.
v0.6.3 wires the existing calendar_events table to intake, Case Detail, client
case summaries and Calendar; adds Legal Time, date editing, gear menus and
confirmed deletion. No SQL changes. See CURRENT_BUILD.md and README.txt.
New runtime file casego_records.js is required alongside app.js.
Local tests pass; v0.6.3 live acceptance is pending.

The sections below record earlier milestones.

## Latest: v0.6.2, 2026-09-08
User reported Add Case worked as System Admin but failed as firm Owner/Admin.
Reproduced against the recovered SQL: INSERT RETURNING fails the restrictive
SELECT policy because STABLE can_access_case(id) cannot see the newly inserted
case yet. v0.6.2 separates insert and readback, retaining existing RLS.
No SQL migration required. See CURRENT_BUILD.md and CASE_CREATION_FIX.md.
v0.6.1 Add Client schema-contract corrections below remain unchanged.

CaseGO is a multi-tenant legal-practice SaaS by 10xLABZ. The existing Rodriguez Case Management app is reference/chassis only; CaseGO has its own cloud architecture and visual identity.

## Architecture
10xLABZ platform -> CaseGO -> Firm -> Users -> Roles/Permissions -> Firm-owned data.

Supabase provides authentication, structured data, RLS, permissions and tenant boundaries. Normal firm users have a `profiles.firm_id`. CaseGO System Admin has `profiles.firm_id = NULL` and selects a transient firm support context in the frontend. Record writes in support mode therefore MUST use `CaseGOAuth.effectiveFirmId()`.

## Core database tables known from SQL history
firms, profiles, roles, permissions, user_roles, role_permissions, clients, cases, notes, tasks, calendar_events, contacts, case_contacts, documents, invoices, payments, expenses, case_team_members, communications, client_contact_updates, contact_updates, firm_settings, integration_connections, firm_subscriptions, client_phones, contact_phones, user_preferences.

## Critical known issue resolved in this build
CaseGO v0.5.9 Add Client attempted to write `clients.date_of_birth` and `clients.preferred_language`. The live Supabase API returned: `Could not find the 'date_of_birth' column of 'clients' in the schema cache`. This build removes unverified columns from the client insert contract rather than changing the database blindly.

## Development rule
Never add or rename database fields merely because a frontend form contains them. Confirm against SQL history/live schema first. Keep core save/read flows working before adding features.
