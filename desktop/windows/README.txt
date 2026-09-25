TS PLANNER 0.3.0 - WINDOWS

Extract the entire folder, then open TS Planner.exe.
Keep its DLLs and web folder together. Quit older versions from the tray first.
Export a backup in Settings before changing builds or computers.

Closing the window keeps the planner in the tray. Quit exits the planner.
Requirements: Windows x64, .NET Framework 4.8, Microsoft WebView2 Runtime.
Official runtime: https://developer.microsoft.com/microsoft-edge/webview2/

Reminders: Settings > Device reminders > Enable registers a per-user Windows
scheduled task. It checks the saved schedule each minute even after Quit.
Keep this app folder in place. You must be signed into Windows and awake;
Windows notification preferences may silence delivery. Reminders more than
five minutes late are skipped. Disable reminders before removing the app.
No administrator password is requested. Notes and profile data are excluded
from the encrypted per-user reminder snapshot.

The worker and timing engine compile and pass local tests. Actual scheduled
notification delivery still needs verification in normal Windows execution.

Gmail login, Family, cloud sync and Google Calendar need provider configuration.
This package stores plans locally because public backend values are absent.
Browser and desktop storage are separate; backups can transfer your plan.

Data and startup logs: %LOCALAPPDATA%\TS Planner\WebView2
Encrypted reminder snapshot and worker errors: %LOCALAPPDATA%\TS Planner\Reminders
