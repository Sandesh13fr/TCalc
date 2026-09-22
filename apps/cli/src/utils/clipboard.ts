import { spawn } from "node:child_process";
import { CliError } from "./errors.js";

export interface ClipboardAdapter {
  writeText(text: string): Promise<void>;
}

export function getSystemClipboardCommand(): { cmd: string; args: string[] } {
  switch (process.platform) {
    case "win32":
      return { cmd: "clip", args: [] };
    case "darwin":
      return { cmd: "pbcopy", args: [] };
    default:
      return { cmd: "xclip", args: ["-selection", "clipboard"] };
  }
}

export class SystemClipboardAdapter implements ClipboardAdapter {
  async writeText(text: string): Promise<void> {
    const { cmd, args } = getSystemClipboardCommand();

    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ["pipe", "ignore", "pipe"] });

      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (err) => {
        reject(
          new CliError(
            `Failed to copy scan result to clipboard: Clipboard tool '${cmd}' is unavailable in this environment (${err.message}).`
          )
        );
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          const detail = stderr.trim() ? `: ${stderr.trim()}` : "";
          reject(
            new CliError(
              `Failed to copy scan result to clipboard: '${cmd}' exited with code ${code}${detail}.`
            )
          );
        }
      });

      child.stdin.on("error", (err) => {
        // Prevent unhandled error event if child closes early
        reject(
          new CliError(
            `Failed to copy scan result to clipboard: '${cmd}' process stream error (${err.message}).`
          )
        );
      });

      child.stdin.write(text, "utf-8", (err) => {
        if (err) {
          reject(new CliError(`Failed to write to clipboard stream: ${err.message}`));
        } else {
          child.stdin.end();
        }
      });
    });
  }
}

let activeAdapter: ClipboardAdapter = new SystemClipboardAdapter();

export function setClipboardAdapter(adapter: ClipboardAdapter): void {
  activeAdapter = adapter;
}

export function resetClipboardAdapter(): void {
  activeAdapter = new SystemClipboardAdapter();
}

export async function copyToClipboard(text: string): Promise<void> {
  await activeAdapter.writeText(text);
}
