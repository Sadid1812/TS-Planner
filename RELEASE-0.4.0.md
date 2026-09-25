# TS Planner 0.4.0

September 25, 2026. Local Windows and web feature release; cloud service activation is still pending.

## Added

- English and Spanish interface selection, persisted per planner, with Spanish date formatting and basic Spanish quick-entry phrases. Some dynamic accessibility labels and technical errors still use English.
- Apple/Outlook-compatible calendar file import with explicit preview and acceptance. Recurrence exceptions, exclusions and overnight events are handled; unsupported recurrence/time zones fail with an error. Imported events last for the current session and never inflate progress or enter Family sharing.
- Calendar export for a selected range, with private notes excluded by default. Recurring tasks export as dated occurrences. This is file interoperability, not live Apple/Outlook synchronization.
- Optional portable local AI engine alongside Ollama support. The separate Windows kit includes a CPU model and start/stop helper. Suggestions require explicit requests and individual acceptance; only the selected task's title and notes are sent to localhost.

## Verification

- All 48 automated tests pass, including PostgreSQL policy/Family tests in a local PGlite auth harness, native reminder logic, calendar round trips and AI payload boundaries.
- Spanish catalog coverage check and production build pass. Vite reports a non-blocking main bundle size warning.
- Browser: Spanish preferences survive reload; real local model suggestions can be accepted, saved and reopened; a three-occurrence .ics import appears on the timeline while completion stays at 2/5 (40%). Browser error log was empty during those checks.
- A real Qwen2.5-1.5B-Instruct Q4_K_M CPU model returned a five-step breakdown in approximately 2.4 seconds on this machine. Loopback CORS was checked for localhost and an external origin.
- Windows planner and optional helper compile successfully. The new planner package has not received a fresh normal Windows launch/closed-app notification test.

## Open

Extract TS-Planner-Windows-0.4.0.zip completely and open TS Planner.exe. Export a backup and quit the previous planner from its tray menu first; versions share the same local origin and storage. Keep supporting files together.

Optional AI: open the separate TS-Planner-Local-AI/TS Planner Local AI.exe, then select the portable engine in planner Settings. Keep the helper open while requesting suggestions. The kit uses about 1.2 GB disk space and additional RAM; it does not need a paid API.

## Still required for public launch

Owner-provided Supabase public URL/key, Google OAuth configuration and GitHub repository/deployment access are absent. Live Gmail login, Family membership, two-device synchronization and Google Calendar access are therefore unverified. Follow PRIORITY-A.md; keep secret/service-role keys out of frontend configuration. Windows OS reminder registration/delivery still requires normal desktop verification. Browser reminders require an open tab. Mobile native apps, payments and two-way calendar synchronization are outside this release.
