You are a senior software architect, TypeScript monorepo maintainer, VS Code extension auditor, IntelliJ Platform plugin auditor, MCP security reviewer, CI/CD engineer, and open-source release reviewer.

Project: Workspace Model Advisor / TCalc

Your task is to perform a comprehensive, evidence-based audit of the repository’s current state.

This is a READ-ONLY audit.

Do not:

* modify files
* install new dependencies unless required to run an existing documented command
* auto-fix issues
* rewrite configuration
* commit changes
* publish packages or extensions
* rotate or inspect secret values
* trigger production publishing workflows
* make network calls from application code
* trust previous completion summaries without verifying them

You may:

* inspect files
* inspect Git history
* run existing build, test, lint, packaging, smoke, and verification commands
* run safe local CLI commands against fixtures
* inspect generated artifacts
* inspect workflow YAML
* inspect package manifests and lockfiles
* compare documentation with implementation
* identify missing or stale files
* recommend fixes without applying them

## Known claimed state to verify

The repository is claimed to contain:

### Applications

* VS Code extension
* CLI application
* JetBrains plugin

### Shared packages

* core
* scanner
* tokenizers
* model-catalog
* recommender
* reports
* agent-rules
* repo-map
* MCP server

### Claimed capabilities

* local workspace scanning
* ignore-file support
* token estimation
* model-cost estimation
* three-tier model recommendations
* workspace goal selection
* code-aware repo maps
* Tree-sitter or equivalent symbol extraction
* agent rule generation
* Markdown and JSON reports
* CLI commands
* stdio MCP server
* VS Code dashboard and commands
* JetBrains CLI-wrapper plugin
* VSIX packaging
* GitHub releases
* Open VSX publishing
* Visual Studio Marketplace publishing
* GitHub Actions CI and release workflows
* no telemetry
* no application cloud calls
* local-first privacy

Treat all of these as claims, not facts.

## Primary audit objectives

Determine:

1. What is actually implemented?
2. What is implemented but incomplete?
3. What is implemented but untested?
4. What exists only in documentation?
5. What is broken or stale?
6. What differs across the VS Code extension, CLI, MCP server, and JetBrains plugin?
7. What security or privacy claims are not fully enforced?
8. What release and publishing claims can be verified?
9. What should be fixed before the next release?
10. What should be deferred?

---

# Phase A — Repository inventory

Inspect the entire repository structure.

Report:

