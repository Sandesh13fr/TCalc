# Contributing to TCalc

Thank you for contributing. TCalc is local-first: workspace source must not be uploaded or sent to an external service by default.

## Set up

- Node.js 22 (the version used in CI)
- pnpm 11.5.2 (see `packageManager` in the root `package.json`)
- JDK 21 if you change the JetBrains plugin

```bash
git clone https://github.com/Sandesh13fr/TCalc.git
cd TCalc
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

## Find the right area

| Area to select in your PR       | Main paths                                     | Focused checks                                                                                                        |
| ------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| CLI                             | `apps/cli/`                                    | `pnpm --filter @wma/cli test`, `pnpm smoke:cli`                                                                       |
| MCP server / agent integrations | `packages/mcp-server/`, `docs/integrations/`   | `pnpm --filter @wma/mcp-server test`, `pnpm smoke:mcp`                                                                |
| Web / dashboard                 | `apps/dashboard/`                              | `pnpm --filter @wma/dashboard test`, `pnpm --filter @wma/dashboard build`                                             |
| VS Code extension               | `apps/vscode-extension/`                       | `pnpm --dir apps/vscode-extension typecheck`, `pnpm package:vscode`, `pnpm package:vscode:inspect`                    |
| JetBrains plugin                | `apps/jetbrains-plugin/`                       | From that directory, run `./gradlew test buildPlugin verifyPlugin` (use `gradlew.bat` on Windows)                     |
| Shared packages                 | `packages/`                                    | Run affected package tests **and** relevant CLI/MCP/editor smoke checks                                               |
| GitHub Action / CI / release    | `action.yml`, `.github/workflows/`, `scripts/` | `pnpm check:action` where applicable; explain checks that cannot run locally                                          |
| Documentation / catalog data    | `README.md`, `docs/`, `catalogs/`              | Check links and examples; use `node apps/cli/dist/index.js catalog validate catalogs/models.json` for catalog changes |

Select **every** affected area in the PR template. A change in `packages/recommender/`, for example, may affect the CLI, MCP server, and editor recommendations; mention those downstream effects rather than labeling it only “shared package.”

## Prepare a pull request

1. Star the [TCalc repository](https://github.com/Sandesh13fr/TCalc) before starting contribution work. This is a mandatory participation prerequisite for OSCI contributions; confirm it in the PR checklist.
2. Comment on an open issue with your proposed approach and wait for assignment before substantial work. Link that assigned issue in the PR body with a closing keyword (for example, `Fixes #123`). External contributors may have only one open PR at a time; non-compliant PRs are closed automatically. After meeting the requirements, ask a maintainer to reopen the PR or open a replacement PR.
3. Create a focused branch from `Development` and target `Development` in the PR, unless a maintainer asks for another base. Keep unrelated issue fixes in separate PRs.
4. Add or update regression tests for behavior changes. Include a concise reproduction for bug fixes.
5. Run the relevant focused checks above. Before requesting review, run `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck`. Run `pnpm smoke:all` when changing shared packages, CLI, or MCP behavior. Use `pnpm run ci` for the full local pipeline (`pnpm ci` is pnpm's clean-install command, not this script).
6. Fill out the PR template: affected areas, issue link, behavior change, tests run with results, documentation, and privacy or compatibility impact. If a check was not run, say why. Add screenshots or a short recording for visible web/editor changes.
7. Do not commit generated `dist/`, VSIX, `.next/`, or JetBrains `build/` files.

## Project layout

```text
apps/
  cli/                  Command-line interface
  dashboard/            Next.js website and optional report server
  jetbrains-plugin/     JetBrains IDE plugin (Gradle/Kotlin)
  vscode-extension/     VS Code extension
packages/
  core/                 Shared types, config, and team policy
  scanner/              Workspace discovery, ignores, classification, cache
  tokenizers/           Heuristic and optional provider tokenization
  model-catalog/        Model metadata and optional feed
  recommender/          Model ranking and cost estimates
  repo-map/             Context-aware repository maps
  reports/              Markdown/JSON reports
  agent-rules/          Agent instructions and goal compaction
  mcp-server/           Stdio MCP tools and prompts
catalogs/               Bundled model/provider data
fixtures/               Test workspaces
scripts/                Build, smoke, and verification utilities
```

## Code and privacy expectations

- Keep TypeScript in strict mode; favor small functions and existing shared modules over duplicated adapter logic.
- Add Vitest tests for TypeScript behavior, Node tests for the dashboard server, and Kotlin tests for JetBrains behavior.
- Do not add telemetry or default source upload. An optional network feature must be explicit, user-controlled, and documented.
- Preserve existing files unless the user confirms an overwrite. Explain changes to CLI output, MCP schemas, report formats, or editor commands because consumers may depend on them.
