# Prevent Discord Idle

Prevent Discord Idle is a macOS background monitor that detects extended system inactivity and generates a small, physical mouse movement so desktop applications such as Discord can recognize renewed activity.

During its active schedule it also runs a macOS `caffeinate` assertion to prevent display, idle-system, disk, and system sleep. The monitor is built with Electron because it uses `powerMonitor.getSystemIdleTime()` to read macOS idle time.

> macOS only · Node.js 20+ · pnpm 11

## Features

- Configurable idle polling interval and threshold.
- Minute-precision schedules with configurable days and timezone.
- Physical 10-pixel mouse movement over approximately 300 ms when the threshold is exceeded.
- `caffeinate` awake guard while the schedule is active.
- macOS start and stop notifications.
- Foreground mode for testing and a per-user LaunchAgent for background operation.
- Colorized, human-readable LaunchAgent status with runtime configuration and the last five activity actions.
- Log inspection from the LaunchAgent command namespace, including real-time follow mode.
- `.env` support without overriding variables already exported in the shell.
- Automated tests for scheduling, monitoring, runtime state, notifications, and LaunchAgent behavior.

## Requirements

- macOS with an active user session.
- Node.js 20 or newer.
- pnpm 11.18.0 or a compatible pnpm 11 release.
- Accessibility permission for the Electron app used by the project. macOS may also request Input Monitoring or notification permissions depending on the system configuration.

## Installation

```bash
git clone <repository-url>
cd mac-idle-keeper
pnpm install
pnpm run check
```

The project is currently released as `1.0.1`. See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Configuration

Copy the example file and edit it:

```bash
cp .env.example .env
```

The monitor loads `.env` from the project root at startup. Existing shell variables take precedence over values in `.env`. Configuration changes require a process restart.

### Default behavior

When no `.env` file or environment overrides are provided, the project uses:

```text
Polling interval:       every 5 minutes
Idle threshold:         greater than 9 minutes
Active days:            Monday, Wednesday, Thursday, Friday
Active window:          07:00 inclusive through 17:00 exclusive
Timezone:               America/Monterrey
Idle action:            physical 10-pixel mouse movement over ~300 ms
Awake guard:            caffeinate -dimsu during the active window
Application log:        Electron user-data directory
```

| Variable | Default | Description |
| --- | ---: | --- |
| `IDLE_CHECK_INTERVAL_MS` | `300000` | Polling interval in milliseconds; `300000` is 5 minutes. |
| `IDLE_THRESHOLD_SECONDS` | `540` | Run the activity action only when idle time is greater than 9 minutes. |
| `IDLE_DAYS` | `mon,wed,thu,fri` | Active days. Supports aliases, names, or numbers. |
| `IDLE_START_TIME` | `07:00` | Schedule start, inclusive, in `HH:MM`. |
| `IDLE_END_TIME` | `17:00` | Schedule end, exclusive, in `HH:MM`. |
| `IDLE_TIMEZONE` | `America/Monterrey` | IANA timezone used for schedule evaluation. |
| `IDLE_ACTION` | `hid-event` | `hid-event`, `caffeinate`, or `none`. |
| `IDLE_LOG_FILE` | Electron user-data log | Optional log file path. |

### Days

The following aliases are supported:

```env
IDLE_DAYS=all_week       # Sunday through Saturday
IDLE_DAYS=weekend        # Saturday and Sunday
IDLE_DAYS=working_days   # Monday through Friday
```

You can also use names or numeric day values (`0` Sunday through `6` Saturday):

```env
IDLE_DAYS=mon,wed,thu,fri
IDLE_DAYS=1,3,4,5
```

`IDLE_START_HOUR` and `IDLE_END_HOUR` remain supported for whole-hour compatibility. `IDLE_START_TIME` and `IDLE_END_TIME` take precedence when both forms are present.

## Running in the foreground

Use the normal configuration:

```bash
pnpm start
```

The monitor performs an immediate check, then polls at the configured interval. Stop it with `Ctrl+C`.

For a controlled 10-second test using the real physical activity action:

```bash
pnpm run start:test
tail -f idle-test.log
```

The `.env.test` profile uses:

```env
IDLE_CHECK_INTERVAL_MS=10000
IDLE_THRESHOLD_SECONDS=10
IDLE_DAYS=all_week
IDLE_START_TIME=00:00
IDLE_END_TIME=24:00
IDLE_ACTION=hid-event
```

For detection-only testing, use `IDLE_ACTION=none`. This logs detections without moving the cursor or running the activity action.

## Running in the background

Install the per-user macOS LaunchAgent:

```bash
pnpm run launch-agent:install
```

The LaunchAgent starts at login, keeps the monitor alive, and uses the `.env` file from the project root. It is scoped to the current user session; it does not run before login.

### LaunchAgent commands

