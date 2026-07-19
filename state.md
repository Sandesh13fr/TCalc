# TCalc Repository Audit — 2026-07-17

## 1. Executive Summary

**Overall health: 58/100.** TCalc has a coherent local-first architecture, a useful shared TypeScript core, broad unit coverage, deterministic fixture smoke tests, and buildable CLI, VS Code, and JetBrains artifacts. The current working tree is **not release-ready**.

- **Strongest components:** TypeScript build/type safety, the scanner/recommender/repo-map package separation, CLI fixture smoke coverage, MCP tool tests, least-privilege GitHub workflow permissions, and local-only application code.
- **Weakest components:** integration/UX verification, input and path boundary enforcement, cross-interface parity, release-version consistency, and JetBrains implementation maturity.
- **Most serious risk:** the JetBrains “Generate Agent Rules” action can overwrite `AGENTS.md` twice and finally replace the generated rules with the CLI's one-line status message (`apps/jetbrains-plugin/src/main/kotlin/com/tcalc/plugin/actions/GenerateAgentRulesAction.kt:18-26`, `apps/cli/src/index.ts:125-134`). This is a user-data-loss defect.
- **Immediate action:** block a public release; fix the JetBrains overwrite path, remove the invalid plugin descriptor DOCTYPE, restore a valid VSIX packaging path, fix MCP report/path behavior, and make lint plus plugin verification hard release gates.

The repository is promising but currently better described as a tested TypeScript core with partially verified editor integrations than as a production-ready multi-interface product.

## 2. Verified Current State

- The repository is a `pnpm@11.5.2` TypeScript monorepo with 12 workspace projects: the root, two pnpm applications, and nine shared packages. The JetBrains Gradle project is outside the pnpm workspace.
- Applications are the CLI, VS Code extension, and JetBrains plugin. Shared packages are `core`, `scanner`, `tokenizers`, `model-catalog`, `recommender`, `repo-map`, `reports`, `agent-rules`, and `mcp-server`.
- Root and VS Code versions are `0.1.1`; CLI, MCP, shared packages, and JetBrains plugin report `0.1.0`. Local tags include `v0.1.0` and `v0.1.1`.
- `pnpm build`, `pnpm test`, and `pnpm typecheck` passed. Vitest executed 30 files and 230 tests with zero skipped tests.
- `pnpm lint` failed because ESLint 10.4.1 could not find a flat `eslint.config.*` file.
- `pnpm package:vscode` failed on the current README's SVG image. `pnpm package:vscode:inspect` passed only by inspecting a pre-existing June 2026 VSIX, not a newly built artifact.
- The JetBrains plugin ZIP built, but Plugin Verifier rejected it because `plugin.xml` contains a disallowed DOCTYPE. Gradle's `test` task reported `NO-SOURCE`.
- The source scan found no application network client or telemetry implementation. The automated no-telemetry guard passed, but it examines only `apps/**/*.ts`, not shared packages, JavaScript scripts, or Kotlin.
- The model catalog has 9 models from 4 providers. Its catalog and model dates are `2026-06-09`, 38 days before this audit. There is no live update automation.
- CLI help exposes `scan`, `recommend`, `repo-map`, `rules`, `report`, `mcp`, `catalog`, and `mcp-config`; the binary name is `wma`; `wma --version` prints `0.1.0`.
- The VS Code manifest contributes 12 commands and all 12 are registered. No VS Code Extension Host tests exist.
- The MCP server registers 6 tools, 2 resources, and 1 prompt over stdio. Seven MCP test files passed as part of the suite.
- Six GitHub Actions workflows exist: CI, JetBrains build, Release, TCalc report, VS Code Marketplace publishing, and Open VSX publishing.
- The working tree already contained user changes and generated/untracked directories. This audit intentionally does not treat those as source implementation.

## 3. Unverified Claims

- VS Code commands were not exercised in a real Extension Development Host; visual styling, cancellation, command UX, and filesystem prompts are source-reviewed only.
- JetBrains `runIde`, a sandbox IDE session, real tool-window interaction, and manual installation were not run. No JetBrains UX claim is verified.
- VS Code Marketplace, Open VSX, GitHub Release, and JetBrains Marketplace publishing were not executed.
- Model prices, benchmark scores, provider availability, and context-window values were not checked against the internet, per audit scope.
- Cross-platform behavior was not manually tested on Linux or macOS. GitHub workflows target Ubuntu; this audit ran locally on Windows.
- Large-repository performance, symlink cycles, permission-denied trees, binary-content detection, and cancellation under load have no dedicated end-to-end test.
- The “local-first” behavior is supported by source inspection, but the no-telemetry script alone does not prove the whole repository is network-free.
- Existing VSIX files do not prove the current source can be packaged; both predate the latest commit and current packaging failed.

