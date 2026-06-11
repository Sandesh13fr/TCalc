# Open VSX Publishing Guide

This document explains how to publish the Workspace Model Advisor VS Code
extension to **Eclipse Open VSX** (open-vsx.org), the open-source registry used
by editors like VSCodium, Gitpod, Eclipse Theia, Code-OSS, and others.

> **Status (v0.1.0):** Publishing is **prepared but not yet performed**. The
> workflow is conservative: it ships in `dry_run=true` mode by default, only
> runs on `workflow_dispatch`, and never auto-publishes on tag push.

## Why Open VSX and not the VS Code Marketplace

| Registry | Audience | Distribution model |
|----------|----------|---------------------|
| VS Code Marketplace | Microsoft's VS Code only | Proprietary, requires Microsoft account |
| Open VSX | All open VS Code-compatible editors | Open-source, run by the Eclipse Foundation |

Open VSX is the right fit for a project that advertises itself as
local-first, open-source, and editor-neutral.

## Prerequisites

To publish to Open VSX you need:

1. **An Open VSX account.** Sign in at <https://open-vsx.org/> with a GitHub
   account.
2. **A publisher namespace.** Pick a namespace (e.g. `workspace-model-advisor`)
   and claim it under your account settings. This must match the `publisher`
   field in `apps/vscode-extension/package.json` (`workspace-model-advisor`).
3. **A personal access token (PAT).** Generate one at
   <https://open-vsx.org/user-settings/tokens>.
4. **A GitHub Actions secret named `OPEN_VSX_TOKEN`.** Add it in your
   repository settings under
   *Settings → Secrets and variables → Actions → New repository secret*.
   Paste the PAT from step 3 as the value. **Never commit the token.**

> The token only needs the `publish:extension` scope. The Open VSX web UI
> will tell you which scopes are selected when you generate it.

## What gets published

| Field | Source | Notes |
|-------|--------|-------|
| `name` | `apps/vscode-extension/package.json` | The extension ID, e.g. `workspace-model-advisor` |
| `publisher` | `apps/vscode-extension/package.json` | The namespace you own on open-vsx.org |
| `version` | `apps/vscode-extension/package.json` | Must be a semver string |
| `description` / `displayName` | `apps/vscode-extension/package.json` | Shown on the registry page |
| `engines.vscode` | `apps/vscode-extension/package.json` | Minimum VS Code version |
| `license` | `apps/vscode-extension/package.json` | `MIT` |
| `repository` / `bugs` / `homepage` | `apps/vscode-extension/package.json` | Links to the source repo |
| `categories` / `keywords` | `apps/vscode-extension/package.json` | Discovery metadata |
| README | `apps/vscode-extension/README.md` (bundled) | Pulled from repo root by `scripts/copy-assets.mjs` |
| CHANGELOG | `apps/vscode-extension/CHANGELOG.md` (bundled) | Pulled from repo root by `scripts/copy-assets.mjs` |
| LICENSE | `apps/vscode-extension/LICENSE` (bundled) | Pulled from repo root by `scripts/copy-assets.mjs` |
| Catalogs | `apps/vscode-extension/catalogs/{models,providers}.json` (bundled) | Required at runtime |

The metadata validation step
(`scripts/check-extension-metadata.mjs`, exposed as
`pnpm check:extension-metadata`) verifies every field above before any
publish is attempted.

## Local dry run

This builds, tests, and packages the VSIX **without** publishing it. It is
safe to run repeatedly and is wired into CI.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm package:vscode
pnpm package:vscode:inspect
pnpm check:extension-metadata
```

Or in one go:

```bash
pnpm publish:open-vsx:dry-run
```

This does **not** push anything to Open VSX. It stops at producing and
verifying the VSIX in `dist-vsix/`.

## Local publish (manual)

Use this when you have a token and want to publish from your own machine.

```bash
export OPEN_VSX_TOKEN=<your-personal-access-token>
# PowerShell: $env:OPEN_VSX_TOKEN = '<your-personal-access-token>'

