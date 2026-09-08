# CaseGO Current Build

Build: v0.6.1 SAFE CORE REBUILD
Date: 2026-09-08

## Purpose
This build resets the core client/case workflow to the database contract actually established by the CaseGO SQL history.

## Core rules
- Supabase is the only CaseGO practice-data source.
- Firm-owned writes use `CaseGOAuth.effectiveFirmId()`.
- System Admin profile `firm_id` remains NULL by design; selected support firm supplies the effective firm ID.
- Add Client sends only columns confirmed by the foundation `clients` schema.
- `date_of_birth` and `preferred_language` are intentionally NOT sent because the live database reported `date_of_birth` missing.
- Add Client waits for authentication/firm context before record-page wiring.
- Additional phone rows use `client_phones`; the base client remains saved if an additional-phone insert fails, and the failure is shown.
- Do not run the withdrawn v0.6.0 SQL.

## Immediate acceptance test
1. System Admin enters Rodriguez Law Firm.
2. Open Add Client.
3. Add First Name + Last Name and optionally phone/address/email.
4. Save & Exit.
5. Client must be inserted with the selected firm's UUID and redirect to `client-profile.html?id=<returned uuid>`.
6. Saved fields must display on Client Profile.
7. Save & Add Case must first create the client, then open Add Case with the exact returned client UUID.
