# Screenshots

Real screenshots for the VS Code Marketplace and Open VSX listing pages.

## Slots

| File | Content | Status |
|------|---------|--------|
| `dashboard.png` | TCalc Dashboard after scanning a workspace | ✓ Real (copied from `apps/vscode-extension/media/`) |
| `model-comparison.png` | Model comparison view showing recommended models | ✓ Real (copied from `apps/vscode-extension/media/`) |
| `repo-map.png` | Repo map output showing structured project tree | ✓ Real (copied from `apps/vscode-extension/media/`) |
| `agent-rules.png` | Generated agent rules configuration | ✓ Real (copied from `apps/vscode-extension/media/`) |
| `mcp.png` | MCP server usage with an AI coding agent | Still needed — capture and place here |

## How to capture replacement screenshots

1. Open a non-trivial project (e.g. the TCalc repo itself).
2. Run `TCalc: Scan Workspace` to generate scan data.
3. Run `TCalc: Open Dashboard` and capture the main view.
4. Run `TCalc: Compare Models` and capture the comparison.
5. Run `TCalc: Generate Repo Map` and capture the output.
6. Run `TCalc: Generate Agent Rules` and capture the result.
7. For MCP, run `pnpm cli mcp` and show it connected to an AI agent.

Requirements:
- 1280×800 or similar 16:10 aspect ratio recommended.
- PNG format, no JPEG.
- Dark theme preferred (matches `galleryBanner` in package.json).
- No sensitive data visible.
