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
