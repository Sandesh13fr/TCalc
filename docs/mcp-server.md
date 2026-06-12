# MCP Server (Model Context Protocol)

> **Status: Experimental / MVP**
>
> The MCP server is a local-first bridge that exposes TCalc
> capabilities to AI coding agents through the [Model Context Protocol](https://modelcontextprotocol.io/).
> It uses **stdio transport only** in the MVP and does not make any network calls.

## What it does

The MCP server turns TCalc into a set of tools, resources,
and prompts that any MCP-compatible coding agent (Claude Code, Cursor, etc.)
can call directly. All processing happens locally — no code leaves your machine.

Key capabilities exposed via MCP:

- **Workspace scanning** — token estimation, file/folder summaries, language breakdown
- **Model recommendations** — cheapest-sufficient, balanced, and high-confidence tiers
- **Repo map generation** — structural overview (never full file bodies)
- **Agent rule generation** — Cursor, Claude Code, or generic targets
- **Report generation** — Markdown or JSON
- **Catalog validation** — check model catalog JSON for required fields

## How to run

### Option 1: via the TCalc CLI

```bash
# After building the monorepo
pnpm build
wma mcp
```

### Option 2: via the standalone binary

```bash
# After building the mcp-server package
pnpm --filter @tcalc/mcp-server build
wma-mcp
```

The server speaks the MCP protocol over **stdin/stdout**. All logs and errors
go to **stderr** to avoid corrupting the protocol stream.

## Example MCP client config (stdio)

Add this to your MCP-compatible client configuration (e.g. Claude Desktop
`claude_desktop_config.json`, Cursor settings, etc.):

```json
{
  "mcpServers": {
    "wma": {
      "command": "wma-mcp",
      "args": []
    }
  }
}
```

Or, if you prefer to run it through the TCalc CLI:

```json
{
  "mcpServers": {
    "wma": {
      "command": "wma",
      "args": ["mcp"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `scan_workspace` | Scan a workspace and return a compact JSON summary (file counts, token estimates, languages, warnings) |
| `recommend_models` | Scan workspace and recommend AI models (cheapest-sufficient, balanced, high-confidence) |
| `create_repo_map` | Generate a structural repo map in Markdown or JSON (no full file bodies) |
| `generate_agent_rules` | Generate agent rules for a target (generic, cursor, claude-code) and mode |
| `generate_report` | Generate a full Markdown or JSON report including scan and recommendations |
| `validate_model_catalog` | Validate a model catalog JSON file |

## Resources

| URI | Description |
|-----|-------------|
| `workspace://summary` | Returns the latest workspace scan summary (if a scan has been run) |
| `model-catalog://models` | Returns a summary of the loaded model catalog (no secrets exposed) |

## Prompts

| Name | Arguments | Description |
|------|-----------|-------------|
| `optimize_coding_agent_for_workspace` | `goal`, `tokenBudget`, `privacyMode` | Generates optimized instructions for a coding agent working on the workspace |

## Privacy statement

- **No code is uploaded.** All file scanning, token estimation, and model
  recommendation happen locally on your machine.
- **No network calls.** The server does not make any outbound HTTP requests.
- **No telemetry.** The server does not collect or send usage data.
- **No API keys required.** The server works entirely offline.

## Security limitations

- **Root path validation:** All `rootPath` inputs are validated as local
  filesystem paths. The server does not fetch remote URLs.
- **No shell execution:** Tool inputs are never passed to a shell. There is
  no `child_process` or `exec` usage.
- **Structural repo maps:** Repo maps are always structural — they list
  file paths, imports, and symbols, but never full source file bodies.
- **Risky files by path only:** Files classified as risky (e.g. containing
  secrets) are listed by path only, never by content.
- **In-memory state only:** The server does not persist state to disk in the
  MVP. Restarting the server clears all cached scans and recommendations.

## MVP limitations

- **stdio only:** No HTTP/SSE transport. The server only works over stdin/stdout.
- **No authentication:** Anyone with access to the stdio stream can call tools.
- **No hosted mode:** There is no remote/cloud deployment option.
- **No live pricing:** Model prices are loaded from a local catalog. There is
  no live pricing API.
- **No streaming:** Tool responses are returned as complete messages.
- **No progress reporting:** Long scans do not emit progress events.

## Testing

Tests are located in `packages/mcp-server/tests/` and can be run with:

```bash
pnpm --filter @tcalc/mcp-server test
```

Tests cover tool handlers, security (no shell execution, no network calls,
no source file bodies exposed), and fixture-based integration with
`fixtures/small-node-app`.
