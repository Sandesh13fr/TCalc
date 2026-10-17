# Contributing

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

## Prerequisites

- Node.js 22 (used in CI)
- pnpm 11.5.2 (the root `packageManager` version)
- JDK 21 only if you change the JetBrains plugin

## Setup

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
pnpm package:vscode:preflight   # No-telemetry check, extension typecheck, and extension tests
pnpm package:vscode              # Build VSIX
pnpm package:vscode:inspect      # Verify VSIX contents
```

## Pull Requests

1. Request and receive issue assignment, then create a feature branch from current `Development`. Include `Fixes #<issue-number>` in the PR body. External contributors may have only one open PR at a time; the contribution-policy check closes non-compliant PRs.
2. Add tests for any new functionality
3. Ensure all tests pass (`pnpm test`)
4. Run preflight checks (`pnpm package:vscode:preflight`)
5. Open a PR against `Development`

OSCI participants must also confirm the repository-star prerequisite in their PR checklist. An event label does not guarantee event credit or replace review and CI requirements.

### Required Status Checks

Pull requests targeting **`Development`** must pass the **CI Success** status check before they can be merged. This aggregate check ensures that the required CI jobs complete successfully.

## Code Style

- TypeScript strict mode
- No telemetry, no external API calls in core packages
- Functions are preferred over classes
- Tests use vitest