## 4. Build and Test Results

| Command | Result | Evidence | Notes |
| ------- | ------ | -------- | ----- |
| `pnpm install --frozen-lockfile` | Pass, exit 0, 0.8 s measured | Lockfile accepted; workspace already current | Emitted `ERR_PNPM_META_FETCH_FAIL` while checking pnpm metadata in the restricted network environment. |
| `pnpm build` | Pass, exit 0, 6.6 s | 11/12 pnpm projects built | Includes CLI, MCP, and VS Code; does not build the Gradle project. |
| `pnpm test` | Pass, exit 0, 5.6 s | 30 files, 230 tests, 0 skipped | No flaky test was observed in this single run. |
| `pnpm lint` | **Fail**, exit 2, 2.8 s | `ESLint couldn't find an eslint.config.(js\|mjs\|cjs) file.` | Root uses `eslint: latest`; lint is not usable with the resolved ESLint 10.4.1. |
| `pnpm typecheck` | Pass, exit 0, 4.8 s | All 11 pnpm projects passed | Not run by the main CI workflow. |
| `pnpm ci` | **Fail / wrong command**, exit 1, 73.5 s | pnpm interpreted `ci` as its clean-install alias, removed modules, then failed fetching packages | Exact error included `EACCES`/fetch failure. The package script must be invoked as `pnpm run ci`; documentation using `pnpm ci` is ambiguous and unsafe. Dependencies were subsequently restored from the pnpm store. |
| `pnpm run ci` | **Fail**, exit 1, 13.9 s | Build, 230 tests, fixture scan passed; VSIX packaging failed | Exact error: `SVGs are restricted in README.md; please use other file image formats, such as PNG: https://github.com/Sandesh13fr/TCalc/raw/HEAD/assets/readme/hero.svg`. |
| `pnpm ci:smoke` | Pass, exit 0, 3.7 s | Help, scan table/JSON, repo map, and report smoke checks passed | Warned that fixture-local `catalogs/models.json` and `.tcalc/models.json` were absent. |
| `pnpm scan:fixtures` | Pass, exit 0, 1.4 s | 14 total/included files, 1,097 estimated tokens | Exercises only the small Node fixture. |
| `pnpm ci:workspace-report` | Pass, exit 0, 3.1 s | Created report, repo-map, and recommendation artifacts in `dist-ci` | Generated-output test, not schema validation. |
| `pnpm check:extension-metadata` | Pass with warning, exit 0, 1.2 s | 12 commands and activation events; required assets/catalogs found | Warned that category `Other` is weak metadata. |
| `pnpm package:vscode` | **Fail**, exit 1, 3.5 s | Same SVG restriction as `pnpm run ci` | Current VS Code release path is blocked. |
| `pnpm package:vscode:inspect` | Pass, exit 0, 1.0 s | Inspected `dist-vsix/tcalc-0.1.1.vsix`, 39 files | False reassurance: this artifact is dated 2026-06-13 and was not produced by the failed packaging run. |
| `node scripts/check-no-telemetry.mjs` | Pass, exit 0, 0.3 s | `No suspicious patterns found in source files.` | Scope is only `apps/**/*.ts`; shared packages and Kotlin are omitted. |
| `node scripts/smoke-cli.mjs` | Pass, exit 0, 2.1 s | Same CLI smoke paths as `ci:smoke` | Does not cover recommend, catalog, rules, MCP, or MCP config. |
| `gradlew clean buildPlugin` | Pass, 27 s | Produced `tcalc-jetbrains-0.1.0.zip` | Warned Java 17 is incompatible with IntelliJ 2024.3's Java 21 requirement and the Gradle IntelliJ plugin is outdated. |
| `gradlew test` | No tests, task pass, 29 s | `compileTestKotlin NO-SOURCE`, `test NO-SOURCE` | This is not evidence of JetBrains behavior. |
| `gradlew verifyPlugin` | **Fail**, 3 m 47 s | Plugin Verifier 1.409 rejected the ZIP | Exact error: `Invalid plugin descriptor 'plugin.xml'... DOCTYPE is disallowed when the feature "http://apache.org/xml/features/disallow-doctype-decl" set to true.` |

