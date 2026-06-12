# TCalc — Repository Instructions

## Project Name

**TCalc**

## Product Summary

TCalc is a local-first IDE extension and developer tool that scans a code workspace, estimates token usage, compares AI coding models by context limit and pricing, and recommends the cheapest sufficient model for the current development goal.

The project should help developers answer:

* How large is my workspace in tokens?
* Which files or folders are wasting context?
* Which model is sufficient for this task?
* What will this coding-agent session likely cost?
* How can I optimize agent behavior to reduce token burn?
* What should I keep, exclude, summarize, or compress after a milestone is complete?

The tool must rely primarily on free and open-source infrastructure. The default behavior must be local-first and privacy-preserving.

---

## Core Principles

1. **Local-first by default**

   * Do not upload workspace code to any external service by default.
   * All scanning, token estimation, repo mapping, and optimization reports should run locally.
   * External model-provider APIs may be supported only through user-provided keys.

2. **Open-source infrastructure**

   * Prefer OSS libraries and free developer infrastructure.
   * Avoid proprietary backend dependency for the core product.
   * The extension must remain useful without a paid account.

3. **BYOK-friendly**

   * Users should be able to bring their own OpenAI, Anthropic, Google, OpenRouter, LiteLLM, Ollama, or local model setup.
   * The project should not proxy user code through a paid hosted backend unless the user explicitly opts in.

4. **Model-neutral**

   * Do not hardcode one provider as “best.”
   * Compare models by context window, pricing, output cost, cached-token cost, coding benchmarks, latency, privacy mode, and task fit.

5. **Goal-aware recommendations**

   * Model recommendations must consider the workspace motive:

     * MVP build
     * Refactor
     * Debugging
     * Migration
     * Test generation
     * Documentation
     * Security review
     * Architecture planning
     * Cleanup after milestone completion

6. **Cost clarity**

   * Always show estimated input tokens, output tokens, cached tokens, and total estimated cost.
   * Show cheapest sufficient, balanced, and high-confidence recommendations.

7. **Token optimization first**

   * The extension should not only say “use a bigger model.”
   * It should first suggest repo maps, ignores, summaries, compression, patch-only workflows, prompt caching, and agent rules.

---

## Primary User Personas

### Solo Developer

Wants to use AI coding agents without accidentally wasting API credits.

### Open-source Maintainer

Wants contributors to use AI agents safely and cheaply inside the repository.

### Small Startup Team

Wants a shared model policy for devs: when to use cheap models, when to upgrade, and when to use local models.

### AI Coding Power User

Uses Cursor, Claude Code, Codex, Cline, Roo, Continue, Aider, or VS Code Copilot Chat and wants better context control.

---

## MVP Scope

The first MVP should focus on these features:

1. Workspace scan
2. Ignore-aware file discovery
3. Token estimate per file and folder
4. Language breakdown
5. Generated/large-file detection
6. Secret-risk warning
7. Model catalog JSON
8. Simple model fit calculator
9. Cost simulator
10. Goal selector
11. Cheapest / balanced / high-confidence recommendation
12. Agent rule generator
13. Exportable Markdown/JSON report

Do not build cloud sync, team dashboards, accounts, payments, or hosted analytics in the first MVP.

---

## Recommended Tech Stack

### Language

* TypeScript

### Package Manager

* pnpm

### Repo Style

* Monorepo

### IDE Extension

* VS Code extension first
* Open VSX-compatible publishing later

### UI

* VS Code Webview
* Command Palette commands
* Optional sidebar view

### Tokenization

Use pluggable tokenizer adapters:

* OpenAI-compatible tokenizer
* Claude/Gemini approximate tokenizer
* Local heuristic fallback
* Provider token-count API adapter where available

### Code Parsing

Use Tree-sitter where possible for:

* Symbol extraction
* Function/class map
* Import/dependency graph
* Repo map generation

### Local Storage

Use SQLite or simple JSON cache for MVP.

### Optional Local Model Support

Support Ollama through local endpoint configuration.

### Optional Provider Gateway

Support LiteLLM as an optional self-hosted model gateway.

### Optional Agent Integration

Expose an MCP server package so coding agents can call:

* `scan_workspace`
* `estimate_model_cost`
* `recommend_model`
* `generate_agent_rules`
* `create_repo_map`
* `explain_context_overflow`

---

## Main Product Modules

### 1. Workspace Scanner

Responsible for finding files and collecting metadata.

Must support:

