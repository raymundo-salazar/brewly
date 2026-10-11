# Mac Idle Keeper

Mac Idle Keeper is a macOS background monitor that detects extended system inactivity and generates configurable activity for user-authorized desktop work and workflows. It operates at the macOS level and does not require integration with a particular application.

During its active schedule it also runs a macOS `caffeinate` assertion to prevent display, idle-system, disk, and system sleep. The monitor is built with Electron because it uses `powerMonitor.getSystemIdleTime()` to read macOS idle time.

> macOS only · Node.js 22.12+ · npm or pnpm

## Features

- Configurable idle polling interval and threshold.
- Minute-precision schedules with configurable days and timezone.
- Configurable activity actions, including physical 10-pixel mouse movement over approximately 300 ms.
- `caffeinate` awake guard while the schedule is active.
- macOS start and stop notifications.
- Foreground mode for testing and a per-user LaunchAgent for background operation.
- Colorized, human-readable output across the CLI commands, including LaunchAgent status and the last five activity actions.
- Log inspection from the LaunchAgent command namespace, including real-time follow mode.
- `.env` support without overriding variables already exported in the shell.
- Automated tests for scheduling, monitoring, runtime state, notifications, and LaunchAgent behavior.

## Appropriate use cases

Mac Idle Keeper is useful when a task you intentionally started needs the workstation to remain available for a defined period. Examples include:

- long-running local builds, test suites, or development environments;
- video, audio, image, or 3D rendering jobs;
- large backups, file transfers, data exports, or local synchronization tasks;
- data processing, report generation, or simulations running on the Mac;
- authorized remote sessions or dashboards where system sleep would interrupt the work.

