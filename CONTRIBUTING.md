# Contributing to TCalc

Thank you for contributing. TCalc is local-first: workspace source must not be uploaded or sent to an external service by default.

## Your first open-source contribution

You are welcome here, even if you have never opened a pull request. Questions are part of the process, not a reason to hesitate.

- Browse [available beginner tasks](https://github.com/Sandesh13fr/TCalc/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22%20label%3Aup-for-grabs%20no%3Aassignee).
- `good first issue` means approachable work with a bounded scope. `up-for-grabs` means it is available; check the assignee and recent comments before starting.
- `first-timers-only` tasks are reserved for people making their first open-source pull request, not just their first TCalc contribution. Experienced contributors should choose another issue.
- Comment with a short approach and the test/check you plan to use. For documentation, one sentence is enough. Mention if this is your first open-source PR and ask for help with any unfamiliar step.
- Wait for assignment before working. If you are assigned, the maintainer will remove `up-for-grabs`. Please do not work on someone else's assigned issue.
- Fork the repository, create a branch from `Development`, make only the assigned change, and open a PR targeting `Development` with `Fixes #<issue-number>` in its description.
- Only one open PR per external contributor is allowed. Keep drafts on your own branch until your current PR is resolved.
- For a documentation-only task, you may use GitHub's web editor without installing the project. Preview Markdown and check the links and commands you changed. Say which checks you ran; the maintainer will still require the relevant CI checks before merging.
- If setup fails or feedback is confusing, comment on the issue or PR with the error and ask for the next step. Never post tokens, passwords, private workspace paths, or source from a private project.

For a guided practice run, see [First Contributions](https://github.com/firstcontributions/first-contributions). Our approach follows [First Timers Only](https://www.firsttimersonly.com/): small tasks and patient help with the contribution process. Please follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Set up

- Node.js 22 (the version used in CI)
- pnpm 11.5.2 (see `packageManager` in the root `package.json`)
- JDK 21 if you change the JetBrains plugin

```bash
git clone https://github.com/<your-GitHub-username>/TCalc.git
cd TCalc
git remote add upstream https://github.com/Sandesh13fr/TCalc.git
git fetch upstream
git switch -c my-first-fix upstream/Development
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
2. Comment on an open issue with your proposed approach and wait for assignment before substantial work. Link that assigned issue in the PR body with a closing keyword (for example, `Fixes #123`). External contributors may have only one open PR at a time, drafts included; non-compliant PRs are closed automatically. After meeting the requirements, ask a maintainer to reopen the PR or open a replacement PR.
3. Create a focused branch from `Development` and target `Development` in the PR, unless a maintainer asks for another base. Keep unrelated issue fixes in separate PRs.
4. Add or update regression tests for behavior changes. Include a concise reproduction for bug fixes.
5. Run the relevant focused checks above. Before requesting review, run `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck`. Run `pnpm smoke:all` when changing shared packages, CLI, or MCP behavior. Use `pnpm run ci` for the full local pipeline (`pnpm ci` is pnpm's clean-install command, not this script).
6. Fill out the PR template: affected areas, issue link, behavior change, tests run with results, documentation, and privacy or compatibility impact. If a check was not run, say why. Add screenshots or a short recording for visible web/editor changes.
7. Do not commit generated `dist/`, VSIX, `.next/`, or JetBrains `build/` files.

## Required status checks

Pull requests targeting **`Development`** must pass the **CI Success** status check before they can be merged. This aggregate check ensures that the required CI jobs complete successfully.

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