* `.gitignore`
* `.cursorignore`
* `.aiderignore`
* `.continueignore`
* `.tcalcignore`
* user-defined exclude patterns
* max file-size limits
* binary file detection
* generated-file detection
* lockfile detection
* build-output detection

Scanner output should include:

* file path
* file extension
* language
* size in bytes
* estimated tokens
* ignored or included status
* risk flags
* modified time
* reason for exclusion, if excluded

---

### 2. Token Estimator

Responsible for counting or estimating tokens.

Must support:

* file-level token estimate
* folder-level aggregation
* workspace total
* selected-context total
* model-specific token estimation where possible
* fallback estimation when tokenizer is unavailable

Token estimator must return confidence level:

* `exact`
* `provider-estimated`
* `tokenizer-estimated`
* `heuristic`

---

### 3. Model Catalog

A local JSON catalog of model metadata.

Each model entry should include:

```json
{
  "id": "provider/model-name",
  "displayName": "Model Name",
  "provider": "provider-name",
  "contextWindow": 128000,
  "maxOutputTokens": 8192,
  "inputPricePerMillion": 0,
  "cachedInputPricePerMillion": null,
  "outputPricePerMillion": 0,
  "supportsTools": true,
  "supportsImages": false,
  "supportsLocal": false,
  "codingScore": null,
  "reasoningScore": null,
  "latencyScore": null,
  "privacyMode": "cloud",
  "updatedAt": "YYYY-MM-DD"
}
```

The catalog must be editable by users.

The catalog should not require a remote server to work.

---

### 4. Goal / Workspace Motive System

The user should choose or write a goal before receiving final recommendations.

Supported motives:

* Build MVP
* Add feature
* Debug issue
* Refactor
* Migration
* Security review
* Test generation
* Documentation
* Architecture planning
* Cleanup after completion

Each motive should affect:

* expected context size
* expected output size
* model difficulty requirement
* recommended optimization strategy
* whether to prefer cheap, balanced, or high-confidence models

---

### 5. Recommendation Engine

The recommender should compute:

```txt
model_score =
  context_fit * 0.25
+ task_quality_fit * 0.30
+ cost_efficiency * 0.25
+ latency_fit * 0.10
+ privacy_fit * 0.10
```

The UI should show three model choices:

1. Cheapest sufficient
2. Balanced
3. High-confidence

Each recommendation must explain:

* why the model fits
* estimated cost
* overflow risk
* expected quality level
* when not to use it
* token optimization suggestions

---

### 6. Cost Simulator

The cost simulator should estimate:

* one prompt cost
* one agent run cost
* one milestone cost
* cost with full workspace
* cost with repo map
* cost with selected files only
* cost with prompt caching
* cost after milestone compaction

Formula:

```txt
estimated_cost =
  input_tokens * input_price
+ cached_input_tokens * cached_input_price
+ output_tokens * output_price
+ optional_tool_costs
```

All prices should be normalized to price per 1 million tokens.

---

### 7. Agent Optimizer

Generate agent-specific rule files.

Supported targets:

* Cursor
* Claude Code
* Codex-style agents
* Cline
* Roo
* Continue
* Aider
* Generic AGENTS.md

Optimization modes:

* Normal
* Concise
* Caveman-style
* Patch-only
* Test-first
* Plan-then-edit
* Repo-map-first
* Ask-before-reading-large-files
* No-full-file-dumps
* Use summaries after milestone completion

Generated rules should tell agents:

* what files to avoid
* when to ask before reading large files
* when to use diffs
* when to summarize instead of dumping content
* how to respect token budgets
* how to update repo summaries after major milestones

---

### 8. Repo Map Generator

The repo map should create a compact representation of the workspace.

Include:

* important files
* packages/apps
* entry points
* exported functions/classes
* API routes
* database schemas
* test locations
* config files
* dependency graph summary
* architecture notes

The repo map should be budgeted:

* 2K tokens
* 8K tokens
* 16K tokens
* 32K tokens
* custom budget

---

### 9. Reports

The extension should export:

* `workspace-model-report.md`
* `workspace-model-report.json`
* `repo-map.md`
* `agent-rules.md`
* `.tcalc.json`

The Markdown report should include:

* workspace token total
* largest token consumers
* ignored files
* model comparison table
* recommended model tier
* estimated cost
* optimization checklist
* next-step agent rules

---

## VS Code Commands

The extension should expose these commands:

