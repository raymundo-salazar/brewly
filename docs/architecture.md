# Architecture

## Runtime model

The project is a TypeScript Electron application with a thin Node.js CLI wrapper. TypeScript source is compiled into `dist/` for local execution and npm packaging:

```text
mac-idle-keeper CLI
        │
        ├── foreground: spawns Electron with the compiled main entrypoint
        └── LaunchAgent commands: manage Node.js helper scripts
                                │
                                └── Electron main process
                                      ├── loads foreground or persisted effective config
                                      ├── evaluates the schedule
                                      ├── starts/stops the awake guard
                                      ├── reads powerMonitor idle time
                                      ├── executes the configured activity action
                                      └── writes runtime state and logs
```

## Important modules

- `bin/macIdleKeeper`: global npm CLI entrypoint. It does not implement monitoring; it delegates foreground work to Electron and management work to scripts.
- `src/main`: Electron process bootstrap, environment loading, runtime state, notifications, monitor, shutdown handling, and the explicit `~/Library/Application Support/mac-idle-keeper/` user-data path shared by foreground and LaunchAgent processes.
- `src/config`: parses environment variables into effective runtime configuration.
- `src/configArguments`: maps user-facing CLI configuration options to the environment keys consumed by `src/config`.
- `src/schedule`: evaluates the schedule using the configured IANA timezone.
- `src/monitor`: coordinates schedule checks, idle readings, threshold decisions, and actions.
- `src/actions`: activity action implementations and action registration.
- `src/awake`: manages the `caffeinate -dimsu` process during active schedule windows.
- `src/logger`: stores UTC timestamps and displays converted timestamps in the configured timezone.
- `src/time`: UTC log-line parsing and timezone-aware display formatting.
- `src/configHistory`: compares effective configuration snapshots across starts and records changes.
- `src/runtimeState`: stores the live process configuration and last check for status inspection.
- `src/tray`: owns the colored macOS status bar indicator and its lifecycle menu.
- `scripts/installLaunchAgent`: generates and loads the per-user LaunchAgent plist.
- `scripts/manageLaunchAgent`: status, start, stop, pause, resume, restart, and uninstall operations.
- `scripts/viewLogs`: log tail and follow behavior with timezone-aware display.
- `scripts/managePower`: read-only status and protected `pmset` wake-or-power-on schedule operations.

Every module or function component has a `camelCase` folder, an `index.ts` public entrypoint, and a `types.d.ts` file for its type declarations. A class uses `PascalCase` for both its class name and folder. Tests mirror this layout under `/tests`. Keep components focused and expose only the API required by their consumers.

## Configuration lifecycle

1. The recommended global background flow uses CLI options and `DEFAULTS`; `.env` is reserved for foreground, development, contribution, and controlled test workflows.
2. A foreground start loads `IDLE_ENV_FILE` when set, otherwise `<working-directory>/.env`.
3. A global `agent install` or `agent restart` parses explicit CLI configuration options and otherwise uses `DEFAULTS`; it does not inspect `.env` implicitly.
4. A local/source install may opt into `.env`, and any explicit `--env-file` takes precedence over the default local path.
5. The effective background configuration and power offset are written to `agent-config.json` under the application-support directory.
6. The generated plist sets `IDLE_CONFIG_FILE` so the LaunchAgent process reads the snapshot instead of `.env`.
7. `agent status`, `power`, and `logs` read the same snapshot; they never treat a newer `.env` as active background configuration.
8. The effective configuration is written to runtime state and compared with `config-history.json`.
9. The monitor uses that immutable configuration until the process restarts.

Changing `.env` in a local development workflow does not mutate a running process or an installed agent. Restart the foreground process or local LaunchAgent after configuration changes. Global installations must be updated with explicit CLI options. Uninstall removes `agent-config.json` with the managed application data.

## Time and logging

Application log files store timestamps in UTC ISO format with `Z`. Console output and CLI viewers convert the stored instant to the effective `IDLE_TIMEZONE`. This keeps persisted records unambiguous while keeping interactive output useful to the operator.

Runtime state timestamps are also persisted as UTC ISO strings and localized by human-readable status output.

