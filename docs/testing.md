# Testing and packaging

## Automated tests

Install dependencies and run the full test suite:

```bash
pnpm install
pnpm run check
```

The suite uses Jest with `ts-jest` and covers:

- schedule boundaries, day groups, and timezone behavior;
- idle threshold decisions;
- physical-action orchestration through test doubles;
- awake guard lifecycle;
- notifications;
- runtime state and configuration history;
- UTC log storage and local display conversion;
- CLI help and log inspection;
- status bar indicator states, localized lifecycle controls, native menu icons, and lifecycle behavior.

Tests are deterministic and do not require a live Electron window or a real mouse movement. External processes, notifications, filesystem state, and platform branches use mocks or temporary directories.

Run individual suites or tests when iterating:

```bash
pnpm test -- tests/config/index.test.ts
pnpm test -- -t "parses aliases"
```

The coverage gate requires at least 90% statements, branches, functions, and lines. `pnpm run test:coverage` also writes HTML, JSON, Cobertura, and JUnit-compatible reports:

- `coverage/lcov-report/index.html`
- `coverage/coverage-final.json`
- `coverage/cobertura-coverage.xml`
- `junit.xml`

## Controlled manual test

The repository's `.env.test` profile runs every 10 seconds with a 10-second threshold and enables the real physical action:

```bash
pnpm run start:test
```

Use `Ctrl+C` to stop it. For detection-only testing, set `IDLE_ACTION=none` in a separate environment file.

## Test the installed CLI locally

### Preview feedback notices

Use the dedicated scripts to inspect both feedback experiences without waiting 30 days or modifying the real reminder state:

```bash
pnpm run feedback:test
pnpm run feedback:show
pnpm run feedback:full:test
pnpm run feedback:bug:test
pnpm run feedback:star:test
pnpm run feedback:help:test
pnpm run feedback:reminders:test
```

`feedback:test` renders the short periodic reminder in controlled test mode. `feedback:show` renders the interactive feedback command; in a real terminal, move through destinations with the Up/Down arrow keys and press Enter to select one. The additional scripts exercise the full card, direct destinations, help, and reminder status without opening a browser. Direct scripts use `--no-open` so they are safe to run in automated or remote sessions.

Before publishing, verify the command entrypoint without starting Electron:

```bash
pnpm run build
node dist/bin/brewly/index.js help
```

To test the package as npm will install it, build a local tarball and install that tarball into a disposable global prefix or test environment:

```bash
pnpm pack:local
```

This command preserves the complete `npm pack` output and finishes with the exact local installation commands, including `brewly help` and `brewly agent status`. To create the tarball without the installation guidance, use `npm pack` directly. Do not install the tarball over a production installation without first recording the current version and LaunchAgent configuration.

## Inspect package contents without creating a tarball

```bash
pnpm pack --dry-run
```

The package should include the compiled `dist/` CLI/runtime, the native helper source, `.env.example`, README, CHANGELOG, CONTRIBUTING guide, and LICENSE. It should not include `node_modules`, tests, personal `.env` files, logs, or runtime state.

For the power schedule command, use the non-mutating preview before any manual macOS authorization:

```bash
node dist/bin/brewly/index.js power enable --dry-run
node dist/bin/brewly/index.js power status
```

Preview the breaking-change migration without modifying the host:

```bash
node dist/bin/brewly/index.js migrate --dry-run
```

The migration command must be tested from both a global npm installation and a source checkout. The source equivalent is `pnpm migrate -- --dry-run`; an applied migration should preserve the legacy effective configuration while creating the current `com.local.brewly` plist.

Do not run `power enable` or `power disable` automatically in CI. They modify host-level power scheduling and require an explicitly authorized macOS environment.

## Manual release checks

Before creating a release tag:

1. Run `pnpm run check`.
2. Run `pnpm pack --dry-run`.
3. Confirm `package.json` and `CHANGELOG.md` use the same release version.
4. Confirm the package exposes `dist/bin/brewly/index.js` through the `brewly` bin entry.
5. Confirm the tag will be exactly `v<package-version>`.
