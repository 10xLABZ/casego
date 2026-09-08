CaseGO v0.6.1 SAFE CORE REBUILD
2026-09-08

This build is based on:
- the CaseGO SQL history supplied by the project owner,
- CaseGO v0.5.9 as the visual/code starting point,
- the known-working RCM build as a behavioral reference,
- the recovered CaseGO project handoff.

IMPORTANT
- Do NOT run the withdrawn v0.6.0 SQL.
- This ZIP contains no SQL migration that needs to be run before testing.
- Test Add Client first.

PRIMARY TEST
System Admin -> Enter Rodriguez Firm -> Add Client -> Save & Exit.
The client should save and redirect to its Client Profile.

The Add Client payload has been limited to columns confirmed by the foundation schema. The live error showed date_of_birth is absent, so this build does not send date_of_birth or preferred_language.

See CURRENT_BUILD.md and CASEGO_PROJECT_STATE.md for continuity/source-of-truth notes.
