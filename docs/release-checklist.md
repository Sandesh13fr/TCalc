# Release Checklist

This checklist combines a manual release path with the automated GitHub
Actions workflow. The release attaches the VSIX to a GitHub Release and can
optionally be published to Open VSX or the VS Code Marketplace via separate
manual workflows.

## Pre-release

- [ ] All tests pass: `pnpm test`
- [ ] Type-check passes: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Preflight passes: `pnpm package:vscode:preflight`
- [ ] CLI smoke tests pass: `pnpm smoke:cli`
- [ ] No telemetry or unexpected network calls: `node scripts/check-no-telemetry.mjs`
- [ ] CI is green on `main` for the target commit: check the
      `ci.yml` workflow run.

## Build

- [ ] Bump version in:
  - `apps/vscode-extension/package.json`
  - `package.json` (root)
  - `CHANGELOG.md`
- [ ] Commit version bump
- [ ] Tag the release: `git tag v0.x.x`
- [ ] Build the VSIX locally as a sanity check:
  ```bash
  pnpm build
  pnpm package:vscode
  pnpm package:vscode:inspect
  ```

## Release

### Automated (preferred)

1. Push the tag: `git push origin v0.x.x`
2. The `release.yml` workflow will:
   - Build all packages
   - Run the test suite
   - Package the VSIX
   - Inspect the VSIX contents
   - Upload the VSIX as a workflow artifact
   - Create (or update) a **draft** GitHub Release and attach the VSIX
3. Review the draft release on GitHub and publish it.

> The release is created as a **draft** so a human always reviews it before
> it becomes public. The workflow only uses the default `GITHUB_TOKEN` and
> only requests `contents: write`. It does not push to the Marketplace or
> Open VSX.

### Manual fallback

Use this when the automated workflow is not available (e.g. private forks
without write access, or GitHub Actions outages).