* root files
* apps/*
* packages/*
* catalogs/*
* presets/*
* examples/*
* fixtures/*
* scripts/*
* docs/*
* .github/workflows/*
* release and packaging outputs, if present
* untracked/generated files that should or should not be committed

For every app and package, identify:

* package name
* version
* language
* build command
* test command
* public exports
* internal dependencies
* runtime dependencies
* dev dependencies
* entry point
* binary command, if any
* whether it is included in the workspace
* whether it is actually used by another package/app
* whether it is documented

Produce a dependency map showing:

* which apps depend on which packages
* any circular dependencies
* packages that are orphaned
* duplicated logic across apps
* VS Code or IntelliJ APIs leaking into shared core packages

---

# Phase B — Baseline command verification

Identify the package manager and exact pinned version.

Run the existing documented commands where available:

* pnpm install --frozen-lockfile
* pnpm build
* pnpm test
* pnpm lint
* pnpm typecheck
* pnpm ci
* pnpm ci:smoke
* pnpm scan:fixtures
* pnpm ci:workspace-report
* pnpm check:extension-metadata
* pnpm package:vscode
* pnpm package:vscode:inspect
* node scripts/check-no-telemetry.mjs
* node scripts/smoke-cli.mjs

Do not invent missing scripts.

For each command, report:

* exists or missing
* exit code
* duration if easily available
* warnings
* failures
* packages affected
* whether the command matches the documentation

Record:

* total test files
* total tests
* skipped tests
* flaky tests if observed
* packages with no tests
* apps with no integration tests

Do not describe a command as passing unless you actually ran it successfully.

---

# Phase C — Core product capability audit

Audit each capability separately.

## 1. Workspace scanner

Verify:

* asynchronous filesystem usage
* concurrency limiting
* cancellation support
* unreadable-file handling
* symlink handling
* large-file handling
* binary detection
* generated-file detection
* lockfile handling
* extension/language classification
* risk and secret detection
* path normalization across Windows/macOS/Linux

Verify ignore support for:

* .gitignore
* .cursorignore
* .aiderignore
* .continueignore
* .workspace-model-advisorignore
* custom excludes
* hard-coded generated folders

Check for:

* contradictory classifications
* inconsistent file-size thresholds
* path traversal risks
* recursive symlink loops
* workspace-root escaping
* blocking synchronous operations

## 2. Token estimation

Verify:

* heuristic formula
* extension multipliers
* empty-file behavior
* whitespace-heavy behavior
* Unicode behavior
* min/max bounds
* model-specific tokenizers, if claimed
* confidence or estimation metadata
* tests for representative file types

Compare documentation claims with actual implementation.

## 3. Model catalog

Verify:

* catalog schema
* model count
* provider count
* current fields
* context-window fields
* pricing fields
* cached-token fields
* benchmark fields
* reasoningScore support
* validation behavior
* fallback resolution
* bundled catalog resolution
* workspace override behavior
* stale-date detection
* duplicate model IDs
* invalid numeric values
* zero-cost/local model handling

Do not verify pricing against the internet in this audit unless explicitly instructed. Report catalog freshness dates and whether update automation exists.

## 4. Recommendation engine

Verify:

* scoring formula
* score weights
* context safety margin
* task/goal profiles
* output-token defaults
* privacy-mode filtering
* cost calculation
* cached input handling
* session estimates
* overflow behavior
* recommendation deduplication
* single-model behavior
* no-fitting-model behavior
* deterministic ordering

Confirm that the returned tiers are truly:

* cheapest sufficient
* balanced
* high-confidence

Identify cases where the labels do not match the algorithm.

## 5. Repo map

Verify:

* basic structural map
* budget handling
* important-file detection
* symbol extraction
* import extraction
* route detection
* supported languages
* failure fallback
* generated/risky/large-file exclusion
* full source bodies are never emitted
* max symbol and parse limits
* --no-symbols behavior
* Windows path behavior
* Markdown formatting
* JSON formatting if supported

Test against at least:

* existing small fixture
* repository root
* empty/minimal fixture if available

## 6. Agent rules

Verify:

* supported targets in core package
* targets exposed in VS Code
* targets exposed in CLI
* targets exposed in MCP
* optimization modes
* generated filenames
* generated content
* overwrite safeguards
* no secrets/file contents included
* consistency across interfaces

Create a matrix:

| Target | Package | VS Code | CLI | MCP | Tests |
| ------ | ------- | ------- | --- | --- | ----- |

## 7. Reports

Verify:

* Markdown report
* JSON report
* null recommendation behavior
* repo-map integration
* risky-file redaction
* deterministic output
* report schema stability
* extension export
* CLI export
* MCP report output

---

# Phase D — VS Code extension audit

Inspect:

* apps/vscode-extension/package.json
* activation events
* contributed commands
* contributed configuration
* command registration
* webview implementation
* CSP and nonce handling
* message validation
* local resource URIs
* extension state
* catalog asset resolution
* bundled icon/assets
* README/CHANGELOG/LICENSE inclusion
* VSIX files allowlist
* .vscodeignore
* package scripts
* metadata validator

Build a command matrix:

| Command ID | Manifest | Registered | Implemented | Dashboard button | Tested |
| ---------- | -------- | ---------- | ----------- | ---------------- | ------ |

Verify all claimed commands, including:

* scan workspace
* open dashboard
* export report
* set workspace goal
* compare models
* generate agent rules
* update model catalog
* open settings
* generate repo map
* onboarding/quickstart commands if present
* MCP config generation if present

Audit webview security:

* strict CSP
* nonce usage
* no remote scripts
* no unsafe inline script
* HTML escaping
* message command allowlist
* no arbitrary filesystem writes
* no source content leakage

Audit packaging:

* package VSIX
* inspect VSIX contents
* verify runtime catalogs
* verify icon
* verify README
* verify CHANGELOG
* verify LICENSE
* verify compiled entry point
* report VSIX size

Audit testing:

* unit tests
* Extension Development Host tests
* integration tests
* commands tested through real VS Code APIs
* untested UI flows

Clearly distinguish between unit-tested and manually/integration-tested behavior.

---

# Phase E — CLI audit

Inspect all CLI commands and their help output.

Verify:

* wma --help
* wma --version
* wma scan
* wma recommend
* wma repo-map
* wma rules
* wma report
* wma catalog validate
* wma mcp
* wma mcp-config if present

For each command, verify:

* required arguments
* defaults
* option validation
* JSON-only stdout behavior
* warnings on stderr
* exit codes
* invalid path handling
* invalid catalog handling
* overwrite behavior
* non-interactive behavior
* Windows path behavior
* output-file behavior

Build a CLI command matrix:

| Command | Implemented | Help | Tests | Smoke-tested | Known gaps |
| ------- | ----------- | ---- | ----- | ------------ | ---------- |

Verify `bin` configuration and shebang.

---

# Phase F — MCP server audit

Inspect:

* package manifest
* executable
* stdio transport
* server registration
* tools
* resources
* prompts
* input schemas
* in-memory state
* error handling
* stdout/stderr discipline

Verify claimed MCP tools:

* scan_workspace
* recommend_models
* create_repo_map
* generate_agent_rules
* generate_report
* validate_model_catalog

Verify claimed resources:

* workspace://summary
* model-catalog://models

Verify claimed prompts:

* optimize_coding_agent_for_workspace

Create a matrix:

| MCP primitive | Registered | Handler | Schema | Tests | Security reviewed |
| ------------- | ---------- | ------- | ------ | ----- | ----------------- |

Security checks:

* no arbitrary command execution
* no shell interpolation
* no network calls
* no source body exposure
* risky files returned by path only
* root path validation
* compact outputs
* invalid input handling
* stdio stdout contains protocol messages only
* diagnostics go to stderr

Try at least one local MCP smoke test if an existing safe test command exists.

---

# Phase G — JetBrains plugin audit

The JetBrains plugin has not yet been manually validated. Treat it as experimental until verified.

Inspect:

* Gradle wrapper
* Gradle version
* IntelliJ Platform Gradle Plugin version
* Kotlin version
* Java toolchain
* target IDE/version
* plugin.xml
* plugin ID
* compatibility range
* dependencies
* tool window registration
* actions
* settings
* icons
* CLI runner
* JSON parsing
* docs
* CI workflow

Verify CLI runner safety:

* arguments passed as a list
* no shell command construction
* no arbitrary command text
* Node path validation
* CLI path validation
* timeout handling
* process cancellation
* stderr handling
* workspace path quoting
* Windows compatibility

Attempt:

* ./gradlew tasks
* ./gradlew clean buildPlugin
* ./gradlew verifyPlugin if configured
* ./gradlew test if tests exist

Do not mark the plugin as working merely because TypeScript tests pass.

Report separately:

* build status
* plugin ZIP status
* verifier status
* automated Kotlin test status
* sandbox run status
* manual IDE test status
* Marketplace readiness

If `runIde` cannot be completed, explicitly classify the JetBrains plugin as:

* implemented but unverified
* partially verified
* or verified

State the evidence for the classification.

---

# Phase H — CI/CD and workflow security audit

Inspect every `.github/workflows/*.yml` file.

Create a workflow matrix:

| Workflow | Triggers | Permissions | Secrets | Artifacts | Publish capability |
| -------- | -------- | ----------- | ------- | --------- | ------------------ |

Verify:

* action versions
* least-privilege permissions
* fork PR handling
* pull_request_target absence unless justified
* secret exposure risks
* untrusted input interpolation
* shell quoting
* artifact retention
* workflow concurrency
* workflow_dispatch gates
* dry-run defaults
* publish-job gates
* release draft behavior
* Marketplace/Open VSX secret separation
* VSIX inspection before publish
* metadata validation before publish
* JetBrains build workflow status

Check whether third-party actions are pinned only to major tags or immutable commit SHAs. Report this as a supply-chain consideration, not automatically as a defect.

Audit existing no-telemetry checks:

* directories scanned
* extensions scanned
* false negatives
* whether scripts, workflows, Kotlin, and Gradle files are included
* whether the check only catches obvious string patterns

Do not claim “no network calls” solely because a grep script passes.

---

# Phase I — Release and publishing audit

Verify repository evidence for:

* GitHub release
* VSIX asset
* Open VSX publication metadata in docs/config
* VS Code Marketplace publication metadata in docs/config
* extension version consistency
* root version consistency
* changelog consistency
* release tags
* current manifest version
* Marketplace/Open VSX badges
* install links
* publisher IDs
* repository URLs
* icon presence

Do not perform a publish.

Where publication cannot be verified from local repository evidence, label it:

* externally claimed, not locally verifiable

Check whether:

* current source version matches published version
* unreleased changes exist after the published version
* changelog has an Unreleased section
* release workflow would overwrite or duplicate an existing version
* Open VSX and Marketplace workflows use the correct secrets

---

# Phase J — Documentation audit

Compare implementation against:

* README.md
* apps/vscode-extension/README.md
* JetBrains README
* CLI docs
* MCP docs
* installation docs
* release checklist
* Open VSX docs
* Marketplace docs
* CI reporter docs
* security policy
* contributing guide
* changelog

Identify:

* stale claims
* missing commands
* wrong paths
* obsolete test counts
* obsolete package counts
* “coming soon” features that now exist
* “published” claims lacking links
* features documented but missing
* implemented features undocumented
* invalid command examples
* platform-specific instructions
* duplicated/conflicting documentation

---

# Phase K — Privacy and security audit

Verify the local-first and no-telemetry claims.

Search application code for:

* fetch
* axios
* undici
* XMLHttpRequest
* WebSocket
* http/https clients
* analytics
* telemetry
* App Insights
* Sentry
* PostHog
* Segment
* remote image/script URLs
* child_process
* ProcessBuilder
* Runtime.exec
* shell execution
* secret/environment logging

Classify every match:

* required local functionality
* documentation-only
* build/publish tooling
* test-only
* application runtime
* suspicious/unexplained

Review:

* secret scanning behavior
* content preview handling
* report redaction
* MCP output redaction
* logs
* error messages
* generated files
* path disclosure
* symlink/path traversal
* subprocess argument safety
* Webview CSP
* GitHub Actions secrets

Provide a threat model covering:

* malicious workspace files
* huge repositories
* symlink attacks
* poisoned model catalogs
* command injection
* Webview message injection
* MCP client misuse
* untrusted PR workflows
* malicious generated output paths

---

# Phase L — Cross-interface parity audit

Create one final feature matrix:

| Capability | Core package | VS Code | CLI | MCP | JetBrains | Tests |
| ---------- | ------------ | ------- | --- | --- | --------- | ----- |

Include:

* scan workspace
* set goal
* token estimate
* model recommendation
* cost simulation
* compare models
* repo map
* code-aware symbols
* no-symbols mode
* agent rules
* reports
* JSON output
* catalog validation
* MCP config generation
* settings
* cancellation/progress
* overwrite confirmation
* privacy mode

Highlight mismatches.

---

# Phase M — Quality classification

Classify every major subsystem as exactly one:

* Production-ready
* Release-ready with minor gaps
* Functional but insufficiently tested
* Experimental
* Stub/documentation only
* Broken
* Not present

Subsystems:

* scanner
* tokenizer
* model catalog
* recommender
* reports
* repo map
* agent rules
* VS Code extension
* CLI
* MCP server
* JetBrains plugin
* GitHub Actions
* release automation
* documentation
* security/privacy enforcement

Every classification must include supporting evidence.

---

# Required final report format

Produce the audit report in this exact structure:

## 1. Executive Summary

Include:

* overall health score out of 100
* release-readiness assessment
* strongest components
* weakest components
* most serious risk
* recommended immediate action

## 2. Verified Current State

List only facts confirmed from code or successfully executed commands.

## 3. Unverified Claims

List claims that could not be confirmed.

## 4. Build and Test Results

Table:

| Command | Result | Evidence | Notes |
| ------- | ------ | -------- | ----- |

## 5. Architecture Inventory

Include apps, packages, dependencies, binaries, and workflows.

## 6. Capability Matrix

Use the cross-interface matrix described above.

## 7. Subsystem Assessments

One section for each major subsystem with:

* status
* evidence
* strengths
* defects
* missing tests
* recommendation

## 8. Security and Privacy Findings

Separate findings into:

* Critical
* High
* Medium
* Low
* Informational

Do not inflate severity.

## 9. CI/CD and Supply-Chain Findings

Include workflow permissions, secrets, action pinning, release gates, and package integrity.

## 10. Documentation Drift

List stale, missing, or contradictory documentation.

## 11. JetBrains Plugin Readiness

Explicitly distinguish:

* source implementation
* Gradle build
* plugin verification
* sandbox test
* manual IDE test
* Marketplace readiness

## 12. Technical Debt Register

Table:

| ID | Area | Finding | Severity | Effort | Recommended fix |
| -- | ---- | ------- | -------- | ------ | --------------- |

## 13. Prioritized Action Plan

### P0 — Release blockers

Only genuine blockers.

### P1 — Next release

Important fixes for the next version.

### P2 — Product improvements

Non-blocking improvements.

### P3 — Future work

Long-term ideas.

## 14. Recommended Next Version

State:

* proposed version number
* release theme
* exact scope
* exclusions
* acceptance criteria

## 15. Final Verdict

Answer directly:

* Is the VS Code extension production-ready?
* Is the CLI production-ready?
* Is the MCP server production-ready?
* Is the JetBrains plugin ready for users?
* Are local-first/no-telemetry claims defensible?
* Is the repository ready for the next public release?

## Audit integrity rules

* Never claim a test passed unless it was executed.
* Never claim a feature exists because a README mentions it.
* Never count generated files as source implementation.
* Never mark JetBrains UX as verified without a sandbox or real IDE run.
* Never mark Marketplace publishing as verified from workflow files alone.
* Separate code quality from product readiness.
* Separate automated tests from manual UX validation.
* Quote exact file paths and line numbers for important findings when possible.
* Include exact error messages for failed commands.
* Avoid vague recommendations.
* Do not change any files during this audit.
