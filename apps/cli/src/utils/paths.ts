import path from "node:path";

export function resolveTargetPath(target?: string): string {
  return target ? path.resolve(target) : process.cwd();
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
