
## Next milestone: VS Code Marketplace

The official VS Code docs support both packaging extensions as VSIX files and publishing them to the Visual Studio Marketplace using `vsce`, so the next logical distribution step is Marketplace publishing. :contentReference[oaicite:1]{index=1}

Use this next:

:::writing{variant="standard" id="61492"}
You are a senior TypeScript monorepo engineer, VS Code Marketplace release engineer, and open-source distribution maintainer.

Project: Workspace Model Advisor  
Repo root: TCalc

Current state:
- GitHub v0.1.0 release is done.
- VSIX is attached to GitHub release.
- Open VSX publishing is done.
- VS Code extension works.
- CLI works.
- MCP server works.
- GitHub Actions CI works.
- Release automation works.
- No telemetry.
- No cloud calls.

Your task:
Implement Phase 10: VS Code Marketplace publishing preparation.

Main goal:
Prepare the project to publish Workspace Model Advisor to the official Visual Studio Marketplace safely, using manual workflow dispatch only.

Do not implement:
- automatic publishing on every tag
- telemetry
- cloud calls from app code
- hosted services
- paid features

Tasks:

1. Update docs after Open VSX publish

Update:
- README.md
- docs/open-vsx-publishing.md
- docs/release-checklist.md

Change status from:
- “prepared, not yet published”

To:
- “published on Open VSX”

Add:
- Open VSX extension link placeholder if exact URL is not known
- install instructions
- verification checklist
- note that GitHub release VSIX remains available

Do not claim Visual Studio Marketplace availability yet.

2. Create Marketplace publishing docs

Create:
- docs/vscode-marketplace-publishing.md

Include:
- prerequisites
- Visual Studio Marketplace publisher account
- Azure DevOps Personal Access Token requirement
- GitHub secret name: VSCE_TOKEN
- local dry run
- local publish
- GitHub Actions manual publish
- rollback/unpublish notes
- verification checklist
- limitations
- security notes

3. Add Marketplace workflow

Create:
- .github/workflows/publish-vscode-marketplace.yml

Trigger:
- workflow_dispatch only

Inputs:
- version:
  - required: false
  - type: string
- dry_run:
  - required: true
  - default: true
  - type: boolean

Permissions:
- contents: read

Jobs:
- build-test-package:
  - checkout
  - setup node
  - setup pnpm 11.5.2
  - pnpm install --frozen-lockfile
  - pnpm check:extension-metadata
  - pnpm build
  - pnpm test
  - pnpm package:vscode
  - pnpm package:vscode:inspect
  - upload VSIX artifact

- publish-vscode-marketplace:
  - needs build-test-package
  - runs only when inputs.dry_run == false
  - requires VSCE_TOKEN
  - downloads VSIX artifact
  - publishes using vsce
  - never echoes token
  - clear error if token is missing or suspiciously short

- dry-run-summary:
  - runs when inputs.dry_run == true
  - confirms nothing was published

4. Add scripts

Add root scripts:
- publish:vscode:dry-run
- publish:vscode:local

Local dry run should:
- run metadata check
- build
- test
- package VSIX
- inspect VSIX

Local publish should:
- require VSCE_TOKEN env var
- refuse if missing or suspiciously short
- publish the VSIX with vsce

5. Add local helper script

Create:
- scripts/publish-vscode-marketplace.mjs

Behavior:
- supports dry run and publish mode
- does not hardcode token
- reads VSCE_TOKEN from environment for publish mode
- runs:
  - pnpm check:extension-metadata
  - pnpm build
  - pnpm test
  - pnpm package:vscode
  - pnpm package:vscode:inspect
- publishes only if not dry-run

6. Update release checklist

Update:
- docs/release-checklist.md

Add Marketplace section:
- dry run
- add VSCE_TOKEN
- manual publish
- verify Marketplace page
- smoke install
- rollback

7. Security constraints

- Never echo VSCE_TOKEN.
- Do not use pull_request triggers.
- Do not use pull_request_target.
- Do not grant contents: write.
- Do not publish from forks.
- Do not add telemetry.
- Do not add app network calls.
- Keep workflow_dispatch only.

8. Acceptance criteria

- pnpm build passes.
- pnpm test passes.
- pnpm package:vscode passes.
- pnpm package:vscode:inspect passes.
- pnpm check:extension-metadata passes.
- publish-vscode-marketplace.yml is workflow_dispatch only.
- dry_run defaults to true.
- publish job is gated behind inputs.dry_run == false.
- token is never hardcoded.
- docs explain Marketplace publishing accurately.
- README says Open VSX is published.
- README does not claim Marketplace is published.
- no telemetry or cloud calls are introduced.

After implementation, print:
1. Files changed.
2. Workflow added.
3. Scripts added.
4. Required GitHub secret.
5. Dry-run instructions.
6. Publish instructions.
7. Remaining TODOs.
:::

Once Marketplace is done, your next high-impact phase should be **v0.1.1 polish**: add an icon, screenshots/GIF, example reports, and a better landing section in the README.