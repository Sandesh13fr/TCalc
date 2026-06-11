# Release Checklist

## Pre-release

- [ ] All tests pass: `pnpm test`
- [ ] Type-check passes: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Preflight passes: `pnpm package:vscode:preflight`
- [ ] CLI smoke tests pass: `pnpm smoke:cli`
- [ ] No telemetry or unexpected network calls: `node scripts/check-no-telemetry.mjs`

## Build

- [ ] Bump version in:
  - `apps/vscode-extension/package.json`
  - `package.json` (root)
  - `CHANGELOG.md`
- [ ] Commit version bump
- [ ] Tag the release: `git tag v0.x.x`
- [ ] Build the VSIX:
  ```bash
  pnpm build
  pnpm package:vscode
  ```
- [ ] Verify VSIX contents:
  ```bash
  pnpm package:vscode:inspect
  ```

## Post-build

- [ ] Install the VSIX locally and run a manual smoke test
- [ ] Push tag: `git push origin v0.x.x`
- [ ] Create a GitHub Release with the VSIX attached
- [ ] (Future) Publish to VS Code Marketplace:
  ```bash
  cd apps/vscode-extension
  vsce publish
  ```
- [ ] (Future) Publish to Open VSX Registry:
  ```bash
  cd apps/vscode-extension
  ovsx publish
  ```
