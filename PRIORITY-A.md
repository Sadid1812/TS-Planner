> September 11 update: the corrected SQL schema now runs in local PostgreSQL tests, including age, isolation, revision, invitation, and sharing checks. Provider activation and real multi-device tests remain outstanding. See RELEASE-0.3.0.md; the initial checkpoint below is historical.

# Priority A — Gmail accounts and synchronization

Implementation checkpoint: September 10, 2026. Real accounts are not activated yet.

## Backend decision

| Option | Cost and operating constraint | Setup for this project | Portability |
| --- | --- | --- | --- |
| Supabase Free — selected | $0 within its limits; 500 MB database, 50,000 monthly active users, 5 GB egress. Inactive free projects can pause after one week. | Reuses the existing SQL and Google OAuth scaffold. Database functions handle invitations and revision checks without a separate application server. | PostgreSQL data and SQL are portable; authentication and client APIs still require migration work. |
| Firebase Spark | No-cost plan with product quotas. Firestore free allowance includes 1 GiB stored data, 50,000 reads and 20,000 writes per day. | Google authentication fits, but the planner's SQL authorization and Family transactions would need a new implementation. | Firestore queries, rules, and document structure are provider-specific. |
| Self-hosted database/auth | No fixed vendor subscription if hardware is already available, but hosting, uptime, backups, and maintenance still need resources. | Adds server operation work to a project targeting static GitHub hosting and a Windows client. | More infrastructure control, with more operational responsibility. |

The choice favors the existing relational model and available implementation, not an assertion that Supabase is universally best. Keep the project on Free; do not add billing or paid services automatically. A larger public launch needs a new capacity decision. Local planning remains available if cloud service is unavailable.

Sources checked: [Supabase pricing](https://supabase.com/pricing), [Firebase plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Firestore quotas](https://firebase.google.com/docs/firestore/quotas). Setup follows [Supabase Google authentication](https://supabase.com/docs/guides/auth/social-login/auth-google) and [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## What changed

- Google OAuth uses PKCE. Non-Gmail or unverified identities are rejected in the frontend and by the backend authorization function. The account age confirmation still gates cloud documents and Family.
- Windows opens OAuth in the system browser. A random, expiring, single-use localhost callback returns the authorization code to the app; its PKCE verifier remains in the app. The native bridge permits only the expected Google-provider Supabase authorization endpoint and matching callback. No token is placed in the callback HTML.
- Account switching hides the previous planner while the new account's local copy loads. Undo history is cleared across account switches.
- Sync stores its baseline with the account's device copy. Reopening the menu does not discard the known cloud revision.
- A local-only change uploads; a remote-only change downloads with a local backup; simultaneous changes require an explicit choice. Unknown cloud copies are never silently overwritten. Edits made while uploading remain pending for the next sync.
- Server writes include the expected account ID as well as the expected revision, preventing a session switch from directing a write to another account.
- A user can copy their separate local planner into the signed-in account after downloading a backup. Signing in does not silently upload local data.
- Build validation rejects secret/service-role keys and incomplete public connection settings. The production build is still local-only when both public settings are absent.
- A manual GitHub Pages workflow builds, tests, and publishes the static app. It has not been run or deployed.

## Privacy interpretation

The requirement that email and display name are readable only in an admin console cannot be met literally by static browser-based Google OAuth. The authentication SDK receives the current user's identity. Other users must never receive that identity through planner or Family APIs. The account screen now uses a generic signed-in label, and progress publication does not send the planner display name as a Family name. An account's private planner can still contain its own chosen display name.

Google provider secrets and Supabase secret/service-role keys belong only in the provider administration tools. Public project URL and publishable/anon key are intentionally included in the client. Authorization is enforced by database permissions, not by hiding those public values.

## Activation steps

1. Create a Supabase **Free** project. In a new test project, execute `supabase/schema.sql`. This is a fresh schema, not a migration for an existing database.
2. In Google Cloud, create/configure an OAuth web client and consent screen. Configure its authorized redirect URI using the exact callback URL shown by Supabase. Keep the Google client secret in Supabase's Google provider settings. Enable only Google sign-in.
3. In Supabase Auth URL settings, add the exact hosted web URL including its GitHub repository subpath and trailing slash. For local web testing, add the exact local origin/path. For Windows, allow `http://127.0.0.1:43178/auth/callback/*`; only this dedicated path needs a wildcard for the random callback suffix.
4. Copy `.env.example` to `.env.local`, and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project URL and public publishable/anon key. No secret keys. Rebuild the web and Windows packages.
5. Execute `supabase/verify-access.sql` in the new test project's SQL editor. It uses synthetic users and rolls back its changes. It checks age gating, account isolation, expected-account protection, and stale writes. It has not been executed in this workspace because no PostgreSQL/Supabase instance is available.
6. Exercise real Google login, cancellation, expired callback, invalid provider, sign-out/reopen, and two-device sync. Test changes on both devices before synchronization and while an upload is pending. Confirm private documents cannot be read by another account. Test Windows login in the normal Windows environment.
7. For GitHub Pages, place this project at the repository root, set Pages source to GitHub Actions, and add the two public values as repository Actions variables with the same names. Run the manual Publish TS Planner workflow when ready. No repository or deployment has been created here.

Google consent/publication requirements and provider testing restrictions must be resolved in the owner's dashboards before public launch. Do not paste secrets into chat.

## Validation and remaining work

The production build and 16 automated tests passed before packaging. These include four new tests for sync decisions and identity filtering. Windows C# compilation also passed. This proves buildability and the tested local logic, not live OAuth or database behavior.

Remaining blockers for Priority A completion: owner-controlled Supabase project, Google OAuth configuration, public connection values, execution of SQL checks, and live web/Windows authentication and two-device tests. Manual sync is intentional for this stage; automatic background synchronization and per-record merging are not implemented. Priorities B–H remain on the development list.
