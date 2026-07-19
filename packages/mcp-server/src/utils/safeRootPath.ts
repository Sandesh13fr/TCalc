import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUNDLED_CATALOG_PATH = fileURLToPath(new URL("../../../../catalogs/models.json", import.meta.url));

function allowedRoot(): string {
  return realpathSync(path.resolve(process.env.WMA_ALLOWED_ROOT ?? process.cwd()));
}

function assertAllowed(targetPath: string): string {
  const relative = path.relative(allowedRoot(), targetPath);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    return targetPath;
  }
  throw new Error(`Path is outside the allowed root: ${targetPath}`);
}

export function validateRootPath(inputPath?: string): string {
  const rawPath = inputPath ?? process.cwd();
  try {
    return assertAllowed(realpathSync(path.resolve(rawPath)));
  } catch {
    throw new Error(`Invalid or disallowed workspace path: ${rawPath}`);
  }
}

export function isWithinAllowedPath(rootPath: string): boolean {
  try {
    assertAllowed(realpathSync(path.resolve(rootPath)));
    return true;
  } catch {
    return false;
  }
}

export function resolveCatalogPath(inputPath?: string): string {
  const configuredPath = inputPath ?? process.env.WMA_CATALOG_PATH;
  if (!configuredPath && existsSync(BUNDLED_CATALOG_PATH)) return realpathSync(BUNDLED_CATALOG_PATH);
  const rawPath = configuredPath ?? path.resolve(process.cwd(), "catalogs", "models.json");
  const resolved = path.resolve(rawPath);
  try {
    return assertAllowed(realpathSync(resolved));
  } catch {
    if (configuredPath) throw new Error(`Catalog path does not exist or is outside the allowed root: ${rawPath}`);
    return assertAllowed(resolved);
  }
}
