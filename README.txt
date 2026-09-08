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


CaseGO v0.5.3 SETTINGS / USER MANAGEMENT
- Rebuilt Settings as cloud-first UI.
- My Profile for all users: name, title, phone/ext, weather location, timezone, theme and notification preferences.
- Profile changes save through update_my_casego_profile RPC and user_preferences.
- Firm Information is collapsed by default, prefilled from the active firm, and editable only by firm admins/system admin support mode.
- User Management and role overview are admin-only.
- Current admin account is protected from self-demotion/deactivation in the interface.
- Removed legacy Security Code and desktop Backup/Restore settings.
- + Add User opens the secure invitation workflow shell; SEND INVITE intentionally remains disabled until a server-side invite function is connected. No service-role key is placed in the browser.
- Theme preference now syncs from the authenticated profile.


CaseGO v0.5.4 changes:
- Add Client now supports Cell/Home/Work/Other phone types, extensions, Primary selection, and additional phone rows.
- Phone numbers save to client_phones; the primary number is mirrored to clients.phone for compatibility with existing list/profile views.
- Add Firm User wording changed from invitation to direct account creation with temporary password. Secure server-side creation remains to be wired before CREATE USER can be enabled.

CaseGO v0.5.5: Premium Add Client redesign; compact layout; client-only creation; multiple typed phones; live phone formatting.
