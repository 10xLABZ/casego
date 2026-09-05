CaseGO v0.5 — CLIENT/CASE CLOUD WORKFLOW

Web/PWA build only. Supabase is the application data source.

Added in v0.5:
- Persistent Light/Dark mode toggle at the bottom of the Quick Access rail using supplied CaseGO mode artwork.
- Add Client writes to Supabase using the currently selected/effective firm (including Platform Admin support mode).
- Optional initial case creation writes to Supabase.
- Client Profile loads and edits Supabase client data.
- Client Profile lists the client's accessible Supabase cases.
- Add Case writes to Supabase.
- Case Detail loads and edits Supabase case data.
- Case access scope: Assigned Case Team Only or Firm-Wide.
- Primary attorney and additional case-team assignment from active firm users.
- Next court date / legal deadline create calendar_events records.
- No demo/seed client, case, task, message, notification, billing, or chat data.

Important:
The older prototype fields Service Quote, Court, Judge, and dedicated Sub-Case metadata do not yet have dedicated CaseGO database columns. v0.5 does not fake persistence for unsupported fields. Sub-Case text is currently used as the case title. The next schema/UI pass can add the remaining legal matter fields deliberately.