Packages with no meaningful tests include `@wma/core` (placeholder-level coverage) and the VS Code extension; the JetBrains app has no tests at all. There are no editor-host integration tests. The tokenizers package has one test file. CLI and MCP have 7 test files each; repo-map has 6; the remaining packages have 1–2 each.

## 5. Architecture Inventory

| Component | Role | Direct internal dependencies | Entry/binary |
| --- | --- | --- | --- |
| `apps/cli` | User-facing command line | All nine packages | `wma` → `dist/index.js` |
| `apps/vscode-extension` | VS Code commands/webviews | All packages except MCP | Extension host `dist/extension.js` |
| `apps/jetbrains-plugin` | IntelliJ wrapper around CLI | External `node` + built CLI path | Plugin ZIP; no standalone binary |
| `packages/core` | Shared types/config | None | Library |
| `packages/scanner` | Filesystem traversal/classification | core, `ignore` | Library |
| `packages/tokenizers` | Heuristic token estimation | core | Library; declared by CLI/VS Code but not used by scanner |
| `packages/model-catalog` | Catalog loading/validation | core | Library |
| `packages/recommender` | Ranking and cost estimates | core, model-catalog | Library |
| `packages/repo-map` | Important files, symbols, routes, formatting | core | Library |
| `packages/reports` | Markdown/JSON reports | core | Library |
| `packages/agent-rules` | Agent instruction generation | core | Library |
| `packages/mcp-server` | Stdio MCP adapter | all feature packages except tokenizers; MCP SDK and Zod | `wma-mcp`/server entry |

The dependency direction is generally clean: applications compose shared libraries and libraries mostly depend on core types. Notable architectural duplication is token estimation in `packages/scanner/src/scanWorkspace.ts:195-205` instead of the tokenizers package. Catalog resolution, workspace configuration, and MCP-config generation are independently reimplemented across interfaces, causing observed drift.

Workflow inventory:

- `ci.yml`: install, build, tests/fixture scan, CLI smoke, VSIX package, no-telemetry, extension metadata. It omits lint and typecheck.
- `jetbrains-build.yml`: Java 17 build, verifier, tests, archive upload. The verifier currently fails.
- `release.yml`: tag/manual draft GitHub release with VSIX. It does not gate on lint, typecheck, no-telemetry, CLI smoke, JetBrains, or version/tag consistency.
- `publish-vscode-marketplace.yml` and `publish-open-vsx.yml`: manual dry-run-by-default build/test/package and secret-gated publish jobs.
- `tcalc-report.yml`: PR/manual report generation with read-only default permission and comments restricted to same-repository PRs.

## 6. Capability Matrix

| Capability | CLI | VS Code | MCP | JetBrains |
| --- | --- | --- | --- | --- |
| Workspace scan | Implemented; fixture-smoked | Implemented; no host test; cosmetic cancellation | Implemented; several accepted options ignored | CLI wrapper exists; output not displayed by tool window |
| Model recommendation | Implemented; weak value validation | Implemented; source-reviewed only | Implemented; default catalog path is wrong | CLI wrapper exists; no parsed model UI |
| Repo map | Markdown/JSON, symbols option | Writes fixed Markdown file | Markdown/compact JSON | Action writes CLI stdout; no overwrite guard |
| Agent rules | 8 targets, 10 internal modes; non-TTY overwrite bug | 3 targets, 5 modes | 3 targets; mode-name mismatch | **Destructive double-write defect** |
| Report | Markdown/JSON; optional embedded map | Markdown only; references saved map | `includeRepoMap` corrupts/duplicates output | Action writes fixed Markdown file |
| Catalog validate/update | Validate command | Validate only; “update” admits live update is absent | No catalog-management tool | No catalog UI |
| MCP server | `wma mcp` | No embedded server | Native stdio server | No server; delegates to CLI only |
| MCP config | 4 targets; workspace option ignored | Cursor/Continue work; Claude Desktop/Generic label mapping fails | Not applicable | Not implemented |
| Quickstart/onboarding | Help text | Welcome and Quick Start commands | One prompt | Settings/tool-window documentation only |
| Automated interface integration | CLI smoke | None | Handler/unit tests; no recorded stdio session smoke | None |

No interface has full parity. The TypeScript library layer supports more agent-rule targets/modes than either VS Code or MCP, and JetBrains exposes buttons without a functioning result-rendering layer.

## 7. Subsystem Assessments

### Workspace scanner — Needs hardening

