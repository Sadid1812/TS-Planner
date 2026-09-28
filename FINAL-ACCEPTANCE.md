# Final acceptance — work in progress

The owner requested one finished project, not further interim release deliveries. Do not label the project final or create another release archive until the remaining acceptance checks are complete. A zero-bug guarantee is not possible; report verified behavior and unresolved failures honestly.

## September 25 reliability fixes (not in the earlier downloadable archives)

- Failed saves freeze the write queue, preventing later stale snapshots from overwriting a newer plan in another window.
- Exact stored revision checks also reject unexpectedly missing or older records. Aborted IndexedDB transactions reject instead of leaving a pending save.
- Failed saves display an unsaved status and retain the unload warning and recovery export. Account switching cannot silently discard the recovery state.
- Cross-window refresh rechecks the account and pending-write state after loading, and invalidates stale undo history.
- Calendar events outside the daytime timeline remain visible. All-day events appear above the week timeline.
- 52 automated tests, Spanish catalog coverage, production build and Windows compilation pass. Browser checks on isolated localhost:4179 verified saving, opening the saved note in a second window and propagation back to the first.

## September 27 setup and first-run corrections

- Supabase Google provider configured and enabled; Email provider disabled. Public readiness checks pass.
- Production Site URL and web, Windows and local-test callback allowlist saved and read back.
- Google Cloud project and OAuth client created; owner account added as a test user. Google app remains in Testing.
- New local planners start empty instead of loading five sample tasks and artificial 40% progress. Existing saved plans are preserved.
- Normal Windows launch verified on September 27: the planner renders and preserves the existing local profile and history.
- Spanish dynamic task actions, icon names, schedule conflicts and common error messages translated. Placeholder tests ensure task text is preserved. Production build, 57 automated tests and static Spanish catalog check pass.
- GitHub source and cross-platform CI were previously published successfully. Deployment variables and Pages publication still need verification.

## Acceptance still pending

- Real Gmail sign-in/cancel/sign-out in browser and Windows; age gate and non-Gmail rejection.
- Live two-account Family invitation, privacy, sharing and leaving; live two-device sync including conflicts and offline recovery.
- Real Google Calendar consent, refresh, expiry and disconnect.
- Actual closed-app reminder delivery and a launch recheck after final packaging.
- Final phone/keyboard usability pass and remaining server-generated error messages.
- Deploy the configured web app, verify the deployed origin and offline behavior, then create the final deliverables together.

Do not put secrets in chat or frontend environment variables. No paid plan is authorized. Native mobile apps and payments remain future scope per the original product decisions.
