import { realpathSync } from "node:fs";
import path from "node:path";

const ALLOWED_BASE_PATHS = [
  process.cwd(),
  path.resolve("."),
];

export function validateRootPath(inputPath?: string): string {
  const rawPath = inputPath ?? process.cwd();
  const resolved = path.resolve(rawPath);

  try {
    const realPath = realpathSync(resolved);
    return realPath;
  } catch {
    if (process.platform === "win32") {
      if (!resolved.match(/^[A-Za-z]:/)) {
        throw new Error(`Invalid path: ${rawPath}`);
      }
      return resolved;
    } else {
      if (resolved.startsWith("..")) {
        throw new Error(`Invalid path: ${rawPath}`);
      }
      return resolved;
    }
  }
}

export function isWithinAllowedPath(rootPath: string): boolean {
  const resolved = path.resolve(rootPath);
  const realCwd = realpathSync(process.cwd());
  return resolved === realCwd || resolved.startsWith(realCwd + path.sep);
}

export function sanitizePath(input: string): string {
  const normalized = input.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const sanitized: string[] = [];

  for (const part of parts) {
    if (part === "." || part === "..") continue;
    sanitized.push(part);
  }

  return sanitized.join("/");
}