- **Evidence/status:** Functional on the small fixture; asynchronous reads are limited to concurrency 10 (`packages/scanner/src/scanWorkspace.ts:21-24`).
- **Strengths:** Gitignore-family support, file/language/folder summaries, size caps, risk flags, no source bodies in normal results.
- **Defects:** traversal uses `stat` and follows symlinks without a visited set or root-containment check (`scanWorkspace.ts:52-79`); errors are silently swallowed; files up to 5 MB are fully read before >500 KB exclusion; secret checks inspect only the first 4,096 characters; binary detection is extension-only; config excludes are not applied by callers. Generated suffix detection is broken because `path.extname("x.min.js")` returns `.js`, while the set contains `.min.js` (`classifyFile.ts:60,108-109`). Folder totals include excluded tokens and can exceed dashboard denominators.
- **Missing tests:** symlink loop/escape, inaccessible paths, nonexistent root, binary contents, secrets after 4 KB, huge trees, cancellation.
- **Recommendation:** use `lstat`/realpath containment and a visited set, surface warnings, stream/sample large files, centralize ignore/config behavior, and add abort/max-file controls.

### Token estimation — Functional but inconsistent

- **Evidence/status:** Heuristic estimates run and the fixture reports 1,097 tokens.
- **Strengths:** deterministic, local, cheap, language-aware approximations.
- **Defects:** duplicate estimators exist in scanner and tokenizers; there is no provider/model-specific tokenizer; `LanguageBreakdown.percentage` is represented both as 0–1 and 0–100; zero-byte estimation behavior differs between text and byte APIs.
- **Missing tests:** accuracy corpora, Unicode/minified/generated inputs, cross-implementation equivalence.
- **Recommendation:** make tokenizers the single implementation, document error bounds, and use one percentage unit.

### Model catalog — Usable seed data, weak trust boundary

- **Evidence/status:** 9 models, 4 providers, updated 2026-06-09; validation command exists.
- **Strengths:** bundled JSON, workspace override concept, local models, basic pricing/context metadata.
- **Defects:** loader uses synchronous I/O and unchecked type casts; parse/missing failures degrade to an empty catalog; validation misses duplicate IDs, invalid dates/types/enums, score bounds, NaN, and staleness. VS Code's “Update Model Catalog” does not update it.
- **Missing tests:** malformed field types, duplicates, stale dates, malicious/partial overrides, merge semantics.
- **Recommendation:** add runtime schema validation with explicit errors and a signed/reviewed update process or rename the UI command to Validate.

### Recommendation engine — Deterministic but semantically unsafe at edges

- **Evidence/status:** package tests pass; scoring uses quality/cost/context/latency/privacy weights.
- **Strengths:** transparent reasons, cost/session estimates, three named tiers, overflow warnings.
- **Defects:** local-first excludes only `cloud`, allowing `hybrid` (`recommendModels.ts:58`); cached input is added to full input, apparently double-counting cost (`:68-73`); expected output is omitted from context fit; an overflowing model can be labeled “cheapest sufficient”; empty candidates crash at `cheapestSufficient.model.id` (`:128`); de-duplication can make tier labels stop matching their selection rule.
- **Missing tests:** empty catalog/all-filtered models, exact ties, output-induced overflow, negative/NaN budgets, cache-cost semantics.
- **Recommendation:** define invariants for privacy, context, and tiers; return a typed no-candidate result; validate numeric inputs; test those invariants.

### Repo map — Useful heuristic map, inaccurate budgeting

- **Evidence/status:** CLI smoke and six test files pass; TS/JS/Python regex symbol extraction and Next/Express route hints exist.
- **Strengths:** budget option, normalized paths, Markdown/JSON, no full source-body output, symbol limits.
- **Defects:** not AST/Tree-sitter based; nested monorepo entry/config detection is incomplete; selection starts from included files, making dedicated risky/large/generated sections normally empty. Budget estimation counts source token totals rather than emitted metadata, double-counts categories, and does not accurately measure symbols/imports/routes. Markdown fields are not escaped, allowing filename/symbol prompt or formatting injection.
- **Missing tests:** empty/minimal repo, hostile names, deep monorepo, strict final-output budget, unsupported languages.
- **Recommendation:** budget the serialized output, escape untrusted fields, preserve excluded classifications, and clarify parser coverage.

### Agent rules — Broad core support, unsafe adapters

