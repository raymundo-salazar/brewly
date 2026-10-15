# GitHub Actions and releases

The repository uses two workflows under `.github/workflows/`.

## Test workflow

`test.yml` runs on every push and pull request.

It:

1. checks out the repository;
2. installs pnpm 11.18.0;
3. uses Node.js 22.13 on `macos-latest`;
4. installs dependencies with `pnpm install --frozen-lockfile`;
5. runs `pnpm run check`, which enforces ESLint, Prettier, Jest coverage, and the TypeScript build;
6. validates the package contents with `pnpm pack --dry-run`.

The runner is macOS because the application and Electron runtime target macOS.

Because the workflow runs on `pull_request`, the same quality gates are required before a pull request can be merged. The pre-commit and pre-push Husky hooks run `pnpm run check` locally.

## Publish workflow

`publish.yml` runs only when a tag matching `v*.*.*` is pushed. It repeats the dependency installation and tests before doing anything publish-related.

Before publishing, it verifies that:

```text
tag v2.0.0 == package.json version 2.0.0
```

It then creates the npm tarball and publishes it publicly with npm provenance.

## Required repository configuration

Create an Actions secret named `NPM_TOKEN` containing an npm automation token with permission to publish `brewly`. The workflow intentionally fails after tests if the secret is absent.

The npm account must have access to the package name. The first publication may require creating or claiming the package name manually, depending on npm account state.

The workflow uses:

- `contents: read` to check out source;
- `id-token: write` for npm provenance;
- npm registry setup through `actions/setup-node`.

## Release sequence

From a clean working tree:

```bash
pnpm run check
pnpm pack --dry-run
```

Update `package.json` and `CHANGELOG.md` to the same version, commit the release, create an annotated tag, and push both:

```bash
git commit -m "chore: release v2.0.0"
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin main --tags
```

Pushing the tag starts `publish.yml`. Do not manually run `npm publish` for the same tag unless the workflow has been intentionally disabled and the release state has been checked.

## Failure handling

- If tests fail, the package is not published.
- If the tag and package versions differ, the package is not published.
- If `NPM_TOKEN` is missing or invalid, the package is not published.
- A failed workflow does not automatically move or delete a tag. Fix the cause, then follow the repository's release policy before retrying.
