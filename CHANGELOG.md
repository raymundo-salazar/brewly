# Changelog

All notable changes to this project are documented here.

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
- Improved physical mouse activity generation so the cursor moves gradually over approximately 300 ms, helping Discord recognize activity.
- Added post-action idle verification through `idleAfter`.
- Added clearer macOS notification handling when running Electron directly.

## [1.0.0] - 2026-10-05

### Added

- Initial stable release of the macOS idle monitor.
- Weekday schedule, configurable `.env` support, physical HID activity, `caffeinate` awake guard, macOS notifications, and automated tests.
