# Contributing

## Prerequisites

- Node.js 18+
- pnpm 9+

## Setup

```bash
git clone <repo-url>
cd wma
pnpm install
pnpm build
pnpm test
```

## Project Structure

```
apps/
  cli/                  # CLI tool (Commander-based)
  vscode-extension/     # VS Code extension
catalogs/               # Bundled model and provider data
packages/
  core/                 # Shared types, config, constants
  scanner/              # Workspace file discovery
  tokenizers/           # Token estimation
  model-catalog/        # Model metadata loader
  recommender/          # Model scoring engine
  reports/              # HTML/markdown report generation
  agent-rules/          # Agent behavior rules generation
  repo-map/             # Context-aware repo map generation
fixtures/               # Test fixture workspaces
scripts/                # Build and smoke-test utilities
```

## Development

```bash
pnpm dev              # Watch all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm typecheck        # Type-check all packages
pnpm scan:fixtures    # Smoke-test CLI on fixtures
```

## Packaging

```bash
pnpm package:vscode:preflight   # Typecheck, lint, check for telemetry
pnpm package:vscode              # Build VSIX
pnpm package:vscode:inspect      # Verify VSIX contents
```

## Pull Requests

1. Create a feature branch from `main`
2. Add tests for any new functionality
3. Ensure all tests pass (`pnpm test`)
4. Run preflight checks (`pnpm package:vscode:preflight`)
5. Open a PR against `main`

## Code Style

- TypeScript strict mode
- No telemetry, no external API calls in core packages
- Functions are preferred over classes
- Tests use vitest