1. Run the build and packaging locally:
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   pnpm package:vscode
   pnpm package:vscode:inspect
   ```
2. Confirm `dist-vsix/*.vsix` exists.
3. Create a GitHub Release for the tag manually:
   - Open `https://github.com/Sandesh13fr/TCalc/releases/new`
   - Choose the tag (e.g. `v0.x.x`)
   - Leave it as a **draft** until reviewed
   - Attach the VSIX file
   - Click "Publish release"

## Post-release

- [ ] Install the VSIX locally and run a manual smoke test
- [ ] Publish to Open VSX (see Open VSX section below)
- [ ] Publish to VS Code Marketplace (see Marketplace section below)

## Notes on what is automated vs manual

| Step | Automated? | Why |
|------|------------|-----|
| Build, test, package | Yes (`release.yml`) | Reproducible, cached, runs on clean runner |
| VSIX inspection | Yes (`release.yml`) | Required to catch packaging regressions |
| Draft GitHub Release | Yes (`release.yml`) | Drafts are safe; humans still publish |
| VS Code Marketplace | **Manual workflow_dispatch** | See Marketplace section below |
| Open VSX | **Manual workflow_dispatch** | See Open VSX section below |
| Tag push | Manual | Versioning is a human decision |
| Draft → Published | Manual | Final review happens on GitHub |

The automation never publishes to a public registry automatically. If a release needs to be
undone, delete the GitHub Release and re-tag.

## Open VSX

Publishing to Open VSX is **available** via a manual `workflow_dispatch` trigger
and defaults to `dry_run=true`.

### Prerequisites

- An Open VSX account at <https://open-vsx.org/>.
- A publisher namespace **already created** on open-vsx.org and matching
   the `publisher` field in `apps/vscode-extension/package.json`
   (`Sandesh13fr`). Create it once per account via the web UI
   (<https://open-vsx.org/user-settings/namespaces>) or via
   `npx -y ovsx create-namespace Sandesh13fr --pat <token>`.
  The namespace is permanent; pick carefully.
- A personal access token from
  <https://open-vsx.org/user-settings/tokens> with the
  `publish:extension` scope. The token must be issued by the account that
  owns the namespace above.
- A GitHub repository secret named `OPEN_VSX_TOKEN` containing that token.
  *Settings → Secrets and variables → Actions → New repository secret.*

### Preflight

```bash
pnpm check:extension-metadata
node scripts/check-no-telemetry.mjs
```

Both must pass before publishing.

### Dry run (recommended first step)

1. Open the **Actions** tab on GitHub.
2. Select **Publish to Open VSX** in the left sidebar.
3. Click **Run workflow**.
4. Leave **dry_run** checked.
5. Click **Run workflow**.

This builds, tests, packages, and uploads the VSIX as a workflow artifact
(`open-vsx-vsix`). Nothing is pushed to Open VSX.

### Manual approval

Before publishing for real, confirm:

- The token in `OPEN_VSX_TOKEN` is still valid (revoke and reissue if you
  have any doubt).
- The `version` field in `apps/vscode-extension/package.json` matches the
  release tag.
- The CHANGELOG entry exists for the version being published.
- The publisher namespace on open-vsx.org is owned by the token issuer.

### Publish

1. Open the **Actions** tab.
2. Select **Publish to Open VSX**.
3. Click **Run workflow**.
4. Uncheck **dry_run**.
5. Click **Run workflow**.

The job will print a clear error if the token is missing. The token is never
echoed; only its length is reported.

### Verify the page

After the workflow finishes:

1. Open <https://open-vsx.org/namespace/Sandesh13fr>.
2. Confirm the new version is listed.
3. Open the extension page and verify the README, categories, and metadata
   render correctly.

### Smoke install

1. Download the matching VSIX from the workflow artifact.
2. In VSCodium (or any editor that uses Open VSX):
   ```bash
   vscodium --install-extension tcalc-<version>.vsix
   ```
3. Reload the window when prompted.
4. Run `TCalc: Scan Workspace` on a test folder.
5. Confirm the dashboard, recommendations, and repo map all render.

### Rollback

If a published version is broken:

1. Sign in to <https://open-vsx.org/> with the publisher account.
2. Open the extension page.
3. Find the bad version and click **Unpublish**.

If the token is leaked, **revoke it immediately** in
*User Settings → Access Tokens* on open-vsx.org, then issue a new token
and update the GitHub secret.

See [docs/open-vsx-publishing.md](./open-vsx-publishing.md) for the full
guide.

## VS Code Marketplace

Publishing to the VS Code Marketplace is **prepared but not automatic**. It is
gated behind a manual `workflow_dispatch` trigger and defaults to `dry_run=true`.

### Prerequisites

- A Visual Studio Marketplace publisher account at
  <https://marketplace.visualstudio.com/manage>.
- A publisher name matching the `publisher` field in
  `apps/vscode-extension/package.json` (`Sandesh13fr`).
- An Azure DevOps PAT with the **Marketplace (Publish)** scope from
  <https://dev.azure.com/{your-org}/_usersettings/tokens>.
- A GitHub repository secret named `VSCE_TOKEN` containing that PAT.
  *Settings → Secrets and variables → Actions → New repository secret.*

### Preflight

```bash
pnpm check:extension-metadata
node scripts/check-no-telemetry.mjs
```

Both must pass before publishing.

### Dry run (recommended first step)

1. Open the **Actions** tab on GitHub.
2. Select **Publish to VS Code Marketplace** in the left sidebar.
3. Click **Run workflow**.
4. Leave **dry_run** checked.
5. Click **Run workflow**.

This builds, tests, packages, and uploads the VSIX as a workflow artifact
(`marketplace-vsix`). Nothing is pushed to the Marketplace.

### Manual approval

Before publishing for real, confirm:

- The token in `VSCE_TOKEN` is still valid (regenerate if you have any doubt).
- The `version` field in `apps/vscode-extension/package.json` matches the
  release tag.
- The CHANGELOG entry exists for the version being published.
- The publisher name on the Marketplace is owned by the token issuer.

### Publish

1. Open the **Actions** tab.
2. Select **Publish to VS Code Marketplace**.
3. Click **Run workflow**.
4. Uncheck **dry_run**.
5. Click **Run workflow**.

### Verify the page

After the workflow finishes:

1. Open <https://marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc>.
2. Confirm the version and metadata render correctly.

### Smoke install

1. Open VS Code.
2. Search for `TCalc` in the Extensions view.
3. Install it and run `TCalc: Scan Workspace` on a test folder.

### Rollback

1. Go to <https://marketplace.visualstudio.com/manage>.
2. Sign in with the publisher account.
3. Find the extension and unpublish the bad version.

If the token is leaked, **revoke it immediately** in your Azure DevOps
settings, then issue a new token and update the GitHub secret.

See [docs/vscode-marketplace-publishing.md](./vscode-marketplace-publishing.md)
for the full guide.
