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
                                      ├── loads .env and effective config
                                      ├── evaluates the schedule
                                      ├── starts/stops the awake guard
                                      ├── reads powerMonitor idle time
                                      ├── executes the configured activity action
                                      └── writes runtime state and logs
```

## Important modules

- `bin/macIdleKeeper`: global npm CLI entrypoint. It does not implement monitoring; it delegates foreground work to Electron and management work to scripts.
- `src/main`: Electron process bootstrap, environment loading, runtime state, notifications, monitor, and shutdown handling.
- `src/config`: parses environment variables into effective runtime configuration.
- `src/schedule`: evaluates the schedule using the configured IANA timezone.
- `src/monitor`: coordinates schedule checks, idle readings, threshold decisions, and actions.
- `src/actions`: activity action implementations and action registration.
- `src/awake`: manages the `caffeinate -dimsu` process during active schedule windows.
- `src/logger`: stores UTC timestamps and displays converted timestamps in the configured timezone.
- `src/time`: UTC log-line parsing and timezone-aware display formatting.
- `src/configHistory`: compares effective configuration snapshots across starts and records changes.
- `src/runtimeState`: stores the live process configuration and last check for status inspection.
- `scripts/installLaunchAgent`: generates and loads the per-user LaunchAgent plist.
- `scripts/manageLaunchAgent`: status, stop, pause, resume, restart, and uninstall operations.
- `scripts/viewLogs`: log tail and follow behavior with timezone-aware display.

Every module or function component has a `camelCase` folder, an `index.ts` public entrypoint, and a `types.d.ts` file for its type declarations. A class uses `PascalCase` for both its class name and folder. Tests mirror this layout under `/tests`. Keep components focused and expose only the API required by their consumers.

## Configuration lifecycle

1. The CLI or LaunchAgent starts the compiled Electron application with a working directory that identifies the configuration directory.
2. `src/main` loads `IDLE_ENV_FILE` when set, otherwise `<working-directory>/.env`.
3. Shell variables take precedence over `.env` entries.
4. `loadConfig` parses values and applies defaults.
5. The effective configuration is written to runtime state and compared with `config-history.json`.
6. The monitor uses that immutable configuration until the process restarts.

Changing `.env` does not mutate a running process. Restart the foreground process or LaunchAgent after configuration changes.

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

The LaunchAgent executes the Electron binary from the installed package and passes the compiled `dist/src/main/index.js` process entrypoint explicitly. Its working directory is the directory used when installation was requested, which allows global installations to use a user-owned `.env` outside the npm package. The package's Node.js `main` entrypoint remains `dist/src/index/index.js` for library consumers.

The LaunchAgent is scoped to the current GUI user domain. It starts at login, uses `KeepAlive`, and cannot run before login or prevent full hibernation/power loss.
