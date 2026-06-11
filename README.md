# Workspace Model Advisor

[![CI](https://github.com/Sandesh13fr/TCalc/actions/workflows/ci.yml/badge.svg)](https://github.com/Sandesh13fr/TCalc/actions/workflows/ci.yml)
[![Release](https://github.com/Sandesh13fr/TCalc/actions/workflows/release.yml/badge.svg)](https://github.com/Sandesh13fr/TCalc/actions/workflows/release.yml)
[![Workspace Advisor Report](https://github.com/Sandesh13fr/TCalc/actions/workflows/workspace-advisor-report.yml/badge.svg)](https://github.com/Sandesh13fr/TCalc/actions/workflows/workspace-advisor-report.yml)

Local-first workspace token calculator, model recommender, and coding-agent optimizer.

## What It Does

Workspace Model Advisor scans your code workspace, estimates token usage, compares AI coding models by context limit and pricing, and recommends the cheapest sufficient model for your current development goal.

### Questions It Answers

- How large is my workspace in tokens?
- Which files or folders are wasting context?
- Which model is sufficient for this task?
- What will this coding-agent session likely cost?
- How can I optimize agent behavior to reduce token burn?

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Scan a fixture workspace via CLI
pnpm scan:fixtures
```

## VS Code Extension (VSIX)

Build and install locally:

```bash
pnpm build
pnpm package:vscode              # produces dist-vsix/*.vsix
pnpm package:vscode:inspect      # verify VSIX contents
```

See [docs/install-vsix.md](./docs/install-vsix.md) for installation instructions.

## Open VSX

> **Status: prepared, not yet published.** Publishing is gated behind a
> manual `workflow_dispatch` workflow (`publish-open-vsx.yml`) that defaults
> to `dry_run=true`. There is no automatic publish on tag push.

When a release is published, the extension will be installable from Open
VSX in any editor that uses it (VSCodium, Eclipse Theia, Gitpod, etc.):

```
workspace-model-advisor
```

To publish:

1. Add an `OPEN_VSX_TOKEN` secret in the repository
   *Settings → Secrets and variables → Actions*.
2. Open **Actions → Publish to Open VSX → Run workflow**.
3. Uncheck **dry_run** to publish for real.

See [docs/open-vsx-publishing.md](./docs/open-vsx-publishing.md) for the
full guide and [docs/release-checklist.md](./docs/release-checklist.md) for
the Open VSX section of the release flow.

## CLI

```bash
pnpm cli --help
pnpm wma scan ./my-project
pnpm wma recommend ./my-project --goal build-mvp
pnpm wma repo-map ./my-project --budget 8000
```

## Architecture

This is a pnpm monorepo with the following packages:

| Package | Description |
|---------|-------------|
| `@wma/core` | Shared types, config, and constants |
| `@wma/scanner` | Workspace file discovery and classification |
| `@wma/tokenizers` | Token estimation (heuristic and provider-specific) |
| `@wma/model-catalog` | Model metadata catalog loader |
| `@wma/recommender` | Model scoring and recommendation engine |
| `@wma/agent-rules` | Agent behavior rules generation |
| `@wma/repo-map` | Context-aware repo map generation |
| `@wma/reports` | HTML/markdown report generation |
| `apps/cli` | CLI tool (Commander-based) |
| `@wma/vscode-extension` | VS Code extension UI |
| `@wma/mcp-server` | MCP (Model Context Protocol) server for coding agents |

## CI & Automation

GitHub Actions workflows live in `.github/workflows/`:

- **`ci.yml`** — runs on every push to `main` and every PR. Builds, tests, packages the VSIX, inspects it, runs the no-telemetry guard, and validates extension metadata.
- **`release.yml`** — runs on `v*.*.*` tag pushes. Builds, tests, packages the VSIX, and attaches it to a **draft** GitHub Release. Never publishes to the Marketplace or Open VSX.
- **`workspace-advisor-report.yml`** — runs on every PR. Uses the WMA CLI to generate a workspace model report, repo map, and model recommendations, then uploads them as artifacts. Posts a short comment on trusted (non-fork) PRs only.
- **`publish-open-vsx.yml`** — manual `workflow_dispatch` only. Defaults to `dry_run=true`; only publishes when a human explicitly clears the dry-run flag and the `OPEN_VSX_TOKEN` secret is set.

Local equivalents:

```bash
pnpm ci                 # full local CI pass
pnpm ci:smoke           # CLI smoke tests
pnpm ci:workspace-report  # generate WMA report on the current repo
```

See [docs/ci-reporter.md](./docs/ci-reporter.md) and
[docs/release-checklist.md](./docs/release-checklist.md) for details.

## MCP Server (Experimental / MVP)

> **Status: Experimental / MVP** — stdio transport only, no hosted mode.

The `@wma/mcp-server` package exposes Workspace Model Advisor capabilities to
AI coding agents (Claude Code, Cursor, etc.) through the
[Model Context Protocol](https://modelcontextprotocol.io/) over **stdio**.

```bash
# Run via the WMA CLI
wma mcp

# Or run the standalone binary
wma-mcp
```

It exposes tools (`scan_workspace`, `recommend_models`, `create_repo_map`,
`generate_agent_rules`, `generate_report`, `validate_model_catalog`),
resources (`workspace://summary`, `model-catalog://models`), and a prompt
(`optimize_coding_agent_for_workspace`).

All processing is **local-first**: no code is uploaded, no network calls are
made, and no telemetry is collected. Repo maps are always structural — full
source file bodies are never exposed.

See [docs/mcp-server.md](./docs/mcp-server.md) for full documentation,
example client configs, security limitations, and MVP limitations.

## Core Principles

1. **Local-first** -- no code leaves your machine by default
2. **Open-source** -- free to use, no proprietary backend needed
3. **BYOK-friendly** -- bring your own API keys
4. **Model-neutral** -- no single provider is hardcoded as "best"
5. **Goal-aware** -- recommendations adapt to your task
6. **Cost-clear** -- always shows estimated token counts and costs

## Configuration

Create `.workspace-model-advisor.json` at your repo root. See `instructions.md` for the full schema.

## License

MIT