```txt
TCalc: Scan Workspace
TCalc: Open Dashboard
TCalc: Set Workspace Goal
TCalc: Compare Models
TCalc: Generate Repo Map
TCalc: Generate Agent Rules
TCalc: Export Report
TCalc: Update Model Catalog
TCalc: Open Settings
```

---

## Suggested Configuration File

Create `.tcalc.json` at the repo root.

Example:

```json
{
  "defaultGoal": "build-mvp",
  "privacyMode": "local-first",
  "currency": "USD",
  "tokenBudget": {
    "defaultContextBudget": 64000,
    "maxFullWorkspaceScan": 1000000,
    "warnAt": 200000
  },
  "exclude": [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".next/**",
    "coverage/**",
    "package-lock.json",
    "pnpm-lock.yaml"
  ],
  "agentRules": {
    "defaultMode": "repo-map-first",
    "allowCavemanMode": true,
    "preferPatchOnly": false,
    "askBeforeLargeFileRead": true
  },
  "models": {
    "preferredProviders": ["openai", "anthropic", "google", "local"],
    "allowLocalModels": true,
    "allowCloudModels": true
  }
}
```

---

## Coding Standards

* Use TypeScript strict mode.
* Prefer small packages with clear boundaries.
* Core logic must not depend on VS Code APIs.
* The VS Code extension should call shared packages from `packages/*`.
* Keep provider-specific logic isolated.
* Keep pricing/model data separate from recommendation logic.
* Add tests for scanner, tokenizer, cost calculator, and recommender.
* Do not make network calls during normal workspace scanning.
* Do not send file contents to remote APIs unless explicitly enabled by the user.

---

## Privacy Requirements

The tool must:

* scan locally by default
* never upload code by default
* never log file contents
* never include secrets in reports
* warn before exporting reports that include file paths
* mask possible secrets
* allow users to disable telemetry completely
* make telemetry opt-in only, if telemetry is ever added

---

## Security Requirements

Detect and warn for:

* `.env`
* private keys
* access tokens
* service account files
* database dumps
* large logs
* generated folders
* dependency lockfiles
* build artifacts

The scanner should mark these as risky and excluded by default where appropriate.

---

## Testing Strategy

Required tests:

* ignore pattern handling
* file classification
* token estimation
* model cost calculation
* context overflow detection
* model ranking
* report generation
* generated-file detection
* secret-risk detection
* repo-map budget enforcement

Use fixture repositories for testing:

```txt
fixtures/
  small-node-app/
  nextjs-app/
  python-api/
  monorepo-sample/
  large-generated-files/
  secret-risk-sample/
```

---

## CLI Commands

The CLI should eventually support:

```bash
wma scan
wma estimate
wma recommend
wma repo-map
wma generate-rules
wma export-report
wma update-catalog
```

Example:

```bash
wma scan --goal refactor --budget 64000 --format markdown
```

---

## Build Scripts

Root scripts should include:

```json
{
  "scripts": {
    "dev": "pnpm -r dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "format": "prettier --write .",
    "package:vscode": "pnpm --filter @wma/vscode-extension package",
    "scan:fixtures": "pnpm --filter @wma/cli scan ./fixtures"
  }
}
```

---

## Release Strategy

### Phase 1

* Local VS Code extension
* Manual model catalog
* Token heatmap
* Markdown report

### Phase 2

* Model recommendation engine
* Agent rule generator
* Repo map generator
* CLI package

### Phase 3

* MCP server
* Open VSX publishing
* GitHub Action
* Community model catalog updates

### Phase 4

* Optional hosted catalog
* Team policy dashboard
* Sponsors/donation support
* Paid support for self-hosted teams

---

## Monetization Rules

The basic tool must remain free and open-source.

Allowed monetization:

* GitHub Sponsors
* optional paid hosted model-pricing catalog
* optional team dashboard
* paid support
* consulting
* private policy packs
* enterprise self-hosting help

Avoid:

* locking basic scanning behind payment
* forcing users through a proprietary backend
* charging for local token counting
* storing user source code on hosted infrastructure by default

---

## Definition of Done for MVP

The MVP is done when a user can:

1. Install the VS Code extension locally.
2. Run “Scan Workspace.”
3. See total workspace token estimate.
4. See top token-heavy folders/files.
5. Choose a workspace goal.
6. Compare at least 5 model entries from the local catalog.
7. Get cheapest, balanced, and high-confidence recommendations.
8. Generate an optimization report.
9. Generate at least one agent rule file.
10. Export a Markdown report without any cloud dependency.