pnpm publish:open-vsx:local
```

The helper script (`scripts/publish-open-vsx.mjs`):

1. Runs `pnpm check:extension-metadata`.
2. Runs `pnpm build` and `pnpm test`.
3. Runs `pnpm package:vscode` and `pnpm package:vscode:inspect`.
4. Calls `npx ovsx publish dist-vsix/*.vsix --pat "$OPEN_VSX_TOKEN"`.

It refuses to run without `OPEN_VSX_TOKEN` set, and refuses tokens that
look too short (< 16 chars).

## GitHub Actions publish flow

The workflow `.github/workflows/publish-open-vsx.yml`:

- Is triggered **only** by `workflow_dispatch`. It never runs on push, PR, or
  tag.
- Defaults `dry_run` to `true`. The default run is therefore a no-op publish
  that only builds, tests, packages, and uploads the VSIX as an artifact.
- Has a dedicated `publish-open-vsx` job that runs **only** when
  `dry_run == false`.
- Uses `contents: read` only. It never requests `contents: write`.
- Verifies the `OPEN_VSX_TOKEN` secret is set before attempting to publish,
  and prints a clear error message if it is missing.
- Echoes **no** token values, not even partial. The only output referencing
  the token is a length check.

### To run a dry run

1. Open the **Actions** tab on GitHub.
2. Select **Publish to Open VSX** in the left sidebar.
3. Click **Run workflow**.
4. Leave **dry_run** checked.
5. Click **Run workflow** to start.

### To publish for real

1. Make sure the `OPEN_VSX_TOKEN` secret is set in the repository
   (*Settings → Secrets and variables → Actions*).
2. Open the **Actions** tab.
3. Select **Publish to Open VSX**.
4. Click **Run workflow**.
5. Uncheck **dry_run**.
6. (Optional) Set **version** to a human-readable note about the release.
7. Click **Run workflow**.

The job will:

- Build, test, package, and inspect the VSIX.
- Download the artifact into the publish job.
- Verify the token is set.
- Run `npx ovsx publish dist-vsix/*.vsix --pat "$OPEN_VSX_TOKEN"`.

## Verifying after publish

After the workflow completes successfully:

1. Open <https://open-vsx.org/namespace/workspace-model-advisor>.
2. Confirm the version is listed and the metadata renders.
3. Open the extension page
   (<https://open-vsx.org/extension/workspace-model-advisor/workspace-model-advisor>).
4. In a compatible editor (VSCodium, Eclipse Theia, etc.), search for
   `workspace-model-advisor` in the extension marketplace. It should appear
   in the search results.
5. Install it and run the `Workspace Model Advisor: Scan Workspace` command
   on a small folder to confirm activation.

## Smoke install

After publishing:

1. Download the matching VSIX from the workflow artifact or the Open VSX
   page.
2. In VSCodium (or any VS Code-compatible editor that uses Open VSX):
   ```bash
   # CLI install
   vscodium --install-extension workspace-model-advisor-<version>.vsix
   # Or in the GUI: Extensions -> ... -> Install from VSIX
   ```
3. Reload the window when prompted.
4. Run `Workspace Model Advisor: Scan Workspace` on a test folder.
5. Confirm the dashboard opens, the scan completes, and the model
   recommendation renders.

## Rollback / unpublish

Open VSX allows a publisher to **unpublish** any version they own:

1. Open the extension page on open-vsx.org.
2. Sign in with the publisher account.
3. Find the version in the version list and click **Unpublish**.

There is no "yank" or "deprecate" feature on Open VSX; only publish and
unpublish. We recommend:

- **Unpublishing** a version that is broken or that you no longer want
  discoverable.
- **Publishing a new version** with a fix for non-critical issues.

If a token is leaked, **revoke it immediately** in your Open VSX
*User Settings → Access Tokens*, then issue a new token and update the
GitHub secret.

## Limitations and checklist

Open VSX has a few constraints to be aware of:

- **No automatic update notifications** to non-Marketplace editors in the
  same way as the VS Code Marketplace, but extensions are still discoverable
  and installable.
- **No Marketplace-style "preview" mechanism.** All published versions are
  visible.
- **Publisher namespace ownership is permanent.** Renaming a publisher is
  not supported; you would have to unpublish and re-publish under a new
  namespace.
- **Token scope is per-token.** A token created with only `publish:extension`
  cannot read user data.

### Pre-publish checklist

- [ ] Extension metadata check passes: `pnpm check:extension-metadata`
- [ ] No-telemetry check passes: `node scripts/check-no-telemetry.mjs`
- [ ] All tests pass: `pnpm test`
- [ ] VSIX packages cleanly: `pnpm package:vscode`
- [ ] VSIX contents are correct: `pnpm package:vscode:inspect`
- [ ] `CHANGELOG.md` reflects the version being published
- [ ] `apps/vscode-extension/package.json` `version` matches the release tag
- [ ] `OPEN_VSX_TOKEN` secret is set in GitHub
- [ ] Publisher namespace on open-vsx.org is owned by the token issuer
- [ ] Dry run completed cleanly via
  `Actions → Publish to Open VSX → Run workflow (dry_run=true)`

## What this guide does **not** cover

- Publishing to the **VS Code Marketplace** (out of scope for v0.1.x).
- Auto-publishing on every tag (explicitly avoided; the publish is always
  manual via `workflow_dispatch`).
- Hosting or analytics (the project remains local-first and
  telemetry-free).