- **Evidence/status:** core generation tests pass for 8 targets and 10 modes.
- **Strengths:** source-free summaries and useful token/model context; target-specific filenames.
- **Defects:** Codex target emits `.codexrules` rather than the repository-standard `AGENTS.md`; CLI help and MCP advertise `ask-before-reading-large-files` while core expects `ask-before-large-files`; interfaces expose different subsets. CLI writes automatically in non-TTY mode even without `--yes`. JetBrains then overwrites the generated file with the status stdout.
- **Missing tests:** existing-file protection, non-TTY behavior, every target/mode, cross-interface schema parity, JetBrains action.
- **Recommendation:** make generation pure and writing explicit/atomic, require overwrite consent everywhere, and export one shared enum/schema.

### Reports — Basic formats work; schemas diverge

- **Evidence/status:** CLI Markdown/JSON and fixture workspace report pass.
- **Strengths:** compact summaries, risk paths without bodies, optional CLI repo map.
- **Defects:** null recommendation is represented as `{}` via `as any`; exported report types do not match actual JSON; Markdown is unescaped. VS Code promises HTML but exports Markdown only. MCP `includeRepoMap` imports but never calls `createRepoMap`; it appends a second JSON report and can produce invalid JSON (`packages/mcp-server/src/tools/generateReportTool.ts:61-74`).
- **Missing tests:** JSON schema snapshots, hostile paths, MCP include-map output validity, VS Code export behavior.
- **Recommendation:** define/version one report schema and share composition code across all adapters.

### CLI — Strongest interface, not yet production-safe

- **Evidence/status:** build/help/scan/repo-map/report smoke paths pass.
- **Strengths:** clear command layout, stdout/stderr separation in most output paths, file-output options, no shell construction.
- **Defects:** hard-coded version `0.1.0`; unvalidated enum/numeric options; missing paths silently scan as empty; scanner config and excludes are ignored; `mcp-config --workspace` is ignored and its installed default command path assumes the source monorepo; rule overwrites are unsafe. Smoke coverage omits half the commands.
- **Recommendation:** centralize validated Commander options/config resolution, fail on invalid roots, and add end-to-end command tests.

### VS Code extension — Source-complete shell, UX unverified

- **Evidence/status:** all 12 manifest commands register and TypeScript builds; no VS Code API tests.
- **Strengths:** nonce-based dashboard script, message allowlist, HTML escaping, local resource roots disabled.
- **Defects:** cancellation is checked only after the scan; first workspace folder only; dashboard inline CSS conflicts with CSP `style-src ${webview.cspSource}` (`dashboardPanel.ts:90-93`); model comparison enables scripts but has no CSP (`compareModelsCommand.ts:19,88-94`). MCP target lowercasing turns “Claude Desktop” and “Generic MCP” into unsupported values (`generateMcpConfigCommand.ts:86-106`). Quick Start promises HTML and embedded content that export does not provide.
- **Recommendation:** add Extension Host tests, CSP tests, cancellable scanner APIs, and reuse shared MCP-config/catalog/report services.

### MCP server — Good schema start, unsafe defaults and broken composition

- **Evidence/status:** 6 tools/2 resources/1 prompt; seven test files pass.
- **Strengths:** stdio transport, Zod parsing, no shell execution, no source bodies intentionally returned.
- **Defects:** `isWithinAllowedPath` exists but is not enforced; any process-readable root and external catalog path can be requested. Default catalog path is `<cwd>/catalog.json`, not `catalogs/models.json` (`recommendModelsTool.ts:32-45`). Scan accepts goal/privacy/maxFiles/tokenBudget but ignores them. Report include-map is broken. Absolute paths are returned and global “latest” state is shared in-process.
- **Recommendation:** enforce an explicit allowed root, contain realpaths and catalog overrides, remove or implement ignored fields, and add a real stdio protocol smoke test.

## 8. Security and Privacy Findings

### Critical

None confirmed.

### High

- **JetBrains agent-rules data loss:** a non-TTY CLI call writes `AGENTS.md` without `--yes`, then the action overwrites that file with `result.stdout`. No existing-file confirmation or backup exists. Fix before any user distribution.

### Medium

- **MCP filesystem boundary is unenforced:** `isWithinAllowedPath` is dead code. A connected MCP client can request any path readable by the process; scan/map/report responses disclose absolute paths and repository metadata. Source bodies are not intentionally returned, limiting impact.
- **Symlink traversal/availability:** scanner follows directory symlinks using `stat`, with no cycle detection or realpath containment. This permits root escape and potentially unbounded recursion when scanning untrusted trees.
- **Webview CSP gaps:** dashboard CSS is likely blocked by its own CSP; comparison webview has no CSP and unnecessarily enables scripts. Current escaping reduces immediate exploitability, but the boundary is brittle.
- **Untrusted Markdown injection:** repo maps and reports interpolate paths, symbols, imports, and routes without Markdown escaping. A repository can inject misleading instructions into content intended for coding agents.
- **Silent destructive writes:** JetBrains report/map actions and several fixed-path VS Code/CLI flows lack consistent existing-file confirmation and atomic writes.

