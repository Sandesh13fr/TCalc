import path from "node:path";
import type { RepoMapImport, WorkspaceScanResult } from "@wma/core";

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".java", ".kt", ".go", ".rs"];

export function resolveImports(imports: RepoMapImport[], scanResult: WorkspaceScanResult): RepoMapImport[] {
  const files = new Set(scanResult.files.map((file) => file.relativePath.replace(/\\/g, "/")));
  return imports.map((entry) => ({ ...entry, resolvedPath: resolveImport(entry, files) }));
}

function resolveImport(entry: RepoMapImport, files: Set<string>): string | undefined {
  if (!entry.source.startsWith(".")) return undefined;
  if (entry.relativePath.endsWith(".py")) return resolvePythonImport(entry, files);
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(entry.relativePath.replace(/\\/g, "/")), entry.source));
  for (const extension of EXTENSIONS) {
    const direct = `${base}${extension}`;
    if (files.has(direct)) return direct;
    const indexed = `${base}/index${extension}`;
    if (files.has(indexed)) return indexed;
  }
  return undefined;
}

function resolvePythonImport(entry: RepoMapImport, files: Set<string>): string | undefined {
  const match = entry.source.match(/^(\.+)(.*)$/);
  if (!match) return undefined;
  let directory = path.posix.dirname(entry.relativePath.replace(/\\/g, "/"));
  for (let level = 1; level < match[1].length; level++) directory = path.posix.dirname(directory);
  const modulePath = match[2].replace(/\./g, "/");
  const base = path.posix.normalize(path.posix.join(directory, modulePath));
  if (base === ".." || base.startsWith("../")) return undefined;
  for (const candidate of [`${base}.py`, `${base}/__init__.py`]) if (files.has(candidate)) return candidate;
  return undefined;
}
