import type { WorkspaceScanResult, RepoMapSymbol, RepoMapImport, RepoMapRoute, RepoMapFile, RepoMapOptions } from "@wma/core";
import { parseFileSymbols } from "./parseFileSymbols.js";
import { detectFrameworkRoutes } from "./detectFrameworkRoutes.js";
import { rankSymbols } from "./rankSymbols.js";

export interface SymbolExtractionResult {
  symbols: RepoMapSymbol[];
  imports: RepoMapImport[];
  routes: RepoMapRoute[];
  warnings: string[];
}

const SYMBOL_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".py"]);

export function extractSymbols(
  scanResult: WorkspaceScanResult,
  files: RepoMapFile[],
  options: RepoMapOptions,
): SymbolExtractionResult {
  const result: SymbolExtractionResult = {
    symbols: [],
    imports: [],
    routes: [],
    warnings: [],
  };

  if (options.enableSymbolExtraction === false) {
    return result;
  }

  const maxBytes = options.maxParseFileBytes ?? 256_000;
  const maxSymbols = options.maxSymbols ?? 100;
  const includeImports = options.includeImports !== false;
  const includeRoutes = options.includeRoutes !== false;

  const fileSet = new Set(files.map((f) => f.relativePath));
  const eligible = scanResult.files.filter((f) => {
    if (!fileSet.has(f.relativePath)) return false;
    if (f.excludedReason) return false;
    if (f.riskFlags.includes("generated")) return false;
    if (f.riskFlags.includes("binary")) return false;
    if (f.riskFlags.includes("secret")) return false;
    if (f.riskFlags.includes("lockfile")) return false;
    if (!SYMBOL_EXTS.has(f.extension)) return false;
    if (f.bytes > maxBytes) return false;
    return true;
  });

  for (const file of eligible) {
    const fileSymbols = parseFileSymbols(file, includeImports);
    result.symbols.push(...fileSymbols.symbols);
    result.imports.push(...fileSymbols.imports);

    if (fileSymbols.error) {
      result.warnings.push(`Failed to parse ${file.relativePath}: ${fileSymbols.error}`);
    }
  }

  if (includeRoutes) {
    const routes = detectFrameworkRoutes(scanResult, files);
    result.routes.push(...routes);
  }

  result.symbols = rankSymbols(result.symbols, options.goal).slice(0, maxSymbols);

  return result;
}