## Adding an activity action

To add an action:

1. Implement a function in `src/actions/index.ts` and keep its public types in `src/actions/types.d.ts`.
2. Register it in `createAction`.
3. Update the supported-value error message and README configuration table.
4. Add deterministic Jest tests under `tests/actions` that stub external processes where possible.
5. Document required macOS permissions and verify behavior manually on macOS.
6. Run `pnpm run check` before opening a pull request.

Actions should remain independent of a specific application. They should express an operating-system activity or assertion that supports an authorized workstation task.

## LaunchAgent behavior

The LaunchAgent executes the Electron binary from the installed package and passes the compiled `dist/src/main/index.js` process entrypoint explicitly. Its working directory is the directory used when installation was requested, but the installed process reads `agent-config.json`, not a changing `.env` file. The package's Node.js `main` entrypoint remains `dist/src/index/index.js` for library consumers.

The LaunchAgent is scoped to the current GUI user domain. It starts at login, uses `KeepAlive`, and cannot run before login or prevent full hibernation/power loss.

LaunchAgent lifecycle semantics are explicit:

- `start` enables and loads an installed service after `stop`.
- `stop` unloads the current process but preserves the plist and installed configuration.
- `pause` unloads the service and disables automatic relaunch while preserving the plist.
- `resume` re-enables and loads a paused service.
- `restart` regenerates the plist, applies the current configuration, and starts the service.
- `uninstall` stops the service and removes the plist, then prompts whether the managed application support and LaunchAgent log directories should be retained. `--yes`/`-y` selects complete removal without prompting. User-owned `.env` files and custom log paths outside the managed directories are preserved. A managed power schedule state blocks application-data deletion until the power schedule is explicitly disabled.

LaunchAgent status treats the plist or runtime state as the source of an active configuration. If both are absent, it reports `Configuration: NOT CONFIGURED`, `Runtime schedule: NOT CONFIGURED`, and `Log: NOT CONFIGURED`; a local `.env` is not displayed as an active agent configuration.

## Status bar indicator

When the Electron monitor starts, it creates a small circular status bar item. The indicator is gray while startup is in progress, green while the effective schedule is active, yellow outside the schedule, and red when a monitor check fails. Its context menu shows the current state and provides a quit action. The indicator is created by the Electron monitor process, so it appears when an installed LaunchAgent actually starts rather than when the plist is merely written.

## Power schedule behavior

The `power` CLI namespace derives a repeating `pmset wakeorpoweron` event from the effective monitor schedule. `POWER_ON_OFFSET_MINUTES` controls how many minutes before `IDLE_START_TIME` the event is scheduled; its default is five minutes. If the offset crosses midnight, the scheduled weekday is shifted to the previous day.

`power enable` requires the per-user LaunchAgent plist to exist first, because the wake event is intended to start the monitor's background agent. The command reads `pmset -g sched` before mutation, supports `--dry-run`, and refuses to replace an unrecognized repeating event unless `--force` is explicit. `power status`, `power enable --dry-run`, and `power disable` remain available for inspection, planning, and cleanup when the agent is not installed. It stores its own UTC application timestamp and schedule metadata under the macOS application support directory. It does not modify FileVault, automatic login, or other security settings.

The real `power enable` and `power disable` operations require administrator authorization for `pmset`. The CLI reports a human-readable `sudo` instruction and never invokes `sudo` internally. Uninstalling the LaunchAgent does not automatically cancel a power schedule, so callers should disable the schedule explicitly when removing the agent.

Power status distinguishes a managed schedule (`CONFIGURED`), an unrecognized existing macOS event (`CONFIGURED (EXTERNAL)`), and the absence of any power schedule (`NOT CONFIGURED`). The monitor schedule shown alongside `NOT CONFIGURED` is only the current proposal from the effective configuration; it is not an active power event.

`pmset` uses the macOS system timezone. The command reports both the configured monitor timezone and the macOS timezone so a mismatch is visible before applying a schedule. The per-user LaunchAgent still requires a logged-in user session; powering on the Mac does not bypass the login screen.
