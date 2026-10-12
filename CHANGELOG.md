# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- Added TypeScript compilation with generated declarations and source maps for npm packaging.
- Added Jest tests with Istanbul coverage reports and a minimum 90% threshold for statements, branches, functions, and lines.
- Added ESLint, Prettier, and Husky quality gates for local commits and pushes.
- Added TypeScript source and test structure with PascalCase component folders, colocated type declarations, and mirrored Jest suites.
- Added dedicated `launch-agent --help` and `launch-agent:help` command references.
- Added `launch-agent:start` and its equivalent pnpm script for starting a stopped service.
- Added the short `agent` namespace as a compatibility alias for LaunchAgent management.
- Added the `power` namespace for protected macOS wake or power-on scheduling with `--dry-run` support.
- Added a LaunchAgent prerequisite for real power schedule activation and human-readable `sudo` guidance for protected power mutations.
- Added interactive uninstall retention prompts and `--yes`/`-y` for complete managed-data removal.
- Added the persisted `agent-config.json` snapshot used by the background agent, status, power, and log commands.
- Added explicit global CLI configuration options for every runtime setting and the power-on offset.
- Added a circular macOS status bar indicator for monitor lifecycle and schedule state.

### Changed

- Updated the npm CLI and LaunchAgent tooling to execute compiled files from `dist/`.
- Updated CI documentation and development commands for the TypeScript, ESLint, Prettier, Jest, and build workflow.
- Standardized command output with consistent headers, labeled details, colored states, readable lists, and contextual error messages.
- Clarified LaunchAgent lifecycle semantics: `stop`/`start` fully stop and start the process, while `pause`/`resume` preserve and continue a paused service.
- Documented that power scheduling does not change FileVault or automatic login settings and explained the session and physical-security implications.
- Added the `agent install` global CLI route and equivalent pnpm script for installing the prerequisite LaunchAgent.
- Clarified that uninstall always removes the plist and reports whether managed application data was retained or removed.
- Clarified that `.env` changes require `agent restart` to regenerate the background configuration snapshot.
- Changed global `agent install` and `agent restart` to use defaults and explicit CLI options without implicitly reading `.env`; `--env-file` remains an explicit opt-in.

### Fixed

- Fixed LaunchAgent status reporting so an uninstalled agent shows `NOT CONFIGURED` instead of presenting `.env` values as an active schedule.
- Fixed Electron runtime data paths so logs, runtime state, and configuration history are stored under `~/Library/Application Support/mac-idle-keeper/`.

## [1.4.0] - 2026-10-06

### Added

- Added contribution guidelines for code, testing, documentation, maintenance, and financial support.
- Added the `mac-idle-keeper` global CLI for npm installations.
- Added CLI commands for foreground monitoring, LaunchAgent management, and log inspection.
- Added npm package metadata and runtime dependency packaging for Electron.

## [1.3.0] - 2026-10-06

### Changed

- Generalized the user-facing identity to Mac Idle Keeper.
- Clarified that activity actions operate at the macOS level and support multiple workstation applications and workflows.
- Documented the extension path for adding new activity actions.

## [1.2.1] - 2026-10-06

### Fixed

- Made the configured current timezone explicit in `launch-agent:status` output.

## [1.2.0] - 2026-10-06

### Added

- Added effective configuration change logging for interval, threshold, schedule, timezone, action, and log path changes.
- Added persistent configuration history in the Electron user-data directory.
- Added timezone-aware display formatting for application logs, LaunchAgent status, and log follow mode.

### Changed

- Application log timestamps are stored in UTC and displayed using the configured `IDLE_TIMEZONE`, defaulting to `America/Monterrey`.

## [1.1.0] - 2026-10-06

### Improved

- Standardized human-readable, colorized output across foreground, test, log, and LaunchAgent commands.
- Added readable success, warning, and error messages for LaunchAgent management operations.
- Updated the test command to use Node's human-readable `spec` reporter.

## [1.0.2] - 2026-10-06

### Added

- Added `launch-agent:logs` to print the latest application log lines.
- Added `--follow`/`-f` for real-time log streaming.
- Added `--lines`/`-n` to control the number of initial log lines.
- Added automated coverage for log argument parsing and tail reads.

## [1.0.1] - 2026-10-05

### Added

- Added runtime state reporting so `launch-agent:status` shows the configuration actually loaded by the running monitor.
- Added human-readable, colorized LaunchAgent status output with process state, schedule state, and the last five activity actions.
- Added LaunchAgent management commands for install, status, stop, pause, resume, restart, and uninstall.
- Added configurable day groups: `all_week`, `weekend`, and `working_days`.
- Added minute-precision schedules through `IDLE_START_TIME` and `IDLE_END_TIME`.

### Fixed

- Made LaunchAgent restart refresh the plist and use the native Electron binary directly.
- Added LaunchAgent stdout and stderr logs for troubleshooting.
- Improved physical mouse activity generation so the cursor moves gradually over approximately 300 ms, helping active desktop workflows receive user-activity events.
- Added post-action idle verification through `idleAfter`.
- Added clearer macOS notification handling when running Electron directly.

## [1.0.0] - 2026-10-05

### Added

- Initial stable release of the macOS idle monitor.
- Weekday schedule, configurable `.env` support, physical HID activity, `caffeinate` awake guard, macOS notifications, and automated tests.

[Unreleased]: https://github.com/raymundo-salazar/mac-idle-keeper/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/raymundo-salazar/mac-idle-keeper/releases/tag/v1.4.0
[1.3.0]: https://github.com/raymundo-salazar/mac-idle-keeper/releases/tag/v1.3.0
[1.2.1]: https://github.com/raymundo-salazar/mac-idle-keeper/releases/tag/v1.2.1
[1.2.0]: https://github.com/raymundo-salazar/mac-idle-keeper/releases/tag/v1.2.0
[1.1.0]: https://github.com/raymundo-salazar/mac-idle-keeper/releases/tag/v1.1.0
[1.0.2]: https://github.com/raymundo-salazar/mac-idle-keeper/releases/tag/v1.0.2
[1.0.1]: https://github.com/raymundo-salazar/mac-idle-keeper/releases/tag/v1.0.1
[1.0.0]: https://github.com/raymundo-salazar/mac-idle-keeper/releases/tag/v1.0.0