The schedule, threshold, and activity action should be limited to the period required by the task. On portable Macs, consider using the tool while connected to power and review macOS energy settings because preventing idle sleep can increase energy use. Apple documents related sleep controls in [Mac battery settings](https://support.apple.com/guide/mac-help/change-battery-settings-mchlfc3b787/mac) and notes that sleep-prevention assertions are intended for work that sleep would interrupt in [XPC activity documentation](https://developer.apple.com/documentation/xpc/xpc_activity_prevent_device_sleep).

## Requirements

- macOS with an active user session.
- Node.js 22.12 or newer.
- npm or pnpm 11.18.0 (pnpm is used for repository development).
- Accessibility permission for the Electron app used by the project. macOS may also request Input Monitoring or notification permissions depending on the system configuration.

## Installation

### Install the global CLI

The recommended user installation is through npm:

```bash
npm install --global mac-idle-keeper
mac-idle-keeper help
```

The package includes Electron and all runtime dependencies. macOS may ask for Accessibility or notification permissions the first time the monitor runs.

### Use the TypeScript/Node.js API

The package also exposes its application-independent runtime components for integrations that need to compose configuration, scheduling, logging, or monitoring behavior:

```js
const { loadConfig, createMonitor } = require('mac-idle-keeper');
```

The published package includes generated JavaScript and `.d.ts` declarations. The Electron bootstrap remains an internal process entrypoint used by `mac-idle-keeper start` and the LaunchAgent.

### Install from source

```bash
git clone <repository-url>
cd mac-idle-keeper
pnpm install
pnpm run check
```

The project is currently released as `1.4.0`. See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Configuration

Copy the example file and edit it:

```bash
cp .env.example .env
```

When using the global npm installation, run that command from the directory where you want to keep your configuration. You can copy the example from the installed package with:

```bash
cp "$(npm root --global)/mac-idle-keeper/.env.example" .env
```

The monitor loads `.env` from the current working directory at startup. Existing shell variables take precedence over values in `.env`. Configuration changes require a process restart. Use `IDLE_ENV_FILE` or `--env-file` when the configuration is stored elsewhere.

At startup, the effective configuration is compared with the previous one and changes are recorded in the application log. This includes the polling interval, idle threshold, days, start/end times, timezone, action, and log path.

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

| Variable                 |                Default | Description                                                            |
| ------------------------ | ---------------------: | ---------------------------------------------------------------------- |
| `IDLE_CHECK_INTERVAL_MS` |               `300000` | Polling interval in milliseconds; `300000` is 5 minutes.               |
| `IDLE_THRESHOLD_SECONDS` |                  `540` | Run the activity action only when idle time is greater than 9 minutes. |
| `IDLE_DAYS`              |      `mon,wed,thu,fri` | Active days. Supports aliases, names, or numbers.                      |
| `IDLE_START_TIME`        |                `07:00` | Schedule start, inclusive, in `HH:MM`.                                 |
| `IDLE_END_TIME`          |                `17:00` | Schedule end, exclusive, in `HH:MM`.                                   |
| `IDLE_TIMEZONE`          |    `America/Monterrey` | IANA timezone used for schedule evaluation.                            |
| `IDLE_ACTION`            |            `hid-event` | `hid-event`, `caffeinate`, or `none`.                                  |
| `IDLE_LOG_FILE`          | Electron user-data log | Optional log file path.                                                |

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

### Activity actions

`IDLE_ACTION` controls what Mac Idle Keeper does after the idle threshold is exceeded:

- `hid-event`: moves the physical mouse and posts mouse events through CoreGraphics;
- `caffeinate`: requests a short macOS user-activity assertion without moving the pointer;
- `none`: records the detection without executing an activity action.

The action system is intentionally application-independent. To add a new action, implement it in the `src/actions` component, register it in `createAction`, document its configuration value, and add tests under `tests/actions`.

## Running in the foreground

With the global CLI:

```bash
mac-idle-keeper start
```

With a source checkout:

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

With the global CLI, install and manage the per-user macOS LaunchAgent with:

```bash
mac-idle-keeper launch-agent install
mac-idle-keeper launch-agent status
mac-idle-keeper launch-agent logs --follow
```

The CLI also supports `stop`, `pause`, `resume`, `restart`, and `uninstall` after `launch-agent`.

Install the per-user macOS LaunchAgent:

```bash
pnpm run launch-agent:install
```

The LaunchAgent starts at login, keeps the monitor alive, and uses the `.env` file from the configuration directory where the install command was run. It is scoped to the current user session; it does not run before login.

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

The previous effective configuration is persisted at:

```text
~/Library/Application Support/mac-idle-keeper/config-history.json
```

## Logs and notifications

By default, the application log is written to:

```text
~/Library/Application Support/mac-idle-keeper/mac-idle-keeper.log
```

LaunchAgent process output is written to:

```text
~/Library/Logs/mac-idle-keeper/launch-agent.stdout.log
~/Library/Logs/mac-idle-keeper/launch-agent.stderr.log
```

The log command reads the application log. By default it prints the last 50 lines:

```bash
mac-idle-keeper logs
pnpm run launch-agent:logs
```

Use `--follow` (or `-f`) to keep the command open, and `--lines` (or `-n`) to change the number of initial lines:

```bash
mac-idle-keeper logs --follow
pnpm run launch-agent:logs -- --follow
pnpm run launch-agent:logs -- --lines 100
```

Application log entries are stored with UTC timestamps (`Z`) so the file remains unambiguous across machines and timezone changes. The Electron console, `launch-agent:logs`, and `launch-agent:status` convert those timestamps to the effective `IDLE_TIMEZONE` (or `America/Monterrey` by default) and show the timezone beside each displayed timestamp. Direct tools such as `tail` show the stored UTC representation.

The monitor shows a macOS notification when it starts and when it stops. When running directly with `pnpm start`, notifications are sent through `osascript`; macOS may require notification permission for Terminal or the shell application.

## Development quality gates

The project is written in TypeScript and compiled to `dist/` before it is run or packed for npm. The local quality gate is:

```bash
pnpm run check
```

It runs ESLint, Prettier validation, Jest with the 90% coverage threshold, and the TypeScript build. Husky runs this same gate before commits and pushes. Pull requests run it through GitHub Actions.

Source modules and functions use `camelCase` folders with `index.ts` entrypoints and colocated `types.d.ts` files. Classes use `PascalCase` for both the class and its folder. Tests mirror that structure under `/tests`.

## macOS permissions

The default `hid-event` action uses a small native CoreGraphics helper to move the cursor physically and post mouse events. If the cursor does not move or the idle counter does not reset, add the Electron app used by the project to:

- **System Settings → Privacy & Security → Accessibility**
- **System Settings → Privacy & Security → Input Monitoring**, if requested by macOS

For a source installation, the Electron app is typically located at:

```text
node_modules/.pnpm/electron@<version>/node_modules/electron/dist/Electron.app
```

For a global npm installation, use the package location reported by `npm root --global` and append `/mac-idle-keeper/node_modules/electron/dist/Electron.app`.

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
tail -f "$HOME/Library/Logs/mac-idle-keeper/launch-agent.stderr.log"
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

The test suite uses Jest with TypeScript and covers scheduling, day groups, monitor thresholds, runtime state, notifications, and the awake guard. `pnpm run check` also enforces ESLint, Prettier, the 90% coverage threshold, and the TypeScript build.

## Contributing

Contributions are welcome in code, tests, documentation, maintenance, issue triage, and financial support. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, maintainability guidelines, pull request expectations, and sponsorship information.

## Extended documentation

See the [documentation index](docs/README.md) for installation details, CLI usage, testing, packaging, GitHub Actions, releases, architecture, and extension guidance.

## Project layout

```text
bin/macIdleKeeper/     Global npm CLI entrypoint
src/                   TypeScript runtime components
  actions/             Activity actions and native helper lifecycle
  awake/               caffeinate awake guard
  config/              Environment configuration and validation
  main/                Electron process entrypoint
  monitor/             Idle polling and schedule coordination
  notifications/       macOS notifications
  runtimeState/        Effective runtime state persistence
  schedule/             Timezone-aware schedule evaluation
  time/                 UTC storage and timezone-aware display formatting
scripts/               TypeScript LaunchAgent/log commands
  idle-reset.m         CoreGraphics physical mouse helper
tests/                 Jest tests mirroring source components
dist/                  Generated TypeScript output; not committed
```

## Versioning

This project follows Semantic Versioning. Release notes are maintained in [CHANGELOG.md](CHANGELOG.md).

Before publishing a release, inspect the npm package contents with:

```bash
pnpm pack --dry-run
```

Publishing is restricted to project maintainers:

```bash
npm publish
```

## License

This project is licensed under the [MIT License](LICENSE).
