# Screenshots

This directory contains screenshot placeholders for the
VS Code Marketplace and Open VSX listing pages.

## Slots

| File | Content | Status |
|------|---------|--------|
| `dashboard.png` | TCalc Dashboard after scanning a workspace | Placeholder |
| `model-comparison.png` | Model comparison view showing recommended models | Placeholder |
| `repo-map.png` | Repo map output showing structured project tree | Placeholder |
| `agent-rules.png` | Generated agent rules configuration | Placeholder |
| `mcp.png` | MCP server usage with an AI coding agent | Placeholder |

## How to capture screenshots

1. Open a non-trivial project (e.g. the TCalc repo itself).
2. Run `TCalc: Scan Workspace` to generate scan data.
3. Run `TCalc: Open Dashboard` and capture the main view.
4. Run `TCalc: Compare Models` and capture the comparison.
5. Run `TCalc: Generate Repo Map` and capture the output.
6. Run `TCalc: Generate Agent Rules` and capture the result.
7. For MCP, run `pnpm tcalc mcp` and show it connected to an AI agent.

Requirements:
- 1280×800 or similar 16:10 aspect ratio recommended.
- PNG format, no JPEG.
- Dark theme preferred (matches `galleryBanner` in package.json).
- No sensitive data visible.

## Replacement

When actual screenshots are ready, replace the placeholder files
with real PNGs matching the filenames above.
