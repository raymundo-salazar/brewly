# AGENTS.md

## Project scope

Brewly is a macOS-only Electron monitor exposed through a Node.js CLI. It detects system idle time on a schedule, keeps the Mac awake during the active window, and executes a configurable OS-level activity action when the threshold is exceeded.

The project is intentionally application-independent. Keep runtime behavior and general documentation focused on authorized workstation continuity and operating-system-level actions.

## Repository commands

Run these commands from the repository root:

```bash
pnpm install
pnpm run lint
pnpm run format:check
pnpm run test:coverage
pnpm run build
pnpm run check
pnpm pack --dry-run
node dist/bin/brewly/index.js help
pnpm migrate -- --dry-run
```

The controlled manual profile is:

```bash
pnpm run start:test
```

It uses `.env.test`, a 10-second interval, a 10-second threshold, and the real physical activity action. Avoid running it automatically in CI or unattended environments.

## Change guidelines

- Preserve the global CLI and existing pnpm scripts unless a migration is documented.
- Keep `brewly migrate` and `pnpm migrate` able to migrate both global npm and local source-checkout installations. Preserve the legacy effective configuration, stop the old service before installing the new one, verify the new service, and retain legacy data for rollback.
- Every breaking release must extend `brewly migrate` to accept any supported previous version, not only the immediately preceding release. Use explicit version or schema detection and chain migrations when necessary (for example, `1.x -> 2.x -> 3.x`); keep migrations idempotent, support `--dry-run`, preserve rollback data, and add deterministic tests and documentation for each migration path.
- Preserve `launch-agent` as a compatibility namespace; `agent` is its documented short alias. Keep power scheduling under the separate `power` namespace.
- Keep the package macOS-only and compatible with Node.js 22.12+.
- Add deterministic tests for behavior changes.
- Write all functional source code in TypeScript and keep the build free of type errors.
- Organize each component, module, or function under a `camelCase` folder with an `index.ts` entrypoint. A class uses `PascalCase` for both its class name and its folder name.
- Keep interfaces, type aliases, and enums exclusively in that component's `types.d.ts`; use `constants.ts` and `utils.ts` only when needed.
- Keep modules focused on one responsibility and use SOLID principles, especially single responsibility.
- Add structured English JSDoc to every function, method, class, exported constant, and non-trivial implementation block. Function and method documentation must include `@function` or `@method`, `@description`, one `@param` per parameter, and `@returns`; add `@throws` for thrown errors and `@example` for public APIs. Class documentation must include `@class`, `@description`, applicable `@template`/`@extends`/method information, and an example when it is usable independently. Follow [`docs/jsdoc.md`](docs/jsdoc.md) and update matching documentation when behavior changes.
- Put Jest tests under `/tests` using the same folder-name convention as the code under test.
- Maintain at least 90% statements, branches, functions, and lines coverage. Coverage reports are written to `coverage/` and `junit.xml`.
- Run ESLint, Prettier, Jest coverage, and the TypeScript build before every commit. Husky enforces the same `pnpm run check` gate locally.
- Pull requests must pass the GitHub Actions quality gate, including lint, formatting, tests, coverage, and build.
- Use English for code, documentation, comments, errors, logs, and CLI output.
- Use Conventional Commits with a clear scope. Link commits and pull requests to an issue or ticket when one exists; tracking references are recommended for traceability but are not a blocking requirement.
- Keep persisted timestamps in UTC and localize only interactive display output.
- Treat the effective configuration as immutable during a process lifetime; `.env` changes require restart.
- Foreground and local source workflows may read `.env`. Global `agent install` and `agent restart` use defaults plus explicit `--idle-*`/`--power-*` options and must not read `.env` unless `--env-file` is explicitly supplied. They must write `~/Library/Application Support/brewly/agent-config.json`; the LaunchAgent, `agent status`, `power`, and `logs` commands must read that snapshot instead of rereading `.env`. Uninstall must remove the snapshot.
- Do not commit `.env`, logs, runtime state, generated tarballs, or machine-specific paths.
- Do not use `sudo` or modify system permissions as part of repository changes.
- Be careful with LaunchAgent operations; inspect generated plist paths before changing or removing them.
- Power scheduling must use `--dry-run` and inspect existing `pmset` events before mutation. Never modify FileVault, automatic login, or login security settings in code; document their relationship and risks instead.
- A real `power enable` operation requires the per-user LaunchAgent plist to exist. Keep `power status`, `power enable --dry-run`, and `power disable` available for inspection, planning, and cleanup. Power mutations that require administrator authorization must emit a human-readable `sudo` instruction and must never invoke `sudo` internally.
- Status output must distinguish configured power events from the monitor's proposed schedule. Use `NOT CONFIGURED` when there is no managed or external repeating power event, and do not present the derived power-on time as active in that state.
- LaunchAgent status must use the plist or runtime state to determine whether configuration is active. When both are absent, report `NOT CONFIGURED` instead of presenting `.env` values as an active agent schedule.

## Release rules

- Keep `package.json` and `CHANGELOG.md` on the same version.
- Use a minor version for backward-compatible features and a patch version for fixes.
- Release tags use the exact format `vX.Y.Z` and must match `package.json` without the leading `v`.
- Run tests and `pnpm pack --dry-run` before a release.
- The publish workflow validates tests and version alignment before using the `NPM_TOKEN` secret.
- Release notes follow Keep a Changelog and include links to the related commit, issue, or ticket when available.
- A breaking release is incomplete until its migration path is implemented in `brewly migrate`, validated from every supported previous version, and documented with upgrade and rollback guidance.

## Documentation map

- `README.md`: concise public overview and common commands.
- `CONTRIBUTING.md`: contribution and maintenance policy.
- `docs/getting-started.md`: installation and operation.
- `docs/testing.md`: tests, manual checks, and package validation.
- `docs/github-actions.md`: CI and npm release workflow.
- `docs/architecture.md`: runtime modules and extension points.

Read the relevant documentation before changing release, packaging, LaunchAgent, time, or configuration behavior.
