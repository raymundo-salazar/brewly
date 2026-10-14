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
- A macOS status bar indicator using transparent @1x and @2x PNG assets for startup, active schedule, outside-schedule, paused, stopped, and error states.
- Localized English or Spanish tray controls with native play, pause, and stop menu icons.
- Foreground mode for testing and a per-user LaunchAgent for background operation.
- Optional macOS wake or power-on scheduling aligned with the monitor's active window.
- Colorized, human-readable output across the CLI commands, including LaunchAgent status and the last five activity actions.
- Log inspection from the LaunchAgent command namespace, including real-time follow mode.
- CLI defaults and explicit configuration options, with `.env` support for development and contribution workflows.
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

For normal global usage, configure the background agent through the CLI. With no options, the documented defaults are used:

```bash
mac-idle-keeper agent install
```

Pass explicit options when you need a custom schedule or runtime behavior:

```bash
mac-idle-keeper agent install \
  --idle-days working_days \
  --idle-start-time 07:00 \
  --idle-end-time 17:30 \
  --idle-threshold-seconds 540 \
  --idle-timezone America/Monterrey
```

The effective configuration is stored in `~/Library/Application Support/mac-idle-keeper/agent-config.json`; the LaunchAgent, `agent status`, `power`, and `logs` commands use that snapshot.

`.env` is intended for contribution, development, foreground experiments, and the controlled test profile. It is not read implicitly by the globally installed background agent. Source-checkout scripts may use it during local installation or restart; `--env-file` is an explicit local/source override.

Global background installation accepts the following configuration options:

```bash
mac-idle-keeper agent install \
  --idle-check-interval-ms 300000 \
  --idle-threshold-seconds 540 \
  --idle-days working_days \
  --idle-start-time 07:00 \
  --idle-end-time 17:00 \
  --idle-timezone America/Monterrey \
  --idle-action hid-event \
  --power-on-offset-minutes 5
```

The supported options are `--env-file`, `--idle-check-interval-ms`, `--idle-threshold-seconds`, `--idle-days`, `--idle-start-time`, `--idle-end-time`, `--idle-start-hour`, `--idle-end-hour`, `--idle-timezone`, `--idle-action`, `--idle-log-file`, and `--power-on-offset-minutes`. Omitting an option uses the corresponding documented default.

After changing a global configuration, pass the desired options again to `mac-idle-keeper agent restart`. Starting, stopping, pausing, or resuming the existing agent does not change its persisted configuration.

At startup, the effective configuration is compared with the previous one and changes are recorded in the application log. This includes the polling interval, idle threshold, days, start/end times, timezone, action, and log path.

### Default behavior

When no explicit CLI options or development environment overrides are provided, the project uses:

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

