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

export const CANONICAL_CONFIG_FILENAME = ".tcalc.json";
export const LEGACY_CONFIG_FILENAME = ".workspace-model-advisor.json";

export function findWorkspaceConfigPath(rootPath: string): string {
  const canonicalPath = path.join(rootPath, CANONICAL_CONFIG_FILENAME);
  const legacyPath = path.join(rootPath, LEGACY_CONFIG_FILENAME);

  try {
    if (statSync(canonicalPath).isFile()) {
      return canonicalPath;
    }
  } catch {
    // Canonical configuration not present
  }

  try {
    if (statSync(legacyPath).isFile()) {
      return legacyPath;
    }
  } catch {
    // Legacy configuration not present
  }

  return canonicalPath;
}
