# Getting started

Mac Idle Keeper is a macOS-only Electron monitor. It reads system idle time, evaluates a timezone-aware schedule, and executes a configurable activity action when the idle threshold is exceeded.

It is intended for user-authorized workstation continuity, such as long-running builds and test suites, media rendering, backups, data exports, local processing, or remote sessions where system sleep would interrupt an active task.

## Requirements

- macOS with an active user session;
- Node.js 22.12 or newer;
- npm for global installation, or pnpm 11.18.0 for repository development;
- Accessibility permission for the Electron app used by the monitor;
- notification permission if start/stop notifications should be shown.

## Install from npm

```bash
npm install --global mac-idle-keeper
mac-idle-keeper help
```

The package includes Electron as a runtime dependency and exposes the `mac-idle-keeper` executable.

## Install from source

```bash
git clone git@github.com:raymundo-salazar/mac-idle-keeper.git
cd mac-idle-keeper
pnpm install
pnpm run check
pnpm run build
```

## Configure

Create a configuration file in the directory from which the monitor will run:

```bash
cp .env.example .env
```

The monitor reads `.env` from the current working directory at startup. Shell variables take precedence over `.env`. Use `IDLE_ENV_FILE` or the CLI's `--env-file` option to use a different path:

```bash
mac-idle-keeper start --env-file ./config/.env
```

The default behavior is:

- poll every 5 minutes;
- act only after more than 9 minutes of system idle time;
- run Monday, Wednesday, Thursday, and Friday;
- monitor from 07:00 inclusive through 17:00 exclusive;
- use `America/Monterrey` as the timezone;
- use the physical `hid-event` mouse action;
- keep the Mac awake with `caffeinate -dimsu` inside the active schedule.

Configuration changes require a process restart. The effective change is recorded in the application log.

Keep the active window limited to the time required by the task. On portable Macs, prefer using it while connected to power and consider the energy impact of preventing idle sleep.

## Run in the foreground

Global CLI:

```bash
mac-idle-keeper start
```

Source checkout:

```bash
pnpm start
```

The monitor performs an immediate check and then continues at `IDLE_CHECK_INTERVAL_MS`. Stop it with `Ctrl+C`.

## Run in the background

Install and manage the per-user LaunchAgent through the global CLI:

```bash
mac-idle-keeper launch-agent install
mac-idle-keeper launch-agent status
mac-idle-keeper launch-agent logs --follow
mac-idle-keeper launch-agent --help
```

Available actions are `install`, `status`, `logs`, `start`, `stop`, `pause`, `resume`, `restart`, and `uninstall`.

CLI responses use consistent human-readable sections, labeled values, semantic colors when supported by the terminal, and actionable messages. `launch-agent status` provides the most complete state summary; `logs` provides the event stream.

The source checkout exposes equivalent pnpm scripts such as `pnpm run launch-agent:install`, `pnpm run launch-agent:start`, and `pnpm run launch-agent:status`.

The lifecycle commands are intentionally distinct: `stop` stops the current process while keeping the plist installed, and `start` loads it again from the beginning. `pause` disables the service while preserving its installed configuration, and `resume` enables and loads that paused service. `restart` refreshes the plist and starts the service; `uninstall` removes the plist.

The source project runs from compiled output. `pnpm start` builds TypeScript and then starts Electron; the global CLI uses the published `dist/` files.

The LaunchAgent is scoped to the logged-in user session. It starts at login, but it does not run before login and it cannot prevent a full hibernation or power loss.

## Permissions

For the default physical activity action, grant the Electron app used by the installation access in:

- System Settings → Privacy & Security → Accessibility;
- System Settings → Privacy & Security → Input Monitoring, if macOS requests it.

The native helper is compiled on the first `hid-event` execution with macOS `clang` and stored in the system temporary directory.

## Logs and state

Application logs are stored by default at:

```text
~/Library/Application Support/mac-idle-keeper/mac-idle-keeper.log
```

LaunchAgent stdout and stderr logs are stored at:

```text
~/Library/Logs/mac-idle-keeper/
```

The application log stores timestamps in UTC. CLI display commands convert them to the effective `IDLE_TIMEZONE` and show the timezone beside each displayed timestamp.

Runtime state and the previous effective configuration are stored at:

```text
~/Library/Application Support/mac-idle-keeper/runtime-state.json
~/Library/Application Support/mac-idle-keeper/config-history.json
```
