# VS Code Marketplace Publishing Guide

This document explains how to publish the TCalc VS Code extension to the
official **Visual Studio Marketplace**.

> **Status (v0.1.0):** Published. Available at
> [marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc](https://marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc).
> Publishing is gated behind a manual `workflow_dispatch` workflow
> (`publish-vscode-marketplace.yml`) that defaults to `dry_run=true`.

## Prerequisites

1. **A Visual Studio Marketplace publisher account.** Sign in at
   <https://marketplace.visualstudio.com/manage> with a Microsoft account.
2. **A publisher name.** This **must match exactly** the `publisher` field in
   `apps/vscode-extension/package.json` (currently `Sandesh13fr`).
3. **An Azure DevOps Personal Access Token (PAT).** Generate one at
   <https://dev.azure.com/{your-org}/_usersettings/tokens> with the
   **Marketplace (Publish)** scope. Copy the token value immediately — it is
   only shown once.
4. **A GitHub Actions secret named `VSCE_TOKEN`.** Add it in your repository
   settings under *Settings → Secrets and variables → Actions → New
   repository secret*. Paste the PAT as the value. **Never commit the token.**

## What gets published

| Field | Source | Notes |
|-------|--------|-------|
| `name` | `apps/vscode-extension/package.json` | The extension ID, e.g. `tcalc` |
| `publisher` | `apps/vscode-extension/package.json` | The publisher name on the Marketplace |
| `version` | `apps/vscode-extension/package.json` | Must be a semver string |
| `description` / `displayName` | `apps/vscode-extension/package.json` | Shown on the Marketplace page |
| `engines.vscode` | `apps/vscode-extension/package.json` | Minimum VS Code version |
| `license` | `apps/vscode-extension/package.json` | `MIT` |
| `repository` / `bugs` / `homepage` | `apps/vscode-extension/package.json` | Links to the source repo |
| `categories` / `keywords` | `apps/vscode-extension/package.json` | Discovery metadata |
| `icon` | `apps/vscode-extension/icon.png` (not yet added) | Shown in the Marketplace listing |
| README | `apps/vscode-extension/README.md` (bundled) | Pulled from repo root by `scripts/copy-assets.mjs` |
| CHANGELOG | `apps/vscode-extension/CHANGELOG.md` (bundled) | Pulled from repo root by `scripts/copy-assets.mjs` |
| LICENSE | `apps/vscode-extension/LICENSE` (bundled) | Pulled from repo root by `scripts/copy-assets.mjs` |

## Local dry run

```bash
pnpm publish:vscode:dry-run
```

This runs the full build, test, and package pipeline but does **not** publish
anything to the Marketplace. It verifies the VSIX is valid.

## Local publish (manual)

```bash
export VSCE_TOKEN=<your-personal-access-token>
# PowerShell: $env:VSCE_TOKEN = '<your-personal-access-token>'

pnpm publish:vscode:local
```

The helper script (`scripts/publish-vscode-marketplace.mjs`):

1. Runs `pnpm check:extension-metadata`
2. Runs `pnpm build` and `pnpm test`
3. Runs `pnpm package:vscode` and `pnpm package:vscode:inspect`
4. Calls `npx @vscode/vsce publish` with the PAT

It refuses to run without `VSCE_TOKEN` set, and refuses tokens that look too
short (< 16 chars).

## GitHub Actions publish flow

The workflow `.github/workflows/publish-vscode-marketplace.yml`:

- Is triggered **only** by `workflow_dispatch`. It never runs on push, PR, or
  tag.
- Defaults `dry_run` to `true`. The default run is therefore a no-op publish
  that only builds, tests, packages, and uploads the VSIX as an artifact.
- Has a dedicated `publish-vscode-marketplace` job that runs **only** when
  `dry_run == false`.
- Uses `contents: read` only. It never requests `contents: write`.
- Verifies the `VSCE_TOKEN` secret is set before attempting to publish, and
  prints a clear error message if it is missing.
- Echoes **no** token values.

### To run a dry run

1. Open the **Actions** tab on GitHub.
2. Select **Publish to VS Code Marketplace** in the left sidebar.
3. Click **Run workflow**.
4. Leave **dry_run** checked.
5. Click **Run workflow** to start.

### To publish for real

1. Make sure the `VSCE_TOKEN` secret is set in the repository
   (*Settings → Secrets and variables → Actions*).
2. Open the **Actions** tab.
3. Select **Publish to VS Code Marketplace**.
4. Click **Run workflow**.
5. Uncheck **dry_run**.
6. Click **Run workflow**.

The job will:

- Build, test, package, and inspect the VSIX.
- Download the artifact into the publish job.
- Verify the token is set.
- Run `npx @vscode/vsce publish` with the PAT.

## Verifying after publish

After the workflow completes successfully:

1. Open <https://marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc>.
2. Confirm the version is listed and the metadata renders correctly.
3. Install the extension in VS Code and verify activation.

## Smoke install

After publishing:

1. Open VS Code.
2. Open the Extensions view (`Ctrl+Shift+X`).
3. Search for `TCalc`.
4. Click **Install**.
5. Run `TCalc: Scan Workspace` on a test folder.
6. Confirm the dashboard opens, the scan completes, and recommendations render.

## Rollback / unpublish

If a published version is broken:

1. Go to <https://marketplace.visualstudio.com/manage>.
2. Sign in with the publisher account.
3. Find the extension and select the version to unpublish.
4. Click **Unpublish**.

You can also use the CLI:

```bash
npx @vscode/vsce unpublish Sandesh13fr.tcalc
```

If a token is leaked, **revoke it immediately** in your Azure DevOps settings,
then issue a new token and update the GitHub secret.

## Troubleshooting

### `The Personal Access Token used does not support Marketplace publishing`

The token was created without the **Marketplace (Publish)** scope. Regenerate
it at <https://dev.azure.com/{your-org}/_usersettings/tokens> with the
correct scope.

### `Extension update version should be greater than previous version`

The version in `apps/vscode-extension/package.json` must be greater than the
previously published version. Bump the version before publishing.

### `This extension is already published`

The version already exists on the Marketplace. Bump the version and try again.

## Limitations

- The Marketplace does not support `ovsx`-style preflight (`verify-pat`).
  The token is validated at publish time by `vsce`.
- There is no "draft" mode on the Marketplace — once published, a version is
  immediately visible.
- Unpublishing removes the extension from search results but does not
  uninstall it from existing users.

## Pre-publish checklist

- [ ] Extension metadata check passes: `pnpm check:extension-metadata`
- [ ] No-telemetry check passes: `node scripts/check-no-telemetry.mjs`
- [ ] All tests pass: `pnpm test`
- [ ] VSIX packages cleanly: `pnpm package:vscode`
- [ ] VSIX contents are correct: `pnpm package:vscode:inspect`
- [ ] `CHANGELOG.md` reflects the version being published
- [ ] `apps/vscode-extension/package.json` `version` matches the release tag
- [ ] `VSCE_TOKEN` secret is set in GitHub
- [ ] Publisher name exists on the Marketplace
- [ ] Dry run completed cleanly via
      `Actions → Publish to VS Code Marketplace → Run workflow (dry_run=true)`
