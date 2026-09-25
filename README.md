> Current build: 0.4.0. See [release notes](RELEASE-0.4.0.md) and [build status](BUILD-STATUS.md) for current verification and limitations. Earlier sections below describe historical prototypes.

# Latest build: TS Planner 0.2.0

Read BUILD-STATUS.md for current features, verification, and remaining setup. Use release/TS-Planner-Windows-0.2.0. Earlier release paths below describe previous checkpoints.

# TS Planner · first working build

A local daily planner with the approved charcoal-and-amber design, a full-width daily note, and seven appearance themes. This is an early working release, not a fully launched account service.

## Use it

The running preview is at http://127.0.0.1:4173/.

The working Windows release is `release/TS-Planner-Windows-0.1.0/TS Planner.exe`. Keep its entire folder together. It uses the installed Microsoft WebView2 runtime and stores local data under `%LOCALAPPDATA%/TS Planner/WebView2`. Closing the window keeps it in the tray; choose **Quit TS Planner** from the tray to exit.

Open **Settings → Appearance** for Evening, Coffee, Botanical, Retro, Ocean, Sky, and Neon Punk. Typography can follow the theme or use Editorial, Literary, Modern, or Technical. Fraunces, Lora, DM Sans, and Space Grotesk are bundled, so fonts need no network request.

Sample tasks are clearly labeled. **Start a blank planner** clears the samples after confirmation. Your tasks, notes, and preferences save in this browser's IndexedDB. Export a backup before clearing browser data or moving between the browser and desktop app; each has separate local storage.

## Implemented

- Add/edit tasks, descriptions, icons, colors, dates, time blocks, and three open priorities.
- Daily, weekly, weekday, and weekend repetition with independent occurrence outcomes.
- Edit one occurrence, future occurrences, or the series while preserving past outcomes.
- Overlap warnings, free-slot suggestions, and explicit overnight times.
- Completion percentage, calendar history, weekly consistency, earned titles, skip/cancel, and undo.
- Bell inbox for unfinished work; move to today, review, or skip.
- Autosaved daily notes, task/note search, JSON backup/restore, and browser printing.
- Responsive phone layout and all seven themes, with independent heading font preferences.
- Static web build, bundled fonts, and a service worker for cached offline loading after the first successful visit.
- Portable Windows packaging with a tray menu and reminders while the process remains running.

## Limits to understand

- Gmail sign-in, manual cloud sync, and family screens are implemented as an integration scaffold. **No backend has been connected or live-tested.** The current build explicitly operates locally.
- The Windows build currently disables cloud sign-in; a tested desktop OAuth callback flow is still required. Backup files can transfer plans between browser and Windows.
- Web reminders require an open planner. Windows reminders require the app to remain open or in its tray. No reminder can wake a powered-off computer; closing the process stops reminders. System notification settings also apply.
- Offline web loading requires a prior online visit and retained browser cache. Offline reload and OS notification delivery still need end-to-end validation on target devices.
- English is implemented. The language setting states that translations are planned. Both 12-hour and 24-hour formats work.
- The schedule uses the device time zone. Dedicated travel-time-zone settings and different weekend sleep settings are not implemented.
- The bell shows the last 30 days of recurring misses plus older one-time tasks. Older recurring history remains in Calendar.
- Family percentages and reward titles are self-reported motivation, not verified performance or a fair ranking between people.
- Cloud synchronization is manual and resolves conflicts by choosing one whole document after offering a backup. It does not merge individual task edits.
- No public deployment, signed Windows installer, automatic updater, push reminder service, or payment system has been created.

## Development

Use Node.js 22.12 or newer. Install dependencies with `npm ci`, then use `npm run dev`, `npm run build`, `npm run preview`, or `npm test`. `--configLoader native` avoids configuration bundling issues in restricted Windows workspaces.

The primary Windows wrapper is `desktop/windows/Planner.cs`. Build the web files, download and extract Microsoft.Web.WebView2 version 1.0.4191.47 from NuGet, then run `node scripts/build-webview.mjs <SDK-directory>`. This uses the Windows .NET Framework compiler and produces `release/TS-Planner-Windows`. Icon generation is reproducible with `node scripts/create-icons.mjs`.

The earlier Electron wrapper is retained as an experimental alternative; it failed on the target machine and is not the delivered Windows app. Its scripts are named `desktop:electron` and `package:electron`.

The source is in `src/`, the Windows wrapper is in `desktop/`, and the optional backend schema is in `supabase/schema.sql`. The starter Sites worker remains intact, but the web app also builds as plain static files under `dist/client`.

## Connect the web account service

1. Create a Supabase project and apply `supabase/schema.sql` to a **new test project**. The SQL is provided for integration and has not been executed here.
2. Enable Google as the authentication provider; configure its client ID, secret, and Supabase callback in Google's console. These credentials belong in the provider dashboard, never frontend source.
3. Copy `.env.example` to `.env.local`. Enter only the Supabase project URL and public anon/publishable key. Never put a service-role key in a `VITE_` variable.
4. Allow the exact web app URL, including any GitHub repository subpath, in Supabase's redirect allowlist. Rebuild the frontend.
5. Test with two verified Gmail accounts: private documents must not be readable across users, stale revisions must fail, unused invitations must expire, consumed invitations must not be reusable, and sharing must remain off until enabled.
6. Test account deletion and retention, privacy notices, age 13+ consent flows, authorization failure states, recovery, and free-tier resource limits before a public launch.

For GitHub Pages, publish the contents of `dist/client` using a Pages workflow or branch. Relative asset paths support repository subpaths. This repository has not been pushed or deployed.

## Attribution

Icons: Lucide (ISC). Fonts: DM Sans, Fraunces, Lora, and Space Grotesk (SIL Open Font License, provided through Fontsource). The Windows launcher uses Microsoft's WebView2 SDK and the installed WebView2 runtime. SDK license notices are included with the Windows release.

## Validation status

The user confirmed that the WebView2 Windows build opens the planner, and its application log recorded `Planner UI ready`. The earlier virtual-host mapping produced ERR_ACCESS_DENIED; the delivered build serves bundled files through a localhost-only server on port 43178 instead. No public network binding is used. The restricted automation environment cannot start Chromium child processes, so native OS reminder delivery remains unverified. See `design-qa.md` for browser checks.

## Section 1 checkpoint

Read SECTION-1-CHECKPOINT.md for reminder limits, age-gate changes, persistence evidence, and remaining cloud integration tests. Backend selection is pending Priority A; the Supabase setup above is a scaffold, not an approved deployment plan.


## Priority A implementation

See PRIORITY-A.md for the backend decision, activation instructions, and live-test requirements. The current Windows package is release/TS-Planner-Windows-PriorityA. Gmail sign-in is implemented but remains unavailable until public cloud configuration is supplied and the backend is set up. This replaces the earlier statement that Windows cannot use cloud sign-in.


