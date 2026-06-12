You are a senior TypeScript monorepo engineer, MCP server developer, and AI coding-tool integration engineer.

Project: TCalc
Repo root: TCalc

Current verified state:

* Build passes.
* Tests pass: 183 tests.
* VSIX packaging works.
* VSIX inspection passes.
* CLI works.
* VS Code extension works.
* Scanner works.
* Token estimator works.
* Model recommender works.
* Reports work.
* Agent rules work.
* Repo map works.
* Code-aware repo map symbol extraction works.
* CLI repo-map works with symbols.
* CLI repo-map works with --no-symbols.
* No cloud calls.
* No telemetry.

Your task:
Implement **Phase 7: MCP Server MVP**.

Main goal:
Create a local-first MCP server that exposes TCalc capabilities to AI coding agents through stdio transport.

Do not implement:

* hosted MCP server
* Streamable HTTP server
* authentication
* cloud calls
* telemetry
* live model pricing fetches
* payments
* marketplace publishing changes
* arbitrary shell command execution

Create package:

* packages/mcp-server

Package name:

* @tcalc/mcp-server

Executable:

* wma-mcp

Use:

* TypeScript
* @modelcontextprotocol/sdk
* zod if required by the SDK
* existing @wma packages
* stdio transport only for MVP

Security rules:

* Never upload source code.
* Never make network calls.
* Never execute shell commands.
* Never expose full source file bodies through MCP tools.
* Repo map must stay structural.
* Risky files must be listed by path only, never by content.
* Validate rootPath as a local filesystem path.
* Do not allow tool input to become a shell command.
* No telemetry.

Create MCP tools:

1. scan_workspace

Input:

* rootPath?: string
* goal?: WorkspaceGoal
* privacyMode?: "local-first" | "cloud-ok"
* maxFiles?: number
* tokenBudget?: number

Behavior:

* Default rootPath to process.cwd().
* Run scanner locally.
* Return compact JSON summary:

  * rootPath
  * totalFiles
  * includedFiles
  * excludedFiles
  * totalEstimatedTokens
  * topFiles
  * topFolders
  * languages
  * warnings
* Store latest scan result in memory.

2. recommend_models

Input:

* rootPath?: string
* goal?: WorkspaceGoal
* privacyMode?: "local-first" | "cloud-ok"
* catalogPath?: string
* tokenBudget?: number

Behavior:

* Scan workspace.
* Load catalog.
* Run recommender.
* Return:

  * cheapestSufficient
  * balanced
  * highConfidence
  * rejected models summary
  * assumptions
  * estimated 1-turn, 10-turn, and 50-turn costs
* Store latest recommendation in memory.

3. create_repo_map

Input:

* rootPath?: string
* goal?: WorkspaceGoal
* tokenBudget?: number
* enableSymbolExtraction?: boolean
* maxSymbols?: number
* format?: "markdown" | "json"

Behavior:

* Scan workspace.
* Generate repo map.
* Return Markdown or compact JSON.
* Never include full source bodies.
* Store latest repo map in memory.

4. generate_agent_rules

Input:

* rootPath?: string
* target: "generic" | "cursor" | "claude-code"
* mode: "normal" | "concise" | "patch-only" | "repo-map-first" | "ask-before-reading-large-files"
* goal?: WorkspaceGoal
* privacyMode?: "local-first" | "cloud-ok"

Behavior:

* Scan workspace.
* Recommend models.
* Generate agent rules.
* Return:

  * target
  * mode
  * suggestedFileName
  * content

5. generate_report

Input:

* rootPath?: string
* goal?: WorkspaceGoal
* privacyMode?: "local-first" | "cloud-ok"
* includeRepoMap?: boolean
* format?: "markdown" | "json"

Behavior:

* Scan workspace.
* Recommend models.
* Optionally generate repo map.
* Generate report.
* Return report content.
* Markdown and JSON formats must both work.

6. validate_model_catalog

Input:

* catalogPath?: string

Behavior:

* Validate model catalog.
* Return:

  * valid: boolean
  * modelCount
  * errors
