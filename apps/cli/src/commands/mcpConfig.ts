import path from "node:path";
import { fileURLToPath } from "node:url";

export interface McpConfigOptions {
  target: McpTarget;
  command?: string;
  workspace?: string;
}

export type McpTarget = "cursor" | "continue" | "claude-desktop" | "generic";

function resolveDefaultCommand(): string {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(cliDir, "..", "..", "..", "..");
  return path.resolve(repoRoot, "packages", "mcp-server", "dist", "index.js");
}

export function generateMcpConfig(options: McpConfigOptions): string {
  const serverCommand = options.command ?? resolveDefaultCommand();
  const workspace = options.workspace ?? process.cwd();

  switch (options.target) {
    case "cursor":
      return generateCursorConfig(serverCommand, workspace);
    case "continue":
      return generateContinueConfig(serverCommand, workspace);
    case "claude-desktop":
      return generateClaudeDesktopConfig(serverCommand, workspace);
    case "generic":
      return generateGenericConfig(serverCommand, workspace);
  }
}

function generateCursorConfig(command: string, _workspace: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        tcalc: {
          command: "node",
          args: [command],
          description: "Local-first workspace analysis and AI model recommendations",
        },
      },
    },
    null,
    2,
  );
}

function generateContinueConfig(command: string, _workspace: string): string {
  return `# Continue MCP Configuration (add to config.yaml)
experimental:
  modelContextProtocolServers:
    - transport: stdio
      command: node
      args:
        - ${JSON.stringify(command)}
      description: TCalc workspace analysis tools
`;
}

function generateClaudeDesktopConfig(command: string, _workspace: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        tcalc: {
          command: "node",
          args: [command],
          description: "Local-first workspace analysis and AI model recommendations",
          disabled: false,
          autoApprove: [],
        },
      },
    },
    null,
    2,
  );
}

function generateGenericConfig(command: string, _workspace: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        tcalc: {
          command: "node",
          args: [command],
          description: "Local-first workspace analysis and AI model recommendations",
        },
      },
    },
    null,
    2,
  );
}
