# TS Planner

A daily planner for web and Windows, with an editable timeline, priorities, notes, repeating tasks and seven themes. New planners start empty. Existing work is preserved when upgrading.

Website: https://sadid1812.github.io/TS-Planner/

The website is deployed and the Windows application launches. Final acceptance remains in progress. See [FINAL-ACCEPTANCE.md](FINAL-ACCEPTANCE.md) for verified behavior and unresolved checks. Earlier numbered release documents are historical checkpoints.

## Using the planner

- Add tasks with icons, colors, checklists, notes, times and optional priority. A scheduled priority counts once.
- Repeating tasks have independent outcomes. Edit one occurrence, future occurrences or the series. Overnight tasks and confirmed overlaps are supported.
- Review unfinished work from the bell. Moving overdue work preserves its previous history.
- Choose Evening, Coffee, Botanical, Retro, Ocean, Sky or Neon Punk and independent bundled font options. English/Spanish and 12/24-hour time are available.
- Tasks and notes save on this device. Export a backup before clearing browser storage or moving installations. Web and Windows have separate storage.
- An online visit first caches the website for offline use. Removing browser cache can remove offline availability.
- Gmail cloud accounts are for ages 13+. Sync is manual from the account menu, with explicit conflict choices and recovery copies. Family sharing starts off and exposes only daily progress and earned title when enabled.
- Google Calendar is read-only and requires separate consent. Calendar file import/export works without Google access. Events do not increase task-completion scores.

Web reminders require an open tab and awake device. The Windows scheduled worker is designed to run after quitting while you are signed into Windows and the device is awake; actual OS delivery still needs acceptance testing. No browser push service, signed installer, automatic updater or native mobile app is included. Local AI is optional and requires a separately running local engine.

## Development

Use Node.js 22.12 or later:

```sh
npm ci
npm run dev
npm run build
npm test
npm run test:locale
npx playwright install chromium
npm run test:e2e
```

Browser tests use disposable storage. On Windows they default to installed Chrome; set E2E_CHANNEL=chromium to use Playwright's browser. Set E2E_BASE_URL to test a deployed origin instead of the automatic local preview. Tests cover first-run state, persistence, offline reload/editing, cross-window updates, phone layout, dialog focus and Spanish controls.

Static files build into dist/client. Sites-compatible worker files are retained. GitHub checks run unit/database tests on Windows and Ubuntu and browser tests on Ubuntu. The manual Publish TS Planner workflow validates cloud configuration and tests the app before deploying to Pages.

## Windows build

Build the website, extract Microsoft.Web.WebView2 version 1.0.4191.47 from NuGet, then run:

```sh
node scripts/build-webview.mjs <extracted-SDK-directory>
```

The output is release/TS-Planner-Windows. Open TS Planner.exe with its DLLs and web folder beside it. Requires Windows x64, .NET Framework 4.8 and Microsoft WebView2 Runtime. Closing hides the app in the tray; Quit TS Planner exits it. Data is under %LOCALAPPDATA%/TS Planner. Keep the installation folder in place while scheduled reminders are enabled.

The older Electron wrapper is experimental and is not the supported Windows launcher.

## Backend and deployment

Read [SUPABASE-SETUP.md](SUPABASE-SETUP.md). Inspect the existing database before targeted migrations: do not rerun the fresh-project bootstrap over existing tables. Google secrets belong only in the Supabase provider dashboard. Frontend builds use the public URL and publishable key, never a service-role key.

Pages uses GitHub Actions. Repository variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY contain public configuration. No paid service is enabled. Google OAuth remains in Testing until the remaining launch setup and real-account acceptance checks are complete.

## Attribution

Lucide icons (ISC). DM Sans, Fraunces, Lora and Space Grotesk fonts (SIL Open Font License, through Fontsource). The Windows package includes Microsoft's WebView2 license and notices.
