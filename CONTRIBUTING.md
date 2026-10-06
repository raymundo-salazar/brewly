# Contributing to Prevent Discord Idle

Thank you for your interest in improving Prevent Discord Idle. Contributions are welcome in code, documentation, testing, maintenance, issue triage, and financial support.

## Ways to contribute

### Code and bug fixes

- Reproduce the issue and describe the macOS version, Node.js version, pnpm version, and configuration profile involved.
- Keep changes focused and avoid unrelated refactors.
- Add or update tests for every behavior change.
- Preserve macOS-specific permission and LaunchAgent behavior.
- Never commit personal `.env` files, logs, credentials, or machine-specific paths.

### Documentation and testing

Useful contributions include:

- clarifying setup, permissions, scheduling, or troubleshooting instructions;
- adding deterministic tests for schedule and configuration behavior;
- testing on supported macOS versions and reporting the results;
- improving examples without changing the documented defaults accidentally.

### Maintenance

Maintainers can help keep the project healthy by:

- reviewing pull requests and triaging issues;
- checking Electron, Node.js, and pnpm compatibility;
- reviewing dependency and macOS API changes;
- validating LaunchAgent behavior after upgrades;
- keeping the README, CHANGELOG, tests, and default configuration synchronized.

## Development workflow

1. Fork the repository and create a focused branch.
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Make the change and add tests where appropriate.
4. Run the quality check:

   ```bash
   pnpm run check
   ```

5. Update documentation and `CHANGELOG.md` when user-visible behavior changes.
6. Open a pull request describing the problem, solution, testing performed, and any macOS permission requirements.

Do not include real activity logs or personal configuration values in issues or pull requests. Redact usernames, paths, timestamps, and other identifying information before sharing output.

## Design and maintainability guidelines

- Prefer small modules with one clear responsibility.
- Keep configuration behavior explicit and document defaults.
- Store persisted timestamps in UTC and convert them only for display.
- Use deterministic tests for timezone and schedule logic.
- Keep runtime behavior compatible with the per-user LaunchAgent.
- Prefer the existing Node.js APIs and project conventions before adding dependencies.
- Use clear, user-facing CLI messages and update documentation when output changes.

## Financial support

Financial support helps fund maintenance, macOS compatibility testing, dependency upgrades, and issue triage. If GitHub Sponsors is enabled for the maintainer account, support is available through [GitHub Sponsors](https://github.com/sponsors/raymundo-salazar).

Support can be used for:

- recurring maintenance sponsorships;
- one-time contributions;
- funding a focused bug fix, documentation improvement, or compatibility investigation;
- providing hardware or test resources for macOS validation.

Please do not send payments or sensitive information through issues or pull requests. Use the official sponsorship page when available, and open a public issue first if you want to discuss a funded maintenance request.

## Pull request expectations

Pull requests should:

- explain the motivation and expected behavior;
- include tests or explain why tests are not practical;
- update documentation for user-visible changes;
- pass `pnpm run check`;
- avoid unrelated formatting or generated files;
- follow the repository's existing commit and release conventions.

The maintainer may request changes to preserve compatibility, simplify the implementation, or improve test coverage.
