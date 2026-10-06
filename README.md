# mac-idle-keeper

Small background Electron daemon for macOS. During the configured window it checks `powerMonitor.getSystemIdleTime()` every 5 minutes. On Monday and Wednesday-Friday, from 07:00 (inclusive) to 17:00 (exclusive), it keeps macOS awake with `caffeinate -dimsu` and posts a physical mouse HID event when idle time is greater than 9 minutes.

## Run

```bash
pnpm install
pnpm start
```

The log is written to Electron's user-data directory. Override it with `IDLE_LOG_FILE=/path/to/file`.

The monitor also shows a macOS notification when it starts and when it is stopped. On macOS it uses `osascript` so notifications work even when running directly with `pnpm start`; macOS may ask for notification permission for Terminal/your shell.

While the monitor is inside the active schedule, the awake guard prevents display, idle-system, disk, and system sleep. It stops the `caffeinate` process outside the schedule or when the monitor exits. It does not override a forced shutdown or closing the lid.

## `.env` configuration

Copy `.env.example` to `.env` and edit the values:

```bash
cp .env.example .env
```

The `.env` file is loaded automatically from the project root. Variables already exported in the shell take precedence over `.env` values.

For a fast, safe test profile, use the included `.env.test`:

```bash
pnpm run start:test
tail -f idle-test.log
```

This checks every 10 seconds after 10 seconds of idle and uses the real CoreGraphics HID event action. The first run compiles a tiny native macOS helper. Stop it with `Ctrl+C`.

For a detection-only dry run, copy `.env.example` to `.env` and set `IDLE_ACTION=none`.

To install it as a per-user background LaunchAgent:

```bash
pnpm run launch-agent:install
```

LaunchAgent management commands:

```bash
pnpm run launch-agent:status     # Show a colored human-readable status summary
pnpm run launch-agent:stop       # Stop it; preserve the plist
pnpm run launch-agent:pause      # Stop and disable automatic relaunch
pnpm run launch-agent:resume     # Enable and start it again
pnpm run launch-agent:restart    # Restart it with the current .env
pnpm run launch-agent:uninstall  # Stop it and remove the plist
```

macOS may require Accessibility/Input Monitoring permission if the chosen action is later changed to a synthetic keyboard or mouse event. The default `caffeinate` action does not move the pointer or type.

## Configuration

`IDLE_CHECK_INTERVAL_MS`, `IDLE_THRESHOLD_SECONDS`, `IDLE_DAYS`, `IDLE_START_TIME`, `IDLE_END_TIME`, `IDLE_TIMEZONE`, and `IDLE_ACTION` (`hid-event`, `caffeinate`, or `none`) can be set as environment variables. `IDLE_DAYS` accepts `all_week`, `weekend`, `working_days`, names (`mon`, `tuesday`), or numbers (`0` Sunday through `6` Saturday). Times use `HH:MM`, including values such as `17:30`.

The default `hid-event` physically moves the cursor 10 pixels out and back over 300 ms, while also posting the events to reset the macOS HID idle timer and make the activity visible to apps such as Discord. For a safe dry run, use `IDLE_ACTION=none`.

## Tests

```bash
pnpm run check
```
