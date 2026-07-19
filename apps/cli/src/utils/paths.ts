import path from "node:path";
import { statSync } from "node:fs";
import { CliError } from "./errors.js";

export function resolveTargetPath(target?: string): string {
  const resolved = target ? path.resolve(target) : process.cwd();
  try {
    if (!statSync(resolved).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new CliError(`Workspace path does not exist or is not a directory: ${resolved}`);
  }
  return resolved;
}

export function findCatalogInWorkspace(rootPath: string): string[] {
  const candidates = [
    path.join(rootPath, "catalogs", "models.json"),
    path.join(rootPath, ".tcalc", "models.json"),
  ];
  return candidates;
}

export function findWorkspaceConfigPath(rootPath: string): string {
  return path.join(rootPath, ".tcalc.json");
}
