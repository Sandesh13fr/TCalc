# Claude Desktop Integration

Use TCalc from [Claude Desktop](https://claude.ai/download) via MCP.

## Requirements

- TCalc CLI or MCP server built (`pnpm build`)
- Claude Desktop app (latest version)

## MCP Setup

Edit `claude_desktop_config.json` (open from Claude Desktop → Settings → Developer → Edit Config):

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

See [examples/mcp/claude-desktop.json](../../examples/mcp/claude-desktop.json) for a complete example.

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

**Claude Desktop shows "MCP server not found"**  
Verify the path is absolute and the file exists. Restart Claude Desktop after saving the config.

**Tools timeout**  
Large workspaces may take a few seconds. Increase timeout in Claude Desktop settings if needed.

## Verify It Works

Ask Claude: "Scan the current workspace with TCalc"
