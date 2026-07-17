# Continue Integration

Use TCalc from [Continue](https://continue.dev/) via MCP.

## Requirements

- TCalc CLI or MCP server built (`pnpm build`)
- Continue extension installed in VS Code / JetBrains

## MCP Setup

Add an MCP server entry to your Continue `config.yaml` (usually at `~/.continue/config.yaml` or project `.continue/config.yaml`):

```yaml
experimental:
  modelContextProtocolServers:
    - transport: stdio
      command: node
      args:
        - /absolute/path/to/tcalc/packages/mcp-server/dist/index.js
```

> If TCalc is published as a standalone npm package in the future, use:
> ```yaml
> command: npx
> args: ["@wma/mcp-server"]
> ```

See [examples/mcp/continue.yaml](../../examples/mcp/continue.yaml) for a complete example.

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

**Continue doesn't load the MCP server**  
Check the path is absolute. Restart Continue after editing `config.yaml`.

**Tools fail silently**  
Run `node /path/to/mcp-server/dist/index.js` directly and verify it starts (it will wait for JSON-RPC messages on stdin).

## Verify It Works

Ask Continue: "Scan my workspace with TCalc"
