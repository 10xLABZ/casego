CaseGO v0.6.2 CASE CREATION FIX
Based on the supplied v0.6.1 safe core rebuild.

Upload this ZIP's contents over the existing GitHub repository root.
NO SUPABASE SQL CHANGES ARE REQUIRED.
Do not run the withdrawn v0.6.0 SQL.

Fixed the Owner/Admin case-creation failure reproduced against the recovered
CaseGO database rules. Case creation now inserts first, then reads the saved
case separately. Existing firm isolation and role restrictions remain intact.
Duplicate clicks are blocked; partial-save failures explain that the case exists.

TEST: Sign in as the firm's Owner/Admin -> existing client -> Add Case ->
Create Case -> Client Profile -> refresh and confirm the case is still there.
Test primary/team assignments and court/legal dates, then retest System Admin.

Local PostgreSQL/permission and workflow tests passed.
Live Supabase and hosted-browser confirmation is still required.
See CURRENT_BUILD.md and CASE_CREATION_FIX.md for details.