| Variable                  |                Default | Description                                                               |
| ------------------------- | ---------------------: | ------------------------------------------------------------------------- |
| `IDLE_CHECK_INTERVAL_MS`  |               `300000` | Polling interval in milliseconds; `300000` is 5 minutes.                  |
| `IDLE_THRESHOLD_SECONDS`  |                  `540` | Run the activity action only when idle time is greater than 9 minutes.    |
| `IDLE_DAYS`               |      `mon,wed,thu,fri` | Active days. Supports aliases, names, or numbers.                         |
| `IDLE_START_TIME`         |                `07:00` | Schedule start, inclusive, in `HH:MM`.                                    |
| `IDLE_END_TIME`           |                `17:00` | Schedule end, exclusive, in `HH:MM`.                                      |
| `IDLE_TIMEZONE`           |    `America/Monterrey` | IANA timezone used for schedule evaluation.                               |
| `IDLE_ACTION`             |            `hid-event` | `hid-event`, `caffeinate`, or `none`.                                     |
| `POWER_ON_OFFSET_MINUTES` |                    `5` | Minutes before `IDLE_START_TIME` for the optional `power enable` command. |
| `IDLE_LOG_FILE`           | Electron user-data log | Optional log file path.                                                   |

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
- `hid-event-static`: posts a mouse event at the current pointer position for diagnostics and compatibility;
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
mac-idle-keeper launch-agent --help
```

The shorter `agent` namespace is an equivalent alias:

```bash
mac-idle-keeper agent status
mac-idle-keeper agent start
```

The CLI also supports `start`, `stop`, `pause`, `resume`, `restart`, and `uninstall` after `launch-agent` or `agent`.

All CLI commands use a consistent human-readable response format. Each response includes a descriptive header, labeled details, semantic status colors when the terminal supports them, and actionable success or error messages. Use `status` for the most complete runtime view and `logs` when you need the application event stream.

Install the per-user macOS LaunchAgent:

```bash
pnpm run launch-agent:install
```

The LaunchAgent starts at login, relaunches the monitor after an unexpected failure, and uses the persisted configuration snapshot created by install or restart. A normal stop from the tray does not relaunch it. It is scoped to the current user session; it does not run before login.

### LaunchAgent commands

```bash
pnpm run launch-agent:status      # Show runtime status and recent activity
pnpm run launch-agent:help        # Show LaunchAgent command help
pnpm run launch-agent:logs        # Show the last 50 application log lines
pnpm run launch-agent:logs -- --follow  # Follow the application log in real time
pnpm run launch-agent:start      # Start a stopped service
pnpm run launch-agent:stop       # Stop the process; keep the plist installed
pnpm run launch-agent:pause      # Pause and disable automatic relaunch
pnpm run launch-agent:resume     # Resume a paused service
pnpm run launch-agent:restart    # Refresh the plist and restart the service
pnpm run launch-agent:uninstall  # Stop the service and prompt about managed data
pnpm run launch-agent:uninstall -- --yes  # Remove the plist and managed data
```

Source-checkout install and restart commands accept the same configuration options after `--`; these local commands may also load `.env`:

```bash
pnpm run agent:install -- --idle-days working_days --idle-start-time 07:00
pnpm run agent:restart -- --idle-end-time 17:30
```

The lifecycle commands have intentionally different meanings:

- `stop` stops the current process but keeps the LaunchAgent installed. Use `start` to start it again.
- `pause` disables the service without removing the plist or its current configuration. Use `resume` to continue it.
- `restart` reloads the plist and starts the service, applying the current configuration.
- `uninstall` always stops the service and removes the plist. It asks whether configuration, runtime state, and logs should be kept. Answer `y` to retain them or press Enter to remove them.
- `uninstall --yes` / `uninstall -y` removes the plist and managed application data without prompting. The user's `.env` files and custom log paths outside Mac Idle Keeper's managed directories are never removed.
- If a managed power schedule still exists, complete data removal pauses after removing the plist and asks you to run `mac-idle-keeper power disable` before repeating the uninstall.

### Scheduled power-on

Mac Idle Keeper can request a repeating macOS `wakeorpoweron` event using the monitor's configured start time and active days. The default lead time is five minutes and can be changed with `POWER_ON_OFFSET_MINUTES`.

The power schedule is intentionally tied to the monitor's per-user LaunchAgent. Install the agent before enabling a real power schedule:

```bash
mac-idle-keeper agent install
```

If the LaunchAgent plist does not exist, `power enable` refuses to create the schedule. `power status` and `power enable --dry-run` remain available for inspection and planning, and `power disable` remains available for cleanup.

Preview the exact schedule without changing macOS:

```bash
mac-idle-keeper power enable --dry-run
```

Inspect or manage the schedule:

```bash
mac-idle-keeper power status
sudo mac-idle-keeper power enable
sudo mac-idle-keeper power disable
```

The real `power enable` and `power disable` mutations require administrator authorization. The CLI never invokes `sudo` internally; when authorization is missing it prints the exact `sudo mac-idle-keeper power <action>` command to run. The power command does not modify FileVault, automatic login, login security, or system permissions. It only asks macOS to schedule the power event.

The power schedule can turn on or wake the Mac, but the LaunchAgent runs only after a user session is available. If automatic login is disabled, macOS may stop at the login screen and require manual authentication before the monitor starts. FileVault commonly prevents automatic login; keeping FileVault enabled is recommended for devices that contain sensitive data.

Enabling automatic login reduces physical access protection because the configured account becomes available after startup. Consider the device's location and data sensitivity before enabling it, avoid automatic login on shared or portable computers, keep screen locking enabled, and use `--dry-run` and `power status` before applying changes.

Mac Idle Keeper refuses to replace an unrecognized repeating power schedule unless `--force` is supplied. Use `--force` only after reviewing the existing schedule; macOS exposes one repeating power-event set, and disabling it can cancel other repeating power events as well.

Uninstalling the LaunchAgent does not automatically remove a power schedule. Run `sudo mac-idle-keeper power disable` before uninstalling the agent, or review `power status` afterward and remove the schedule intentionally.

After changing local `.env` values, restart the LaunchAgent so the running process loads the new values:

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

When neither the LaunchAgent plist nor runtime state exists, `launch-agent:status` reports `Configuration: NOT CONFIGURED`, `Runtime schedule: NOT CONFIGURED`, and `Log: NOT CONFIGURED`. Values still present in a local `.env` are not treated as an active agent configuration.

The monitor writes its effective startup configuration to:

```text
~/Library/Application Support/mac-idle-keeper/runtime-state.json
```

This lets `launch-agent:status` report the configuration actually loaded by the process instead of rereading a newer `.env` file that has not been applied yet.

The previous effective configuration is persisted at:

```text
~/Library/Application Support/mac-idle-keeper/config-history.json
```

The background agent configuration snapshot is persisted at:

```text
~/Library/Application Support/mac-idle-keeper/agent-config.json
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

For a source-checkout development or contribution workflow, the monitor loads `.env` only at startup. Restart it:

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
  configHistory/       Effective configuration change history
  i18n/                Localized tray dictionaries and locale fallback
  main/                Electron process entrypoint
  monitor/             Idle polling and schedule coordination
  notifications/       macOS notifications
  runtimeState/        Effective runtime state persistence
  schedule/             Timezone-aware schedule evaluation
  time/                 UTC storage and timezone-aware display formatting
  tray/                macOS status bar indicator implementation
assets/
  tray/                transparent @1x and @2x PNG status icons
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
