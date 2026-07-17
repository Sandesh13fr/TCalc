# Cursor Integration

Use TCalc from [Cursor](https://cursor.com/) via MCP and `.cursorrules`.

## Requirements

- TCalc CLI or MCP server built (`pnpm build`)
- Cursor v0.45+ (MCP support)

## MCP Setup

Create or edit `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "tcalc": {
      "command": "node",
      "args": ["/absolute/path/to/tcalc/packages/mcp-server/dist/index.js"]
    }
  }
}
```

> If TCalc is published as a standalone npm package in the future, use:
> ```json
> { "command": "npx", "args": ["@wma/mcp-server"] }
> ```

See [examples/mcp/cursor.mcp.json](../../examples/mcp/cursor.mcp.json) for a complete example.

## Agent Rules

Generate `.cursorrules` to optimize Cursor's behavior for your workspace:

```bash
pnpm tcalc rules . --target cursor --mode normal --yes
```

Or from the VS Code extension: **TCalc: Generate Agent Rules** → select `cursor`.

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `scan_workspace` | Scan workspace and return token summary |
| `recommend_models` | Recommend AI models for your task |
| `create_repo_map` | Generate a structural repo map |
| `generate_agent_rules` | Generate agent rules for any target |
| `generate_report` | Generate full Markdown/JSON report |
| `validate_model_catalog` | Validate model catalog JSON |

## Security

- No source file bodies are sent — only structural metadata
- No telemetry or network calls
- All processing stays on your machine

## Troubleshooting

**Cursor doesn't see the MCP server**  
Verify the path in `mcp.json` is absolute and points to `packages/mcp-server/dist/index.js`.

**Tools fail with "Module not found"**  
Run `pnpm build` from the TCalc repo root first.

## Verify It Works

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run **TCalc: Scan Workspace**
3. Check that scan completes without errors