```bash
pnpm run launch-agent:status      # Show runtime status and recent activity
pnpm run launch-agent:logs        # Show the last 50 application log lines
pnpm run launch-agent:logs -- --follow  # Follow the application log in real time
pnpm run launch-agent:stop       # Stop the process; preserve the plist
pnpm run launch-agent:pause      # Stop and disable automatic relaunch
pnpm run launch-agent:resume     # Enable and start it again
pnpm run launch-agent:restart    # Refresh the plist and restart the service
pnpm run launch-agent:uninstall  # Stop the service and remove the plist
```

After changing `.env`, restart the LaunchAgent so the running process loads the new values:

```bash
pnpm run launch-agent:restart
```

## Status and runtime state

```bash
pnpm run launch-agent:status
```

The status command reports:

- whether the LaunchAgent is installed;
- whether it is enabled, running, stopped, or paused;
- the running PID and launch count;
- whether the running monitor is inside or outside its schedule;
- the effective schedule loaded by the running process;
- the last check and last check status;
- the last five executed activity actions.

The monitor writes its effective startup configuration to:

```text
~/Library/Application Support/mac-idle-keeper/runtime-state.json
```

This lets `launch-agent:status` report the configuration actually loaded by the process instead of rereading a newer `.env` file that has not been applied yet.

## Logs and notifications

By default, the application log is written to:

```text
~/Library/Application Support/mac-idle-keeper/mac-idle-keeper.log
```

LaunchAgent process output is written to:

```text
logs/launch-agent.stdout.log
logs/launch-agent.stderr.log
```

The log command reads the application log. By default it prints the last 50 lines:

```bash
pnpm run launch-agent:logs
```

Use `--follow` (or `-f`) to keep the command open, and `--lines` (or `-n`) to change the number of initial lines:

```bash
pnpm run launch-agent:logs -- --follow
pnpm run launch-agent:logs -- --lines 100
```

The monitor shows a macOS notification when it starts and when it stops. When running directly with `pnpm start`, notifications are sent through `osascript`; macOS may require notification permission for Terminal or the shell application.

## macOS permissions

The default `hid-event` action uses a small native CoreGraphics helper to move the cursor physically and post mouse events. If the cursor does not move or the idle counter does not reset, add the Electron app used by the project to:

- **System Settings → Privacy & Security → Accessibility**
- **System Settings → Privacy & Security → Input Monitoring**, if requested by macOS

For a pnpm installation, the Electron app is typically located at:

```text
node_modules/.pnpm/electron@<version>/node_modules/electron/dist/Electron.app
```

The first `hid-event` execution compiles the native helper with macOS `clang` into the system temporary directory.

## How it works

1. Electron reads the configured timezone and determines whether the current day/time is inside the schedule.
2. Inside the schedule, an `awake guard` runs `caffeinate -dimsu`.
3. The monitor reads `powerMonitor.getSystemIdleTime()` at the configured interval.
4. When idle time is strictly greater than `IDLE_THRESHOLD_SECONDS`, the configured activity action runs.
5. The runtime state and logs are updated so the LaunchAgent status command can inspect the live process.

The activity action does not run continuously; it runs only after the idle threshold is exceeded. The awake guard is separate and remains active for the schedule window.

## Troubleshooting

### LaunchAgent does not start

Check the status and process logs:

```bash
pnpm run launch-agent:status
tail -f logs/launch-agent.stderr.log
```

Validate the generated plist:

```bash
plutil -lint "$HOME/Library/LaunchAgents/com.local.mac-idle-keeper.plist"
```

If the plist was generated by an older project version, refresh it with:

```bash
pnpm run launch-agent:restart
```

### The process runs but uses old settings

The monitor loads `.env` only at startup. Restart it:

```bash
pnpm run launch-agent:restart
```

Then verify the effective runtime configuration:

```bash
pnpm run launch-agent:status
```

### Idle time does not reset

Run the controlled profile and inspect `idleAfter` in the log:

```bash
pnpm run start:test
tail -f idle-test.log
```

After an action, `idleAfter=0s` or a small value indicates that macOS accepted the activity event. If it remains high, verify Accessibility permissions for the Electron app and restart the process.

## Development

Run the test suite:

```bash
pnpm run check
```

The test suite uses Node's built-in test runner and covers scheduling, day groups, monitor thresholds, runtime state, notifications, and the awake guard.

## Project layout

```text
src/
  actions.js          Activity actions and native helper lifecycle
  awake.js            caffeinate awake guard
  config.js           Environment configuration and validation
  env.js              .env loading
  logger.js           File/console logging
  main.js             Electron process entrypoint
  monitor.js          Idle polling and schedule coordination
  notifications.js    macOS notifications
  runtime-state.js    Effective runtime state persistence
  schedule.js         Timezone-aware schedule evaluation
scripts/
  idle-reset.m        CoreGraphics physical mouse helper
  install-launch-agent.js
  manage-launch-agent.js
test/                  Automated tests
```

## Versioning

This project follows Semantic Versioning. Release notes are maintained in [CHANGELOG.md](CHANGELOG.md).

## License

No license has been selected for this repository yet. Add a license before distributing the project publicly.
