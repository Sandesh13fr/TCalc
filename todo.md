# TCalc TODO

Source: project status and roadmap dated 17 July 2026.

## P0 - Release blockers

- [x] Prevent destructive JetBrains `AGENTS.md` writes: generate first, preview, confirm overwrite, and write safely.
- [x] Fix the JetBrains descriptor and Java toolchain; pass build, tests, and Plugin Verifier.
- [x] Restore fresh VSIX packaging and make inspection reject stale/wrong-version artifacts.
- [x] Restore lint and typecheck as CI/release gates.
- [x] Fix MCP boundaries and correctness: enforce allowed roots, catalog resolution, repo-map report composition, and accepted options.

## P1 - Next-release stabilization

- [x] Use one version source and validate tags/artifacts against it.
- [x] Validate CLI/MCP enums, numbers, paths, and catalog overrides.
- [x] Add VS Code Extension Host tests.
- [x] Add JetBrains Kotlin/action tests.
- [x] Run JetBrains CLI work off the UI thread and drain stdout/stderr concurrently.
- [x] Render parsed JetBrains results in the tool window.
- [x] Fix webview CSP issues.
- [x] Make scanner cancellation effective.
- [x] Add symlink containment and cycle protection.
- [x] Surface filesystem warnings.
- [x] Align documentation with implemented filenames, formats, and commands.

## P2 - Product improvements

- [x] Define a shared, versioned report schema.
- [x] Share runtime schemas for goals, modes, targets, and privacy settings.
- [x] Consolidate token estimation.
- [x] Budget the final serialized repo-map output.
- [x] Escape Markdown output.
- [x] Strengthen model-catalog validation and freshness review.
- [x] Smoke-test every CLI command and MCP tool.
- [x] Add hostile-input, path-security, and large-repository tests/benchmarks.

## P3 - Future capabilities

- [x] Add provider-specific tokenizers with offline fallbacks.
- [x] Add languages and deeper AST/semantic analysis.
- [x] Add incremental and cached scans.
- [x] Improve import/dependency graphs.
- [x] Add goal-completion compaction.
- [x] Add team policies and shared model profiles.
- [x] Add an optional hosted catalog feed.
- [x] Add a release-ready GitHub Action Marketplace integration.
- [x] Broaden JetBrains compatibility to 2024.2-2024.3 and verify both targets.
- [x] Add an optional self-hosted team dashboard/report service.

## External rollout

- [x] Publish the GitHub Action from the public `v0.1.2` tagged release.
- [x] Deploy and validate the catalog feed from the public `main` branch.

## Platform audit remediation - 19 July 2026

- [x] Upgrade the MCP SDK past the DNS-rebinding advisory and keep production dependency audit clean.
- [x] Return a clear error when privacy or team policy leaves no eligible recommendation model.
- [x] Reject invalid custom catalogs before recommendation/report generation and validate real calendar dates.
- [x] Stream catalog feeds within the byte limit and reject redirects to non-HTTPS URLs.
- [x] Keep persistent scan-cache files out of subsequent scan totals.
- [x] Remove symbols, imports, and routes when repo-map budget trimming removes their source file.
- [x] Resolve Python relative imports to `.py` modules and package `__init__.py` files.
- [x] Prevent false C-like symbols from control-flow statements and report Go/Kotlin exports correctly.
- [x] Detect supported JavaScript/TypeScript Next.js route-file extensions consistently.
- [x] Render zero-token workspaces with numeric zero percentages instead of `NaN`/`null`.
- [x] Validate MCP prompt token budgets and apply team token caps to generated report recommendations.
- [x] Make `catalog validate --format json` emit JSON instead of ignored prose formatting.
- [x] Apply team policies/model profiles in VS Code and explicitly confirm overwrites of generated workspace files.
- [x] Return dashboard client errors for malformed/invalid reports and preserve split UTF-8 request bodies.
- [x] Prevent MCP library imports from auto-starting a stdio server inside CLI commands.
- [x] Make the documented CI workspace-report command safe to rerun over its own artifacts.
- [x] Make local Marketplace publishers select the current-version VSIX instead of an arbitrary stale artifact.
- [x] Remove the unused MCP path sanitizer and scanner ignore-pattern accessor.
- [x] Build CLI workspace dependencies in the isolated GitHub Actions smoke job.

## `0.1.2` release gate

- [x] Frozen install, build, tests, lint, typecheck, fixture scan, CLI/MCP smoke, and expanded security scan pass.
- [x] Fresh VSIX packages and inspection proves its version and required contents.
- [ ] Record one JetBrains sandbox/manual verification; build, tests, and Plugin Verifier already pass.
- [x] No output is overwritten without explicit consent.
- [x] MCP cannot access paths outside its configured root; MCP JSON outputs parse.
- [x] All apps, packages, and artifacts report `0.1.2`.
- [x] Documentation examples and non-publishing release dry-runs execute as written.
- [x] At least one VS Code Extension Host test passes.

P3 engineering is complete; publication and deployment remain opt-in rollout work.
