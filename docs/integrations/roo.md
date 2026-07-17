# Roo Integration

Use TCalc from [Roo](https://github.com/RooVeteran/Roo) (VS Code extension) via MCP.

## Requirements

- TCalc CLI or MCP server built (`pnpm build`)
- Roo extension installed in VS Code

## MCP Setup

In Roo settings, add an MCP server:

- **Name**: `tcalc`
- **Transport**: `stdio`
- **Command**: `node`
- **Args**: `/absolute/path/to/tcalc/packages/mcp-server/dist/index.js`

Or edit the Roo MCP config file directly (typically `.roo/mcp.json`):

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

**Roo can't find the MCP server**  
Use an absolute path. Restart Roo after changing settings.

## Verify It Works

Ask Roo: "Scan this workspace with TCalc"
