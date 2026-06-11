import type { RepoMapSymbol } from "@wma/core";

export function extractTypeScriptSymbols(content: string, relativePath: string, ext: string): RepoMapSymbol[] {
  const symbols: RepoMapSymbol[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const isExport = /^\s*export\s+/.test(line);
    const isAsync = /^\s*(?:export\s+)?async\s+/.test(line);

    const stripped = line.replace(/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?/, "");

    // class X
    let m = stripped.match(/^(?:abstract\s+)?class\s+(\w+)/);
    if (m) {
      symbols.push({
        name: m[1],
        kind: "class",
        relativePath,
        lineStart: lineNum,
        exported: isExport,
        priority: isExport ? 8 : 5,
      });
      continue;
    }

    // interface X
    m = stripped.match(/^interface\s+(\w+)/);
    if (m) {
      symbols.push({
        name: m[1],
        kind: "interface",
        relativePath,
        lineStart: lineNum,
        exported: isExport,
        priority: isExport ? 7 : 4,
      });
      continue;
    }

    // type X = ...
    m = stripped.match(/^type\s+(\w+)\s*=/);
    if (m) {
      symbols.push({
        name: m[1],
        kind: "type",
        relativePath,
        lineStart: lineNum,
        exported: isExport,
        priority: isExport ? 6 : 3,
      });
      continue;
    }

    // enum X
    m = stripped.match(/^enum\s+(\w+)/);
    if (m) {
      symbols.push({
        name: m[1],
        kind: "enum",
        relativePath,
        lineStart: lineNum,
        exported: isExport,
        priority: isExport ? 6 : 3,
      });
      continue;
    }

    // function name(...
    m = stripped.match(/^function\s+(\w+)/);
    if (m) {
      const isComponent = ext === ".tsx" && /^[A-Z]/.test(m[1]);
      symbols.push({
        name: m[1],
        kind: isComponent ? "component" : "function",
        relativePath,
        lineStart: lineNum,
        exported: isExport,
        async: isAsync,
        priority: isExport ? 7 : 4,
      });
      continue;
    }

    // const|let|var Name = ... (with optional type annotation)
    m = stripped.match(/^(?:const|let|var)\s+(\w+)\s*(?::[^=]*)?\s*=/);
    if (m) {
      const isComponent = ext === ".tsx" && /^[A-Z]/.test(m[1]);
      symbols.push({
        name: m[1],
        kind: isComponent ? "component" : "variable",
        relativePath,
        lineStart: lineNum,
        exported: isExport,
        async: isAsync,
        priority: isExport && isComponent ? 8 : isExport ? 5 : 2,
      });
      continue;
    }

    // export default class/function without name -> detect as default export
    if (/^\s*export\s+default\s+(?:class|function|abstract\s+class)\s+(\w+)/.test(line)) {
      m = line.match(/(?:class|function)\s+(\w+)/);
      if (m) {
        symbols.push({
          name: m[1],
          kind: "unknown",
          relativePath,
          lineStart: lineNum,
          exported: true,
          priority: 6,
        });
      }
    }
  }

  return symbols;
}