* Invalid catalog should not crash server.

Create MCP resources:

1. workspace://summary

Behavior:

* Returns latest scan summary if available.
* If no scan has run, return a helpful message.

2. model-catalog://models

Behavior:

* Returns loaded model catalog summary.
* Do not expose secrets or API keys.

Create MCP prompt:

optimize_coding_agent_for_workspace

Arguments:

* goal
* tokenBudget
* privacyMode

Prompt output should instruct the coding agent to:

* scan the workspace first
* create a repo map
* avoid risky/generated/large files
* prefer targeted reads
* use patch-only output for code changes
* ask before reading large files
* recommend model tier before long work

State:

* Keep latest scan result in memory.
* Keep latest recommendation result in memory.
* Keep latest repo map in memory.
* Do not persist MCP state to disk in MVP.

Package structure:

packages/mcp-server/

* package.json
* tsconfig.json
* src/index.ts
* src/server.ts
* src/state.ts
* src/tools/scanWorkspaceTool.ts
* src/tools/recommendModelsTool.ts
* src/tools/createRepoMapTool.ts
* src/tools/generateAgentRulesTool.ts
* src/tools/generateReportTool.ts
* src/tools/validateModelCatalogTool.ts
* src/resources/workspaceSummaryResource.ts
* src/resources/modelCatalogResource.ts
* src/prompts/optimizeCodingAgentPrompt.ts
* src/utils/safeRootPath.ts
* src/utils/compactResults.ts

CLI integration:

Update apps/cli:

Add command:

* wma mcp

Behavior:

* Starts MCP server over stdio.
* No extra logs should be printed to stdout because stdio is used for MCP protocol.
* Warnings/errors should go to stderr only.

Also support direct binary:

* wma-mcp

Tests:

Add tests for tool handlers without requiring a live MCP client where practical.

Test files:

* packages/mcp-server/tests/scanWorkspaceTool.test.ts
* packages/mcp-server/tests/recommendModelsTool.test.ts
* packages/mcp-server/tests/createRepoMapTool.test.ts
* packages/mcp-server/tests/generateAgentRulesTool.test.ts
* packages/mcp-server/tests/generateReportTool.test.ts
* packages/mcp-server/tests/validateCatalogTool.test.ts
* packages/mcp-server/tests/security.test.ts

Test requirements:

* Use fixtures/small-node-app.
* Confirm scan_workspace returns compact summary.
* Confirm recommend_models returns three recommendation tiers when possible.
* Confirm create_repo_map supports markdown and json.
* Confirm create_repo_map does not include full source bodies.
* Confirm generate_agent_rules returns target, mode, suggested filename, and content.
* Confirm generate_report supports markdown and json.
* Confirm invalid catalog returns errors.
* Confirm invalid rootPath is handled safely.
* Confirm no shell execution utility is introduced.
* Confirm no network calls are introduced.

Docs:

Add:

* docs/mcp-server.md

Include:

* what the MCP server does
* how to run with `wma mcp`
* how to run with `wma-mcp`
* example MCP client config using stdio
* list of tools
* list of resources
* list of prompts
* privacy statement
* security limitations
* MVP limitations

README:

* Add MCP Server section.
* Mark it experimental/MVP.

Acceptance criteria:

* pnpm build passes.
* pnpm test passes.
* existing 183 tests still pass.
* new MCP tests pass.
* pnpm --filter @tcalc/mcp-server build works.
* node packages/mcp-server/dist/index.js starts stdio server.
* node apps/cli/dist/index.js mcp starts stdio server.
* no cloud calls are introduced.
* no telemetry is introduced.
* no source file bodies are exposed by MCP tools.
* no shell execution is introduced.
* VSIX packaging still works.
* VSIX inspection still passes.
* CLI smoke tests still pass.

After implementation, print:

1. Summary of files changed.
2. Dependencies added.
3. MCP tools/resources/prompts added.
4. Tests added.
5. Example MCP client config.
6. Remaining TODOs.
7. Commands to run.
