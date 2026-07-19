import type { RepoMapSymbol } from "@wma/core";

export function extractCLikeSymbols(content: string, relativePath: string, ext: string): RepoMapSymbol[] {
  const symbols: RepoMapSymbol[] = [];
  const patterns = ext === ".go"
    ? [/^func\s+(?:\([^)]*\)\s*)?(\w+)/, /^type\s+(\w+)\s+(?:struct|interface)/]
    : ext === ".rs"
      ? [/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/, /^(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/]
      : [/^(?:public\s+|private\s+|protected\s+|internal\s+|open\s+|abstract\s+)*(?:class|interface|enum|record|object)\s+(\w+)/, /^(?:public\s+|private\s+|protected\s+|internal\s+|static\s+|suspend\s+|final\s+)*[\w<>,?[\].]+\s+(\w+)\s*\(/];

  content.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (/^(?:return|throw|new|if|else|for|while|switch|when|catch)\b/.test(trimmed)) return;
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (!match) continue;
      const declaration: RepoMapSymbol["kind"] = trimmed.includes("class ") ? "class" : trimmed.includes("interface ") || trimmed.includes("trait ") ? "interface" : trimmed.includes("enum ") ? "enum" : /\b(?:type|struct|record|object)\b/.test(trimmed) ? "type" : "function";
      const exported = ext === ".go"
        ? /^[A-Z]/.test(match[1])
        : ext === ".kt"
          ? !/^(?:private|protected|internal)\b/.test(trimmed)
          : /^(?:public|pub)\b/.test(trimmed);
      symbols.push({ name: match[1], kind: declaration, relativePath, lineStart: index + 1, exported, priority: 5 });
      break;
    }
  });
  return symbols;
}
