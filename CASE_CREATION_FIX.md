# Owner/Admin case creation — v0.6.2

## Reproduced finding
Original code: `from('cases').insert(payload).select().single()`.
With recovered CaseGO schema and a real Owner/Admin role whose
`has_casego_permission('cases.create')` and `is_casego_firm_admin()` both returned
true, this failed:

```text
42501 new row violates row-level security policy
"case access restriction select" for table "cases"
```

The same insert returned successfully for System Admin.

The SELECT restriction calls `can_access_case(id)`, a STABLE function which
looks up the case before testing firm-admin authority. That lookup cannot see
the new row in the same INSERT statement. System Admin passes before the lookup.
PostgreSQL documents this [statement snapshot behavior](https://www.postgresql.org/docs/current/xfunc-volatility.html).
Supabase documents that [insert does not return rows unless select is chained](https://supabase.com/docs/reference/javascript/insert).

## Change
Generate a UUID with browser crypto; insert with that ID without requesting a
returned row; read the committed ID in a separate request, filtered by firm.
Then save team and dates. No role promotion, RLS bypass, SQL changes or new
backend function. Case/client/team/calendar payloads otherwise retain v0.6.1 behavior.
All HTML app.js references carry v0.6.2 to refresh the changed script.

Create Case is disabled until initialization completes and while saving.
An ordinary rejected insert leaves the form available to correct/retry.
After a known case save, downstream failure offers Open saved case and prevents
a duplicate insert. An uncertain network result offers View client's cases.
The entered form remains visible; these are separate requests, not an atomic
case/team/calendar transaction. Team/date failures require review.

## Tested
- Original Owner/Admin failure and System Admin success reproduced.
- Corrected Owner/Admin case with primary attorney, team and two calendar events.
- System Admin in selected firm, including unassigned team-only case.
- Attorney creating an automatically self-assigned case.
- Unrelated team-only case hidden from that attorney.
- No-create role and inactive user denied.
- Owner/Admin cannot write another firm's data or link another firm's client.
- Later calendar failure reports an existing case; network uncertainty flagged.
- Concurrent submit ignored; partial save blocks duplicate; rejected insert can retry.
- JavaScript syntax and ZIP integrity checked.

Tests used local PostgreSQL via PGlite with recovered SQL and a test adapter
executing real SQL/RLS for the production JavaScript workflow. No production
data, credentials or permissions were changed. Hosted Supabase/PostgREST and
browser acceptance remain to be confirmed with the user's live account.
