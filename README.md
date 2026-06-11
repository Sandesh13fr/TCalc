# Workspace Model Advisor

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