### Low

- The no-telemetry guard scans only TypeScript under `apps`, so it can miss network code in shared packages, `.mjs`, dependencies, or Kotlin.
- Catalog overrides are weakly validated, allowing bad numeric/type data to poison estimates or crash edge paths.
- The MCP server retains latest scan/recommendation/map state globally. Stdio normally limits exposure, but long-lived multiplexed use could cross logical sessions.
- Full command paths and workspace paths are logged/returned by editor adapters; these can disclose local usernames/layout in logs or reports.

### Informational

- No application HTTP client, telemetry SDK, shell-string execution, or dynamic arbitrary command feature was found in source. JetBrains uses `ProcessBuilder(List<String>)`, which avoids shell interpolation.
- Generated rules/reports/maps intentionally contain paths and metadata, not full file bodies. Secret detection is heuristic and must not be marketed as a data-loss-prevention guarantee.
- Local-first/no-telemetry claims are broadly defensible for current first-party runtime code, provided they mean “TCalc itself does not upload source.” User-selected cloud models/clients and package/build tooling are outside that claim.

## 9. CI/CD and Supply-Chain Findings

- Workflow top-level permissions are appropriately narrow: CI/report/JetBrains/publish workflows use `contents: read`; Release uses `contents: write` to create a draft release. PR commenting is restricted to trusted same-repository PRs.
- Marketplace workflows are manual, dry-run by default, and gate secret use in separate jobs. No publish was performed, so token validity and publisher ownership remain unverified.
- Actions are pinned to mutable major tags (`@v4`, `@v7`, `@v2`) rather than commit SHAs. Pin SHAs for stronger supply-chain control.
- `pnpm-lock.yaml` contains integrity hashes and frozen installs pass, but every root development dependency is specified as `latest`. That already broke lint after resolving ESLint 10. Pin intentional ranges/exact versions and update deliberately.
- No Dependabot configuration was found. Changesets is installed but version consistency is not enforced across the monorepo.
- Main CI does not run `pnpm lint` or `pnpm typecheck`. Release omits those gates plus no-telemetry, CLI smoke, fixture scan, and JetBrains verification.
- The JetBrains workflow is guaranteed to fail verification until the DOCTYPE is removed. It also configures JDK 17 while IntelliJ 2024.3 requires Java 21.
- VSIX packaging is currently blocked by the SVG README. The inspector can pass against a stale file because it selects an existing glob result and does not require freshness, expected version, icon, license, or changelog.
- Release accepts a manual tag without validating it against root, CLI, extension, MCP, or JetBrains versions. Current versions are already split between 0.1.1 and 0.1.0.
- `pnpm ci` collides with pnpm's built-in clean-install command. CI workflows call explicit steps and are unaffected, but local release documentation/scripts should use `pnpm run ci` or rename the script.

## 10. Documentation Drift

- Commands documented as `pnpm ci` invoke pnpm's built-in clean install, not the root script. Use `pnpm run ci` or rename it.
- CLI help advertises `ask-before-reading-large-files`; core expects `ask-before-large-files`. MCP repeats the incompatible name.
- VS Code Quick Start says reports can be Markdown or HTML and include repo map/agent rules; the command exports Markdown only and does not embed agent rules.
- Quick Start references `.cursor/rules/` and mislabels `.clinerules` as Claude Code behavior; generation actually uses `.cursorrules` and `CLAUDE.md`.
- “Update Model Catalog” is only validation and explicitly reports that live updates are not implemented.
- JetBrains documentation/plugin description claims a useful scan/recommendation tool window, but the panel discards CLI results and displays no parsed output.
- The claimed ignore file `.workspace-model-advisorignore` does not exist in implementation; supported files include `.tcalcignore`, `.gitignore`, `.cursorignore`, `.aiderignore`, and `.continueignore`.
- The Codex target's `.codexrules` output conflicts with this repository's own `AGENTS.md` convention.
- Version references are inconsistent: root/VS Code are 0.1.1 while the CLI help, packages, MCP, and JetBrains artifact are 0.1.0.
- README SVGs render on GitHub but are rejected by VSCE when referenced from the packaged extension README; docs need a GitHub-safe and Marketplace-safe asset strategy.

