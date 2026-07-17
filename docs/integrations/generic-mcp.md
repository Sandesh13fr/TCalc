# Generic MCP Client Integration

Use TCalc from any editor or tool that supports the [Model Context Protocol](https://modelcontextprotocol.io/) via stdio transport.

## Requirements

- TCalc CLI or MCP server built (`pnpm build`)
- Any stdio MCP client

## MCP Setup

Most MCP clients accept a configuration like:

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

See [examples/mcp/generic-stdio.json](../../examples/mcp/generic-stdio.json) for a complete example.

## Starting the Server Manually

```bash
node /absolute/path/to/tcalc/packages/mcp-server/dist/index.js
```

Or via the CLI:

```bash
pnpm tcalc mcp
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

## Available Resources

- `workspace://summary` — Latest workspace scan summary
- `model-catalog://models` — Model catalog overview

## Available Prompts

- `optimize_coding_agent_for_workspace` — Full optimization prompt with goal and token budget

## Security

- No source file bodies are sent — only structural metadata
- No telemetry or network calls
- All processing stays on your machine
- The server validates that all paths are within the allowed workspace root

## Troubleshooting

**Server exits immediately**  
Run directly to see error output: `node /path/to/mcp-server/dist/index.js`

**JSON-RPC errors**  
Ensure the client sends valid JSON-RPC 2.0 messages over stdin.

## Verify It Works

The server logs a message on startup. Connect any MCP inspector tool to list tools.
