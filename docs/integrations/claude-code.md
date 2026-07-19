# Claude Code Integration

Use TCalc from [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (CLI) via MCP and `CLAUDE.md`.

## Requirements

- TCalc CLI or MCP server built (`pnpm build`)
- Claude Code CLI installed

## MCP Setup

Claude Code can connect to any stdio MCP server. Run TCalc's MCP server:

```bash
pnpm cli mcp
```

Or configure it in your Claude Code project settings to start automatically.

## Agent Rules

Generate `CLAUDE.md` to optimize Claude Code's behavior for your workspace:

```bash
pnpm cli rules . --target claude-code --mode normal --yes
```

Or from the VS Code extension: **TCalc: Generate Agent Rules** → select `claude-code`.

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

**Claude Code can't find MCP server**  
Ensure you run `pnpm build` first, then start the server with `pnpm cli mcp` from the repo root.

**CLAUDE.md not being picked up**  
The file must be at the workspace root. Regenerate with `--yes` to overwrite.

## Verify It Works

Run `pnpm cli mcp` — the server starts and waits for JSON-RPC messages on stdin.