## 11. JetBrains Plugin Readiness

- **Source implementation:** Partial. Settings, actions, tool window, CLI runner, and plugin metadata exist. Process arguments are safely passed as a list. However, work is scheduled with `SwingUtilities.invokeLater` and then blocks on the CLI, freezing the EDT (`WmaToolWindowPanel.kt:104-117`). Results are discarded, no JSON model is rendered, process pipes are read only after `waitFor` (deadlock risk), and writes lack safe overwrite handling.
- **Gradle build:** Pass. `clean buildPlugin` produced a 44,166-byte `tcalc-jetbrains-0.1.0.zip` in 27 seconds. Warnings include outdated IntelliJ Gradle plugin 2.2.1 and Java 17 versus required Java 21.
- **Plugin verification:** Fail. Verifier rejected the archive because `apps/jetbrains-plugin/src/main/resources/META-INF/plugin.xml:2` contains a DOCTYPE declaration.
- **Sandbox test:** Not run. `runIde` was not launched; verifier failure and missing automated behavior tests make a GUI session premature.
- **Manual IDE test:** Not run. Installation, settings persistence, tool-window rendering, cancellation, error UX, and action overwrites remain unverified.
- **Marketplace readiness:** No. Invalid descriptor, failed verifier, narrow `sinceBuild=243`/`untilBuild=243.*` support, Java mismatch, version lag, zero tests, destructive rules action, and incomplete UX are blockers.

## 12. Technical Debt Register

| ID | Area | Finding | Severity | Effort | Recommended fix |
| -- | ---- | ------- | -------- | ------ | --------------- |
| TD-01 | JetBrains | Rules action destroys/overwrites `AGENTS.md` | High | S | Return content without CLI write; preview, confirm, atomic write |
| TD-02 | JetBrains | Plugin descriptor DOCTYPE makes ZIP invalid | High | S | Remove DOCTYPE and re-run verifier |
| TD-03 | Packaging | SVG README blocks VSIX creation | High | S | Use Marketplace-compatible PNG/GIF or package-specific README |
| TD-04 | MCP | `includeRepoMap` appends duplicate report/invalid JSON | High | S | Call repo-map formatter and schema-test both formats |
| TD-05 | MCP | Allowed-root helper is not enforced | Medium | M | Realpath-contain all roots and catalog paths |
| TD-06 | Scanner | Symlink cycles/root escape and silent I/O errors | Medium | M | `lstat`, visited realpaths, containment, warnings |
| TD-07 | Tooling | ESLint 10 with no flat config | High | S | Add flat config or pin supported ESLint; gate CI |
| TD-08 | Versions | 0.1.0/0.1.1 drift across artifacts | Medium | S | Single version source and tag validation |
| TD-09 | Recommender | Empty candidates crash; tier/privacy semantics drift | Medium | M | Typed no-result and invariant tests |
| TD-10 | VS Code | No Extension Host tests | Medium | M | Add activation/command/webview integration suite |
| TD-11 | JetBrains | EDT blocking, pipe deadlock, output discarded | High | M | Background task, concurrent stream drains, parsed result UI |
| TD-12 | Reports | JSON schema uses `{}`/`as any`; interfaces diverge | Medium | M | Shared versioned schema and contract tests |
| TD-13 | Repo map | Budget does not measure serialized output | Medium | M | Count final emission and enforce hard budget |
| TD-14 | Agent rules | Target/mode enums duplicated and contradictory | Medium | S | Export shared runtime schema/options |
| TD-15 | CLI | Invalid paths/options silently degrade | Medium | S | Commander choices, finite positive numbers, root existence errors |
| TD-16 | Catalog | Weak runtime validation and no update path | Medium | M | Zod/JSON schema, freshness policy, explicit errors |
| TD-17 | Supply chain | Mutable action tags, `latest` deps, no update automation | Medium | S | Pin actions/deps and configure dependency updates |
| TD-18 | Privacy guard | Scans only `apps/**/*.ts` | Low | S | Cover packages, scripts, Kotlin, and dependency allowlist |
| TD-19 | Tokenizers | Duplicate implementation and inconsistent percentages | Low | M | Consolidate package and normalize types |
| TD-20 | Generated files | `.idea`, JetBrains `bin`/`.intellijPlatform`, and temporary local pnpm stores can be generated without ignore coverage | Low | S | Extend `.gitignore`; keep artifacts out of commits |

