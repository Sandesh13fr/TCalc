import type { WorkspaceFileInfo, RepoMapSymbol, RepoMapImport } from "@wma/core";
import { readFileSync } from "node:fs";
import { extractTypeScriptSymbols } from "./parsers/typescriptSymbols.js";
import { extractJavaScriptSymbols } from "./parsers/javascriptSymbols.js";
import { extractPythonSymbols } from "./parsers/pythonSymbols.js";

export interface ParsedFileSymbols {
  symbols: RepoMapSymbol[];
  imports: RepoMapImport[];
  error: string | null;
}

export function parseFileSymbols(file: WorkspaceFileInfo, includeImports: boolean): ParsedFileSymbols {
  try {
    const content = readFileSync(file.path, "utf-8");
    const ext = file.extension;

    let symbols: RepoMapSymbol[] = [];
    let imports: RepoMapImport[] = [];
    let error: string | null = null;

    try {
      if (ext === ".ts" || ext === ".tsx") {
        symbols = extractTypeScriptSymbols(content, file.relativePath, ext);
        if (includeImports) {
          imports = extractTypeScriptImports(content, file.relativePath);
        }
      } else if (ext === ".js" || ext === ".jsx") {
        symbols = extractJavaScriptSymbols(content, file.relativePath, ext);
        if (includeImports) {
          imports = extractJavaScriptImports(content, file.relativePath);
        }
      } else if (ext === ".py") {
        symbols = extractPythonSymbols(content, file.relativePath);
        if (includeImports) {
          imports = extractPythonImports(content, file.relativePath);
        }
      }
    } catch (parseErr) {
      error = parseErr instanceof Error ? parseErr.message : String(parseErr);
      return { symbols: [], imports: [], error };
    }

    return { symbols, imports, error: null };
  } catch (readErr: any) {
    return { symbols: [], imports: [], error: readErr?.message ?? String(readErr) };
  }
}

function extractTypeScriptImports(content: string, relativePath: string): RepoMapImport[] {
  const imports: RepoMapImport[] = [];
  const importRegex = /import\s+(?:\{[^}]*\}\s+from\s+)?['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(content)) !== null) {
    imports.push({ source: m[1], relativePath, kind: "import" });
  }

  const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
  while ((m = dynamicImportRegex.exec(content)) !== null) {
    imports.push({ source: m[1], relativePath, kind: "dynamic-import" });
  }

  const requireRegex = /(?:const|let|var)\s+\w+\s*=\s*require\(['"]([^'"]+)['"]\)/g;
  while ((m = requireRegex.exec(content)) !== null) {
    imports.push({ source: m[1], relativePath, kind: "require" });
  }

  return imports;
}

function extractJavaScriptImports(content: string, relativePath: string): RepoMapImport[] {
  return extractTypeScriptImports(content, relativePath);
}

function extractPythonImports(content: string, relativePath: string): RepoMapImport[] {
  const imports: RepoMapImport[] = [];

  const importRegex = /^import\s+(\S+)/gm;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(content)) !== null) {
    imports.push({ source: m[1], relativePath, kind: "import" });
  }

  const fromImportRegex = /^from\s+(\S+)\s+import/gm;
  while ((m = fromImportRegex.exec(content)) !== null) {
    imports.push({ source: m[1], relativePath, kind: "import" });
  }

  return imports;
}
