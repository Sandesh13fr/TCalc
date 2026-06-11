import type { RepoMapSymbol } from "@wma/core";

export function extractPythonSymbols(content: string, relativePath: string): RepoMapSymbol[] {
  const symbols: RepoMapSymbol[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // async def name(...
    let m = line.match(/^async\s+def\s+(\w+)/);
    if (m) {
      symbols.push({
        name: m[1],
        kind: "function",
        relativePath,
        lineStart: lineNum,
        async: true,
        priority: 6,
      });
      continue;
    }

    // def name(...
    m = line.match(/^def\s+(\w+)/);
    if (m) {
      symbols.push({
        name: m[1],
        kind: "function",
        relativePath,
        lineStart: lineNum,
        priority: 5,
      });
      continue;
    }

    // class Name(...
    m = line.match(/^class\s+(\w+)/);
    if (m) {
      symbols.push({
        name: m[1],
        kind: "class",
        relativePath,
        lineStart: lineNum,
        priority: 7,
      });
      continue;
    }
  }

  return symbols;
}