## 13. Prioritized Action Plan

### P0 — Release blockers

1. Make JetBrains rule generation non-destructive: remove implicit CLI writes, preview generated content, require explicit overwrite approval, and add an existing-file regression test.
2. Remove the plugin XML DOCTYPE, move the toolchain to Java 21, then require `buildPlugin`, `test`, and `verifyPlugin` to pass.
3. Replace/package the README SVG so a fresh `pnpm package:vscode` succeeds; make inspection reject stale or wrong-version VSIX files.
4. Restore lint with a pinned compatible ESLint configuration and add lint/typecheck to CI and release gates.
5. Fix MCP `includeRepoMap`, default catalog resolution, and allowed-root enforcement; add valid JSON/Markdown protocol tests.

### P1 — Next release

1. Unify versioning across root, CLI, packages, MCP, VS Code, JetBrains, artifacts, and tags.
2. Validate all CLI/MCP enum, numeric, path, and catalog inputs; return explicit no-candidate errors.
3. Add VS Code Extension Host tests and JetBrains background-task/action tests.
4. Fix dashboard/comparison CSP, scanner cancellation, and MCP-config target mapping.
5. Repair scanner symlink handling, generated detection, config excludes, and surfaced warnings.
6. Correct documentation to match real filenames, formats, commands, and implemented update behavior.

### P2 — Product improvements

1. Version a shared report/config schema and remove adapter duplication.
2. Consolidate token estimation and document accuracy bounds.
3. Make repo-map budgeting measure final serialized output and expand language/monorepo support.
4. Strengthen catalog validation and establish a reviewed freshness/update process.
5. Expand CLI/MCP fixture smoke tests to every command/tool and hostile edge inputs.

### P3 — Future work

1. Provider-specific optional tokenizers with offline fallbacks.
2. AST-based symbol/route extraction for more languages.
3. Performance benchmarks for large repositories and incremental/cached scanning.
4. Broader JetBrains build compatibility after the 2024.3 implementation is stable.

## 14. Recommended Next Version

- **Proposed version:** `0.1.2`
- **Release theme:** “Safety and release-integrity stabilization.”
- **Exact scope:** P0 items plus version unification, input validation, truthful docs, VS Code activation/command smoke tests, and JetBrains action regression tests.
- **Exclusions:** new model providers, provider-specific tokenizers, new repo-map languages, cloud catalog updates, new agent targets, or visual feature expansion.
- **Acceptance criteria:**
  - Frozen install, build, 230+ tests, lint, typecheck, fixture scan, CLI smoke, no-telemetry, extension metadata, fresh VSIX package/inspection, JetBrains build/test/verifier all exit successfully from a clean checkout.
  - No `NO-SOURCE` editor claim is counted as a test; VS Code host and JetBrains action tests cover activation/result display/error/overwrite paths.
  - Existing `AGENTS.md`, reports, and repo maps are never overwritten without explicit confirmation.
  - MCP report output parses as valid JSON when JSON is requested, contains a real repo map when requested, and cannot scan outside its configured root.
  - All public artifacts and `--version` output report `0.1.2`; release automation rejects mismatches and stale artifacts.
  - Documentation examples execute exactly as written and make no HTML/live-update/IDE-UX claims beyond tested behavior.

## 15. Final Verdict

- **Is the VS Code extension production-ready?** **No.** It builds and registers its commands, but fresh packaging currently fails, there are no Extension Host tests, and CSP/config/export defects remain.
- **Is the CLI production-ready?** **Not yet.** It is the most mature interface and smoke tests pass, but unsafe non-TTY overwrites, weak validation, config omissions, version drift, and broken lint/release gates prevent a production recommendation.
- **Is the MCP server production-ready?** **No.** Its test base is useful, but path boundaries, default catalogs, ignored inputs, and invalid include-map report composition are material correctness/security defects.
- **Is the JetBrains plugin ready for users?** **No.** The archive builds but is invalid under Plugin Verifier, has no tests or IDE validation, blocks the UI thread, discards results, and contains a user-data-loss bug.
- **Are local-first/no-telemetry claims defensible?** **Mostly, with precise wording.** First-party runtime source contains no observed network/telemetry client and processing is local, but the automated guard is incomplete and generated metadata can be passed by users to external AI clients. Do not claim secret-proofing or that build/package tooling is offline.
- **Is the repository ready for the next public release?** **No.** Complete P0, run the full clean acceptance suite, manually verify both editor integrations, and publish only newly generated version-consistent artifacts.
