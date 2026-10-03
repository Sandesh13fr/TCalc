# Contributing

Thank you for contributing to TCalc! This guide covers everything a first-time external contributor needs to set up a local development environment, follow project conventions, and open a pull request.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Fork and Clone](#fork-and-clone)
- [Repository Structure](#repository-structure)
- [Installation](#installation)
- [Development Commands](#development-commands)
- [Testing](#testing)
- [Linting, Typechecking, and Formatting](#linting-typechecking-and-formatting)
- [Branch Strategy](#branch-strategy)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [CI Checks](#ci-checks)
- [Vercel Preview Builds](#vercel-preview-builds)
- [Coding Standards](#coding-standards)
- [Generated-File Policy](#generated-file-policy)
- [Contributor Checklist](#contributor-checklist)
- [Additional Documentation](#additional-documentation)

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 22 | Matches the CI environment |
| **pnpm** | 11.5.2 | Pinned via `"packageManager"` in `package.json` |
| **Corepack** | Bundled with Node 22 | Used to activate the correct pnpm version |

Enable Corepack before installing pnpm:

```bash
corepack enable
corepack prepare pnpm@11.5.2 --activate
```

---

## Fork and Clone

1. Fork the repository on GitHub.
2. Clone your fork:

   ```bash
   git clone https://github.com/<your-username>/TCalc.git
   cd TCalc
   ```

3. Add the upstream remote:

   ```bash
   git remote add upstream https://github.com/Sandesh13fr/TCalc.git
   ```

4. Keep your `Development` branch in sync with upstream:

   ```bash
   git fetch upstream
   git checkout Development
   git merge upstream/Development
   ```

---

## Repository Structure

```
apps/
  cli/                  # Commander-based CLI tool (@wma/cli)
  dashboard/            # Next.js product site and report viewer (@wma/dashboard)
  vscode-extension/     # VS Code extension (tcalc)
  jetbrains-plugin/     # IntelliJ Platform plugin (Gradle/JDK 21)
packages/
  core/                 # Shared types, config, and constants (@wma/core)
  scanner/              # Workspace file discovery and classification (@wma/scanner)
  tokenizers/           # Heuristic and provider token estimation (@wma/tokenizers)
  model-catalog/        # Model metadata and catalog validation (@wma/model-catalog)
  recommender/          # Goal-aware model scoring and cost estimates (@wma/recommender)
  repo-map/             # Context-budgeted structural repo maps (@wma/repo-map)
  agent-rules/          # Agent rules generation (Cursor, Claude Code, Codex…) (@wma/agent-rules)
  reports/              # Markdown and JSON report generation (@wma/reports)
  mcp-server/           # Local stdio MCP tools, resources, and prompts (@wma/mcp-server)
catalogs/               # Bundled model and provider data
fixtures/               # Test fixture workspaces
scripts/                # Build, smoke-test, and publish utilities
docs/                   # Developer documentation
```

Internal packages use the `@wma/<name>` scope and are linked via pnpm workspace references.

---

## Installation

```bash
pnpm install
pnpm build
```

Run `pnpm build` before `pnpm test` or the CLI — packages must be compiled before tests or the CLI entry point can resolve them.

---

## Development Commands

All commands are run from the repository root.

| Command | What it does |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm build` | Build all packages (`pnpm -r build`) |
| `pnpm dev` | Watch-mode build for all packages (`pnpm -r dev`) |
| `pnpm test` | Run the full test suite |
| `pnpm lint` | Lint all packages (`pnpm -r lint`) |
| `pnpm typecheck` | Type-check all packages (`pnpm -r typecheck`) |
| `pnpm format` | Format all files with Prettier |
| `pnpm scan:fixtures` | Smoke-test the CLI against `fixtures/small-node-app` |
| `pnpm smoke:cli` | Full CLI smoke test suite |
| `pnpm smoke:mcp` | MCP smoke test suite |

To work on a single package, use the `--filter` flag:

```bash
pnpm --filter @wma/scanner build
pnpm --filter @wma/scanner test
pnpm --filter @wma/scanner lint
```

### VS Code Extension packaging

```bash
pnpm package:vscode:preflight   # No-telemetry check + typecheck + extension tests
pnpm package:vscode             # Build VSIX into dist-vsix/
pnpm package:vscode:inspect     # Verify VSIX archive contents
```

---

## Testing

The project uses multiple test runners depending on the package:

| Package area | Test runner | Command |
|-------------|------------|---------|
| All packages in `packages/` and `apps/` (except below) | [Vitest](https://vitest.dev/) | `pnpm test` |
| `apps/dashboard` | Node.js built-in `--test` | Included in `pnpm test` |
| `apps/vscode-extension` | `@vscode/test-electron` (Electron host) | `pnpm --dir apps/vscode-extension test:host` |

The root `vitest.config.ts` covers `packages/*/tests/**/*.test.ts` and `apps/*/tests/**/*.test.ts`.

Add tests for any new functionality before opening a PR. New features without tests will not be merged.

---

## Linting, Typechecking, and Formatting

```bash
pnpm lint         # ESLint across all TypeScript source files
pnpm typecheck    # tsc --noEmit across all packages
pnpm format       # Prettier --write . (all files)
```

Run all three before pushing. The CI `build` job runs lint and typecheck and will fail if either reports errors.

---

## Branch Strategy

| Branch | Role |
|--------|------|
| `main` | Default branch — production-ready releases |
| `Development` | Active development integration branch |

**All contributor PRs must target `Development`**, not `main`. Merges from `Development` to `main` are managed by maintainers as part of the release process.

---

## Branch Naming Conventions

Create your branch from the latest `Development`:

```bash
git checkout Development
git pull upstream Development
git checkout -b feat/your-feature-name
```

Use one of the established prefixes:

| Prefix | Use for | Example |
|--------|---------|---------|
| `feat/` | New features | `feat/scanner-git-status-filter` |
| `fix/` | Bug fixes | `fix/37-preferred-model-ids` |
| `up/` | Improvements to existing behavior | `up/recommender-zero-context-guard` |
| `docs/` | Documentation changes | `docs/contributing-guide-79` |
| `osci/` | Open-source contribution issues | `osci/44-virtual-workspaces` |

You may append an issue number to the branch name (e.g. `feat/mcp-batch-tokens-66`), but it is not required.

---

## Commit Message Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

**Format:**

```
type(scope): short description
```

**Types in use:**

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or updating tests |

**Scope** should match the package or app name (e.g. `cli`, `scanner`, `recommender`, `repo-map`, `mcp-server`, `agent-rules`, `reports`, `tokenizers`, `model-catalog`).

**Examples:**

```
feat(scanner): add git-status porcelain parser and staged-files filter
fix(recommender): honor preferredModelIds when breaking ties
docs(scanner): define ignore precedence rules
test(reports): compare JSON and Markdown folder totals
```

Aim to keep the subject line under 72 characters. Use the body for context when the change is non-obvious.

> **Note:** Commit message format is a convention, not enforced by a linter. Merge commits generated by GitHub (`Merge pull request #N from ...`) do not follow this format and that is expected.

---

## Pull Request Process

1. Create a branch from `Development` using one of the naming conventions above.
2. Make your changes and add or update tests.
3. Run the local checks listed in the [Contributor Checklist](#contributor-checklist).
4. Push your branch and open a PR **targeting `Development`**.
5. Fill in the PR description, referencing the issue with `Fixes #<number>`.
6. Wait for the `CI Success` status check to pass.
7. A maintainer will review and merge.

---

## CI Checks

Pull requests targeting `Development` must pass the **`CI Success`** status check before they can be merged.

`CI Success` is an aggregate gate that depends on all of the following jobs passing:

| CI Job | What it runs |
|--------|-------------|
| `build` | `pnpm build`, version consistency check, action metadata check, `pnpm lint`, `pnpm typecheck` |
| `test` | `pnpm build`, `pnpm test`, VS Code Extension Host tests, `pnpm scan:fixtures` |
| `cli-smoke` | `pnpm smoke:cli` |
| `vsix-package` | `pnpm package:vscode`, `pnpm package:vscode:inspect` |
| `no-telemetry` | `node scripts/check-no-telemetry.mjs` — enforces the no-telemetry policy |
| `extension-metadata` | `pnpm check:extension-metadata` |

If any job fails, the `CI Success` check fails and the PR cannot be merged.

To reproduce failures locally before pushing:

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm smoke:cli
node scripts/check-no-telemetry.mjs
```

---

## Vercel Preview Builds

The `apps/dashboard` Next.js site is deployed on [Vercel](https://vercel.com/). Vercel automatically generates preview deployments for PRs that target **`main`**.

Vercel is **not** part of the `CI Success` gate. A Vercel failure does not block merging to `Development`, but it may indicate a dashboard build regression.

To reproduce a Vercel build failure locally:

```bash
pnpm --filter @wma/dashboard build
```

---

## Coding Standards

| Area | Standard |
|------|---------|
| Language | TypeScript — `strict: true`, target `ES2022`, module `Node16` |
| TypeScript version | 5.9.3 (pinned) |
| Linter | ESLint flat config (`eslint.config.js`) — applied to `**/*.ts` |
| Formatter | Prettier (project defaults — no `.prettierrc`) |
| Test framework | Vitest for packages; `node --test` for dashboard; `@vscode/test-electron` for VS Code extension |
| Package naming | `@wma/<name>` scope |
| Architecture | Functions preferred over classes |
| Telemetry | **Zero telemetry** — no external API calls or analytics in core packages; enforced by `check-no-telemetry.mjs` in CI |
| Privacy | Code must not upload source files or call remote endpoints without explicit user action |

ESLint rules enforced at the root level:

- `no-constant-condition`
- `no-debugger`
- `no-duplicate-imports`
- `no-unreachable`

---

## Generated-File Policy

**Never commit generated build output.** The CI pipeline produces these as workflow artifacts — they must never be committed to the repository.

Do not commit:

- `dist/` directories (TypeScript build output)
- `*.vsix` files
- `dist-vsix/`
- `.next/` (Next.js build cache)
- `apps/dashboard/out/` (Next.js static export)
- `apps/jetbrains-plugin/build/`
- `*.tsbuildinfo`

These paths are already covered by `.gitignore`. If you accidentally stage them, run:

```bash
git restore --staged <path>
```

---

## Contributor Checklist

Before opening a pull request, confirm all of the following:

- [ ] Branch created from `Development` and PR targets `Development`
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] New functionality has tests
- [ ] Documentation updated where applicable
- [ ] No generated `dist/`, VSIX, `.next/`, or JetBrains `build/` files staged or committed
- [ ] Commit messages follow the `type(scope): description` convention

---

## Additional Documentation

| Topic | Document |
|-------|---------|
| Configuration schema | [`instructions.md`](./instructions.md) |
| Release process | [`docs/release-checklist.md`](./docs/release-checklist.md) |
| CI reporter | [`docs/ci-reporter.md`](./docs/ci-reporter.md) |
| GitHub Action integration | [`docs/github-action.md`](./docs/github-action.md) |
| VSIX installation | [`docs/install-vsix.md`](./docs/install-vsix.md) |
| JetBrains plugin | [`docs/jetbrains-plugin.md`](./docs/jetbrains-plugin.md) |
| MCP server | [`docs/mcp-server.md`](./docs/mcp-server.md) |
| Agent integrations | [`docs/integrations/README.md`](./docs/integrations/README.md) |
| Security policy | [`SECURITY.md`](./SECURITY.md) |
