# GitHub Actions and releases

The repository uses two workflows under `.github/workflows/`.

## Test workflow

`test.yml` runs on every push and pull request.

It:

1. checks out the repository with actions/checkout@v7;
2. installs pnpm 11.18.0 with pnpm/action-setup@v6;
3. uses Node.js 22.13 on `macos-latest` with actions/setup-node@v7;
4. installs dependencies with `pnpm install --frozen-lockfile`;
5. runs `pnpm run check`, which enforces ESLint, Prettier, Jest coverage, and the TypeScript build;
6. validates the package contents with `pnpm pack --dry-run`.

The runner is macOS because the application and Electron runtime target macOS.

Because the workflow runs on `pull_request`, the same quality gates are required before a pull request can be merged. The pre-commit and pre-push Husky hooks run `pnpm run check` locally.

## Publish workflow

`publish.yml` runs only when a tag matching `v*.*.*` is pushed. It repeats the dependency installation and tests before doing anything publish-related.

Before publishing, it verifies that:

```text
  tag v2.1.0 == package.json version 2.1.0
```

It then creates the npm tarball, extracts and validates the matching version section from `CHANGELOG.md`, and publishes the package publicly with npm provenance. Only after `npm publish` succeeds does it create a GitHub Release with the tag, version, changelog fragment, and the generated `brewly-<version>.tgz` package attached as a release asset. The heading may use brackets, a `v` prefix, an optional `Release` prefix, and an optional date, for example `## [2.1.0] - 2026-10-15` or `## Release v2.1.0`. The workflow requires `contents: write` for this final step.

## Required repository configuration

Configure npm Trusted Publishing for the `brewly` package using this GitHub repository and the `publish.yml` workflow. The workflow uses OIDC, so no long-lived `NPM_TOKEN` secret is required. The npm account must own or have publish access to the package name.

The workflow uses:

- `contents: write` to check out source and create the GitHub Release after npm publication succeeds;
- `id-token: write` for npm provenance;
- npm registry setup through `actions/setup-node`.

## Release sequence

From a clean working tree:

```bash
pnpm run check
pnpm pack --dry-run
```

Update `package.json` and `CHANGELOG.md` to the same version, run the quality checks, commit and push `main`, then create and push an annotated tag:

```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): prepare v2.1.1"
git push origin main
```

Then create and publish the tag:

```bash
git tag -a v2.1.1 -m "Release v2.1.1"
git push origin v2.1.1
```

Pushing the tag starts `publish.yml`. Do not manually run `npm publish` for the same tag unless the workflow has been intentionally disabled and the release state has been checked.

## Failure handling

- If tests fail, the package is not published.
- If the tag and package versions differ, the package is not published.
- If the matching changelog section is missing or contains only whitespace, the package is not published.
- If npm Trusted Publishing is not configured for this repository and workflow, the package is not published.
- If GitHub Release creation fails after npm publication, the npm package remains published and the release can be retried after correcting the workflow or repository state.
- A failed workflow does not automatically move or delete a tag. Fix the cause, then follow the repository's release policy before retrying.
