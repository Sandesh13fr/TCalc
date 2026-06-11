You are a senior TypeScript monorepo engineer and VS Code extension developer.

Project: Workspace Model Advisor
Repo root: TCalc
Current state:

* pnpm monorepo
* 6 shared packages:

  * packages/core
  * packages/scanner
  * packages/tokenizers
  * packages/model-catalog
  * packages/recommender
  * packages/reports
* 1 VS Code extension:

  * apps/vscode-extension
* 91 tests passing
* Current extension commands:

  * Scan Workspace
  * Open Dashboard
  * Export Report
* Current dashboard:

  * summary cards
  * recommendation cards
  * top files/folders/languages
  * warnings
  * assumptions
  * export button
* No cloud calls
* Local-first architecture

Your task:
Perform Phase 2 stabilization and command completion. Do not add MCP, CLI, Tree-sitter, or hosted updates yet.

Main objective:
Make the existing extension reliable, package-safe, and more complete by fixing known issues and adding missing VS Code command scaffolding.

Critical rules:

* Preserve all existing tests.
* Add tests for every bug fix where practical.
* Keep core packages independent from VS Code APIs.
* Do not add telemetry.
* Do not add network calls.
* Do not upload source code.
* Do not overbuild UI.
* Keep implementation simple and maintainable.
* Run build/typecheck/tests after changes.

Fix these known issues:

1. Catalog path resolution is fragile.
   Current issue:

* Hardcoded relative paths like "../../catalogs" may break after VSIX packaging.

Expected fix:

* Resolve catalog paths using VS Code extension context.
* Prefer bundled extension catalog path first.
* Then allow workspace override at:

  * <workspaceRoot>/catalogs/models.json
  * <workspaceRoot>/.workspace-model-advisor/models.json
* If workspace catalog is invalid, fall back to bundled catalog and show a warning.
* Do not crash extension.

2. Broken root scan:fixtures script.
   Current issue:

* Root script references @wma/cli, but CLI package does not exist.

Expected fix:

* Either remove scan:fixtures for now or replace it with an existing package test/dev script.
* Do not create CLI in this phase.

3. Synchronous scanning blocks VS Code.
   Current issue:

* scanner uses readdirSync/statSync/readFileSync.

Expected fix:

* Convert scanner file walking and reading to async fs.promises APIs.
* Add a concurrency limit to avoid too many open files.
* Keep behavior compatible with existing tests.
* Add progress reporting in the VS Code scan command using vscode.window.withProgress.
* Allow cancellation if reasonable, but do not overcomplicate.

4. SVG classification conflict.
   Current issue:

* .svg is listed as both binary and language.

Expected fix:

* Treat SVG as text/XML-like by default unless file appears binary or too large.
* Keep SVG token estimation possible.
* Add a test.

5. Token heuristic underestimates.
   Current issue:

* estimateTokensHeuristic uses min(chars/4, words*1.3), causing underestimation.

Expected fix:

* Replace with a safer weighted estimate.
* Suggested:

  * charEstimate = ceil(chars / 4)
  * wordEstimate = ceil(words * 1.3)
  * tokenEstimate = max(charEstimate, wordEstimate)
  * apply extension-specific multipliers afterward
* Add tests for whitespace-heavy files, markdown, JSON, and code.

6. Markdown export null recommendation risk.
   Current issue:

* generateMarkdownReport receives null as any.

Expected fix:

* Make report generator accept RecommendationResult | null safely.
* If recommendation is missing, render a “Recommendations unavailable” section.
* Remove unsafe any.
* Add test.

7. Duplicate local/free model recommendations.
   Current issue:

* cheapest, balanced, and high-confidence may all select the same free local model.

Expected fix:

* Deduplicate tiers where possible.
* If same model wins multiple tiers, choose next-best distinct fitting model.
* If there are not enough distinct fitting models, allow duplication but display a reason.
* Add test.

8. Max file-size threshold mismatch.
   Current issue:

* ignore resolver caps at 10MB; scanSingleFile switches to byte-only at 5MB.

Expected fix:

* Create one shared config value:

  * maxTextFileBytes
  * maxScanFileBytes
* Use it consistently.
* Add tests.

Add missing VS Code commands as functional MVP commands:

Commands to implement:

* workspaceModelAdvisor.setWorkspaceGoal
* workspaceModelAdvisor.compareModels
* workspaceModelAdvisor.generateAgentRules
* workspaceModelAdvisor.updateModelCatalog
* workspaceModelAdvisor.openSettings

Command behavior:

A. Set Workspace Goal

* Show quick pick with the 10 existing goals from wma.defaultGoal.
* Save selected goal to workspace configuration.
* Re-run recommendation if latest scan exists.
* Refresh/open dashboard.

B. Compare Models

* If no scan exists, ask user to scan first.
* Show a model comparison Webview or dashboard section using current scan.
* Include:

  * model name
  * provider
  * context window
  * input/output cost
  * estimated one-turn cost
  * estimated 10-turn session cost
  * fit/rejected reason

C. Generate Agent Rules

* For this phase, create a minimal implementation inside a new package:

  * packages/agent-rules
* Generate rules for:

  * generic AGENTS.md
  * Cursor rules
  * Claude Code CLAUDE.md
* Use existing types if already defined.
* Include optimization modes:

  * normal
  * concise
  * patch-only
  * repo-map-first
  * ask-before-reading-large-files
* Command should ask target via quick pick.
* Command should ask mode via quick pick.
* Write generated file to workspace root after confirmation.
* Do not implement every agent yet.

D. Update Model Catalog

* Since no network calls are allowed, do not fetch live data.
* Implement as:

  * validate current catalog
  * reload from workspace override if present
  * show result summary
* Add message: “Live catalog updates are not implemented yet.”

E. Open Settings

* Open VS Code settings filtered to Workspace Model Advisor settings.

Update package.json:

* Register all new commands under contributes.commands.
* Add activation events if required by current VS Code target.
* Ensure command titles are clean:

  * Workspace Model Advisor: Set Workspace Goal
  * Workspace Model Advisor: Compare Models
  * Workspace Model Advisor: Generate Agent Rules
  * Workspace Model Advisor: Update Model Catalog
  * Workspace Model Advisor: Open Settings

Webview improvements:

* Keep existing dashboard.
* Add buttons:

  * Re-scan Workspace
  * Change Goal
  * Compare Models
  * Generate Agent Rules
  * Export Markdown Report
* Use secure message passing between webview and extension.
* Keep CSP with nonce.
* Do not load external scripts/styles.
* Use asWebviewUri for local resources if any are loaded.

Add tests:

* agent-rules generation tests
* JSON report tests
* async scanner behavior where practical
* catalog fallback/path tests if feasible without VS Code dependency
* token heuristic tests
* duplicate recommendation tests
* null recommendation report test
* SVG classification test

Acceptance criteria:

* pnpm build passes.
* pnpm test passes.
* Existing 91 tests still pass.
* New tests are added.
* VS Code extension launches.
* All commands appear in Command Palette.
* Scan command still works.
* Dashboard still opens.
* Goal can be changed.
* Model comparison can be opened.
* Agent rules can be generated.
* Markdown export works.
* No cloud/network calls are introduced.
* No telemetry is introduced.

After implementation:
Print:

1. Summary of files changed.
2. Tests added.
3. Commands added.
4. Known remaining TODOs.
5. Exact commands to run:

   * pnpm install
   * pnpm build
   * pnpm test
   * how to launch extension in VS Code Extension Development Host.
