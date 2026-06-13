You are a senior TypeScript monorepo engineer, VS Code extension maintainer, marketplace listing designer, and open-source product polish engineer.

Project: Workspace Model Advisor
Repo root: TCalc

Current state:

* Extension is published on VS Code Marketplace.
* Extension is published on Open VSX.
* GitHub release + VSIX exist.
* CLI works.
* MCP server works.
* CI/release workflows work.
* No telemetry.
* No cloud calls.
* Local-first product.

Your task:
Implement Phase 11: v0.1.1 marketplace polish and first-run experience.

Main goals:

1. Add a polished extension icon.
2. Improve README and Marketplace/Open VSX presentation.
3. Add screenshots/GIF placeholders or docs-ready image slots.
4. Add first-run onboarding inside the extension.
5. Prepare v0.1.1 release notes.

Do not add:

* telemetry
* cloud calls
* paid features
* hosted services
* account/login flows
* marketplace auto-publish changes

Tasks:

1. Add extension icon

Use the generated modern clean logo as the base.

Create:

* apps/vscode-extension/media/icon.png

Requirements:

* 128×128 PNG
* readable at small size
* no text inside the icon
* clean contrast on light and dark marketplace UIs

Update:

* apps/vscode-extension/package.json

Add:

* "icon": "media/icon.png"

Update metadata validator:

* scripts/check-extension-metadata.mjs should verify icon exists if declared.

2. Add screenshots and demo assets

Create:

* docs/assets/screenshots/
* docs/assets/screenshots/dashboard.png
* docs/assets/screenshots/model-comparison.png
* docs/assets/screenshots/repo-map.png
* docs/assets/screenshots/agent-rules.png
* docs/assets/screenshots/mcp.png

If actual screenshots are not available yet, add clear placeholders and document how to replace them.

Update:

* README.md
* apps/vscode-extension/README.md if present

Add sections:

* Quick preview
* Dashboard screenshot
* Repo map screenshot
* Model comparison screenshot
* MCP usage screenshot

3. Add first-run onboarding

In the VS Code extension:

* On first activation or first command run, show a non-intrusive welcome message.
* Do not show repeatedly.
* Store state in extension globalState or workspaceState.
* Message options:

  * Scan Workspace
  * View Docs
  * Dismiss

Command:

* workspaceModelAdvisor.showWelcome

Add command title:

* Workspace Model Advisor: Show Welcome

Welcome content should explain:

* local-first
* no telemetry
* scan workspace
* compare models
* generate repo map
* generate agent rules

4. Add quickstart command

Add command:

* workspaceModelAdvisor.quickStart

Title:

* Workspace Model Advisor: Quick Start

Behavior:

* Opens a Markdown document or Webview with:

  * Step 1: Scan Workspace
  * Step 2: Set Goal
  * Step 3: Compare Models
  * Step 4: Generate Repo Map
  * Step 5: Generate Agent Rules
  * Step 6: Export Report

Keep this local and static.

5. Update package manifest

Add commands:

* showWelcome
* quickStart

Ensure:

* contributes.commands includes both.
* activation events are correct.
* package still passes metadata check.
* icon is packaged into VSIX.

6. Improve README top section

Add:

* hero title
* short tagline
* badges:

  * Marketplace
  * Open VSX
  * GitHub release
  * CI
  * license
* install links:

  * VS Code Marketplace
  * Open VSX
  * GitHub VSIX
* trust banner:

  * Local-first
  * No telemetry
  * No cloud calls
  * No source upload

7. Add v0.1.1 changelog

Update:

* CHANGELOG.md

Add:

## 0.1.1

* Added extension icon
* Added first-run onboarding
* Added quickstart command
* Improved Marketplace/Open VSX README
* Added screenshot placeholders/docs
* No telemetry/no cloud calls retained

8. Tests

Add tests if applicable:

* metadata validator catches missing icon if declared
* welcome state logic helper, if extracted
* package inspection confirms media/icon.png exists

9. Verification

Run:

* pnpm build
* pnpm test
* pnpm check:extension-metadata
* pnpm package:vscode
* pnpm package:vscode:inspect

Acceptance criteria:

* build passes
* tests pass
* icon appears in extension package
* metadata check passes
* VSIX inspect passes
* README has Marketplace and Open VSX install links
* first-run welcome appears only once
* quickstart command works
* no telemetry/cloud calls introduced

After implementation, print:

1. Files changed.
2. New commands added.
3. Icon path.
4. README sections updated.
5. Tests added.
6. Release checklist for v0.1.1.
