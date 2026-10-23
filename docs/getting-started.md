# Getting started

Brewly is a macOS-only Electron monitor. It reads system idle time, evaluates a timezone-aware schedule, and executes a configurable activity action when the idle threshold is exceeded.

It is intended for user-authorized workstation continuity, such as long-running builds and test suites, media rendering, backups, data exports, local processing, or remote sessions where system sleep would interrupt an active task.

## Requirements

- macOS with an active user session;
- Node.js 22.13 or newer;
- npm for global installation, or pnpm 11.18.0 for repository development;
- Accessibility permission for the Electron app used by the monitor;
- notification permission if start/stop notifications should be shown.

## Install from npm

```bash
npm install --global brewly
brewly help
brewly --version
```

When npm has a newer Brewly release, the CLI shows a non-blocking notice with the exact update command:

```text
Run: npm install --global brewly@latest
```

After seven days of interactive CLI use, Brewly may display a compact `Brewly · Your Voice Matters` reminder. A second reminder may appear 15 days after the first, followed by 30-day intervals. Reminders are limited to three per 24-hour window, separated by at least four hours. They are never emitted by the background LaunchAgent, CI, help, version, or feedback commands. Its state is stored at `~/Library/Application Support/brewly/feedback-state.json`.

To display the complete feedback guide at any time, run:

```bash
brewly feedback
```

The command offers interactive destinations for bug reports, feature ideas, questions, community discussions, GitHub stars, and sponsorship. Use `brewly feedback --no-open` to print the selected URL without opening the browser. Use `brewly feedback reminders` to inspect or manage reminder preferences. Running `brewly feedback` voluntarily starts the next automatic reminder cycle 30 days later.

The package includes Electron as a runtime dependency and exposes the `brewly` executable.

If the package manager did not download Electron's macOS runtime during installation, Brewly downloads it the first time a monitor-dependent command runs, such as `brewly start` or `brewly agent install`. Brewly prints why the download is needed. Read-only commands such as `brewly help`, `brewly agent status`, and `brewly power status` do not load Electron.

## Install from source

```bash
git clone git@raymundo.github.com:raymundo-salazar/brewly.git
cd brewly
pnpm install
pnpm run check
pnpm run build
```

## Configure

For normal global usage, install the background agent through the CLI. Omitting options uses the documented defaults:

```bash
brewly agent install
```

Provide explicit options for a custom configuration:

```bash
brewly agent install \
  --idle-days working_days \
  --idle-start-time 07:00 \
  --idle-end-time 17:30 \
  --idle-threshold-seconds 540 \
  --idle-timezone America/Monterrey
```

The effective configuration is stored in `~/Library/Application Support/brewly/agent-config.json` and is used by the LaunchAgent, `agent status`, `power`, and `logs` commands.

### Development and contribution configuration

`.env` is intended for repository development, contribution work, foreground experiments, and controlled tests. Create it only when working from a source checkout:

```bash
cp .env.example .env
```

The foreground monitor reads `.env` from the current working directory at startup. Shell variables take precedence over `.env`. Use `IDLE_ENV_FILE` or the CLI's `--env-file` option to use a different path:

```bash
brewly start --env-file ./config/.env
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

Global installations do not read a local `.env` file implicitly. After changing a source-checkout `.env`, use the local install or restart script to regenerate the snapshot. For a global installation, pass the desired options again to `brewly agent restart`.

Keep the active window limited to the time required by the task. On portable Macs, prefer using it while connected to power and consider the energy impact of preventing idle sleep.

## Run in the foreground

Global CLI:

```bash
brewly start
```

Source checkout:

```bash
pnpm start
```

The monitor performs an immediate check and then continues at `IDLE_CHECK_INTERVAL_MS`. Stop it with `Ctrl+C`.

When the monitor process is running, Brewly also places a status indicator in the macOS status bar. It uses transparent @1x and @2x PNG assets: gray during startup, blue while the active schedule is running, orange outside the schedule, gray when stopped, and red if a monitor check fails. macOS selects the appropriate representation for standard and Retina displays. The indicator's menu is localized from the macOS language and provides pause, resume, start, and stop actions with compact native play, pause, and stop icons. macOS automatically renders those menu icons black in light appearance and white in dark appearance. If an icon cannot be loaded, a visible Unicode fallback is used.

## Run in the background

Install and manage the per-user LaunchAgent through the global CLI:

```bash
brewly agent install
brewly agent status
brewly agent logs --follow
brewly agent --help
```

Available actions are `install`, `status`, `logs`, `start`, `stop`, `pause`, `resume`, `restart`, and `uninstall`.

CLI responses use consistent human-readable sections, labeled values, semantic colors when supported by the terminal, and actionable messages. `agent status` provides the most complete state summary; `logs` provides the event stream.

After uninstall, when neither the plist nor runtime state exists, status reports `NOT CONFIGURED` instead of presenting the local `.env` schedule as active.

The source checkout exposes equivalent pnpm scripts such as `pnpm run agent:install`, `pnpm run agent:start`, and `pnpm run agent:status`.

The lifecycle commands are intentionally distinct: `stop` stops the current process while keeping the plist installed, and `start` loads it again from the beginning. `pause` disables the service while preserving its installed configuration, and `resume` enables and loads that paused service. `restart` refreshes the plist and starts the service.

`uninstall` always stops the service and removes the plist. It then asks whether to retain configuration, runtime state, and logs. Answer `y` to keep them or press Enter to remove them. Use `--yes` or `-y` to remove the plist and managed application data without prompting:

```bash
brewly agent uninstall --yes
```

The uninstall operation preserves user-owned `.env` files and custom log paths outside Brewly's managed directories. If a managed power schedule state exists, it removes the plist but retains application data until `brewly power disable` is run and the uninstall is repeated.

The source project runs from compiled output. `pnpm start` builds TypeScript and then starts Electron; the global CLI uses the published `dist/` files.

## Migrate an earlier installation

The migration command supports both legacy agents installed globally with npm and agents created from a local source checkout:

```bash
brewly migrate --dry-run
brewly migrate
```

From the repository, use `pnpm migrate -- --dry-run` to preview or `pnpm migrate` to apply the migration. Brewly reads the legacy configuration snapshot, recreates the current LaunchAgent with the same effective settings, verifies the new service, and removes the old plist. Legacy configuration and logs remain available for rollback and are not removed automatically.

The LaunchAgent is scoped to the logged-in user session. It starts at login, but it does not run before login and it cannot prevent a full hibernation or power loss.

## Schedule wake or power-on

The optional `power` namespace schedules a repeating macOS `wakeorpoweron` event using the monitor's active days and start time. It defaults to five minutes before the monitor starts and reads `POWER_ON_OFFSET_MINUTES` when provided.

Power scheduling depends on the per-user LaunchAgent. Install the agent first:

```bash
brewly agent install
```

Without the LaunchAgent plist, a real `power enable` is rejected. `power status` and `power enable --dry-run` can still be used to inspect and preview the configuration, while `power disable` remains available to clean up an existing schedule.

Preview the operation first:

```bash
brewly power enable --dry-run
```

Then inspect or apply it:

```bash
brewly power status
sudo brewly power enable
sudo brewly power disable
```

`power status` reports `NOT CONFIGURED` when no Brewly state or repeating macOS power event exists. A `CONFIGURED (EXTERNAL)` result means macOS has a repeating event that was not created by Brewly.

The real enable and disable commands require administrator authorization. The CLI does not invoke `sudo` internally; if authorization is missing, it reports the exact command to rerun with `sudo`. The command does not require FileVault to be disabled and never changes FileVault or automatic-login settings. However, the Mac must have a usable user session before the per-user LaunchAgent can run. With automatic login disabled, the Mac can wake or power on and then wait at the login screen for manual authentication. FileVault commonly prevents automatic login; keeping it enabled is recommended for sensitive or portable devices.

Automatic login reduces physical access protection because the selected account becomes available after startup. If you choose to enable it, consider the device's physical security and data sensitivity, avoid it on shared computers, keep screen locking enabled, and verify the result with `power status`. Use `--dry-run` before every schedule change.

The command refuses to replace an unrecognized repeating power schedule unless `--force` is supplied. Review the existing schedule first because macOS provides one repeating power-event set, and cancellation may affect other repeating events.

Uninstalling the LaunchAgent does not automatically remove a power schedule. Disable the power schedule before uninstalling the agent, or review it afterward and clean it up intentionally.

## Permissions

For the default physical activity action, grant the Electron app used by the installation access in:

- System Settings → Privacy & Security → Accessibility;
- System Settings → Privacy & Security → Input Monitoring, if macOS requests it.

The native helper is compiled on the first `hid-event` execution with macOS `clang` and stored in the system temporary directory.

## Logs and state

Application logs are stored by default at:

```text
~/Library/Application Support/brewly/brewly.log
```

LaunchAgent stdout and stderr logs are stored at:

```text
~/Library/Logs/brewly/
```

The application log stores timestamps in UTC. CLI display commands convert them to the effective `IDLE_TIMEZONE` and show the timezone beside each displayed timestamp.

Runtime state and the previous effective configuration are stored at:

```text
~/Library/Application Support/brewly/runtime-state.json
~/Library/Application Support/brewly/config-history.json
```

The installed agent snapshot is stored at:

```text
~/Library/Application Support/brewly/agent-config.json
```
