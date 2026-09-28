# Connect the TS Planner backend

Project: `ofqmakzdfdkruoqpkhez`. The public URL/key have been saved in the local ignored `.env.local`. Live SQL inspection on September 26, 2026 confirmed six planner tables, RLS enabled on all six, all eleven expected functions, and the `own_planner` policy. Google sign-in is now configured and enabled; Email is disabled. The public cloud readiness check passes. Real signed-in tests remain outstanding.

## 1. Preserve the existing database

Do not rerun `supabase/schema.sql` on this project: it is a fresh-project bootstrap, and its tables already exist. The reported `42P07` error was caused by repeating that bootstrap. Inspect columns, function definitions, grants and policies before applying targeted migrations. The inventory confirms object presence, not complete behavioral correctness; signed-in access and two-account tests remain required. Only use the full bootstrap once when provisioning a separate empty project.

## 2. Configure Google sign-in

Google Cloud project `ts-planner-509808` (display name **TS Planner**) was created on September 26, 2026. No billing or free trial was activated. Google Auth Platform configuration was saved with the owner-approved support/contact email and External testing audience. The owner created the **Web application** client `TS Planner Web and Windows via Supabase`; its ID and secret were transferred into Supabase and the provider was enabled. The owner account is on Google's test-user list. The secret is not stored in source. Its authorized redirect URI is:

`https://ofqmakzdfdkruoqpkhez.supabase.co/auth/v1/callback`

Use `https://sadid1812.github.io` as the website origin. Put the client ID and client secret into **Supabase > Authentication > Sign In / Providers > Google**, then enable Google. Keep the secret in the provider dashboard, never chat, source code or GitHub variables. Disable the Email provider. While Google's app is in testing, add the two Gmail accounts that will test the planner as test users.

Source: https://supabase.com/docs/guides/auth/social-login/auth-google

## 3. Redirect settings

Saved and read back in Supabase Authentication URL Configuration: Site URL `https://sadid1812.github.io/TS-Planner/`, with these redirect URLs:

- `https://sadid1812.github.io/TS-Planner/`
- `http://127.0.0.1:43178/auth/callback/*` (Windows, random one-use callback suffix)
- `http://localhost:4179/` (temporary local testing)

Source: https://supabase.com/docs/guides/auth/redirect-urls

## 4. Deployment and verification

The manual Pages workflow expects two public repository Actions variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Use the supplied project URL and publishable key. It now checks Google configuration, table existence and anonymous access denial before publishing. These checks do not replace real two-account tests.

After configuration, run the supplied database access checks in the test project and test Gmail sign-in, age confirmation, private plans, Family sharing, conflicting edits and Windows callbacks. Google Calendar also needs Calendar API enabled and consent for the read-only calendar scope; this is separate from basic sign-in.
