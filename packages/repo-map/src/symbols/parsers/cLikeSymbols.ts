
import type { RepoMapSymbol } from "@wma/core";

function maskNonCode(content: string, ext: string): string {
  const chars = content.split("");
  let i = 0;
  let state: "code" | "lineComment" | "blockComment" | "string" | "char" | "textBlock" = "code";

  const mask = (index: number) => {
    if (chars[index] !== "\n" && chars[index] !== "\r") {
      chars[index] = " ";
    }
  };

  while (i < chars.length) {
    const current = chars[i];
    const next = chars[i + 1];

    if (state === "lineComment") {
      if (current === "\n" || current === "\r") {
        state = "code";
      } else {
        mask(i);
      }
      i++;
      continue;
    }

    if (state === "blockComment") {
      if (current === "*" && next === "/") {
        mask(i);
        mask(i + 1);
        i += 2;
        state = "code";
      } else {
        mask(i);
        i++;
      }
      continue;
    }

    if (state === "string" || state === "char") {
      const closingQuote = state === "string" ? '"' : "'";
      if (current === "\\") {
        mask(i);
        i++;
        if (i < chars.length) {
          mask(i);
          i++;
        }
        continue;
      }
      if (current === closingQuote) {
        mask(i);
        i++;
        state = "code";
        continue;
      }
      if (current === "\n" || current === "\r") {
        state = "code";
        i++;
        continue;
      }
      mask(i);
      i++;
      continue;
    }

    if (state === "textBlock") {
      if (current === '"' && next === '"' && chars[i + 2] === '"') {
        mask(i);
        mask(i + 1);
        mask(i + 2);
        i += 3;
        state = "code";
      } else {
        mask(i);
        i++;
      }
      continue;
    }

    // Go uses // and /* */ comments; Rust and Java-like languages do too.
    if (current === "/" && next === "/") {
      mask(i);
      mask(i + 1);
      i += 2;
      state = "lineComment";
      continue;
    }

    if (current === "/" && next === "*") {
      mask(i);
      mask(i + 1);
      i += 2;
      state = "blockComment";
      continue;
    }

    // Java text blocks use triple double quotes.
    if (ext === ".java" && current === '"' && next === '"' && chars[i + 2] === '"') {
      mask(i);
      mask(i + 1);
      mask(i + 2);
      i += 3;
      state = "textBlock";
      continue;
    }

    if (current === '"') {
      mask(i);
      i++;
      state = "string";
      continue;
    }

    if (current === "'") {
      mask(i);
      i++;
      state = "char";
      continue;
    }

    i++;
  }

  return chars.join("");
}

export function extractCLikeSymbols(
  content: string,
  relativePath: string,
  ext: string,
): RepoMapSymbol[] {
  const symbols: RepoMapSymbol[] = [];
  const patterns = ext === ".go"
    ? [/^func\s+(?:\([^)]*\)\s*)?(\w+)/, /^type\s+(\w+)\s+(?:struct|interface)/]
    : ext === ".rs"
      ? [/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/, /^(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/]
      : [/^(?:public\s+|private\s+|protected\s+|internal\s+|open\s+|abstract\s+)*(?:class|interface|enum|record|object)\s+(\w+)/, /^(?:public\s+|private\s+|protected\s+|internal\s+|static\s+|suspend\s+|final\s+)*[\w<>,?[\].]+\s+(\w+)\s*\(/];

  const maskedContent = maskNonCode(content, ext);

  maskedContent.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (/^(?:return|throw|new|if|else|for|while|switch|when|catch)\b/.test(trimmed)) return;

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (!match) continue;

      const declaration: RepoMapSymbol["kind"] =
        trimmed.includes("class ") ? "class"
          : trimmed.includes("interface ") || trimmed.includes("trait ") ? "interface"
            : trimmed.includes("enum ") ? "enum"
              : /\b(?:type|struct|record|object)\b/.test(trimmed) ? "type"
                : "function";

      const exported = ext === ".go"
        ? /^[A-Z]/.test(match[1])
        : ext === ".kt"
          ? !/^(?:private|protected|internal)\b/.test(trimmed)
          : /^(?:public|pub)\b/.test(trimmed);

      symbols.push({
        name: match[1],
        kind: declaration,
        relativePath,
        lineStart: index + 1,
        exported,
        priority: 5,
      });
      break;
    }
  });

  return symbols;
}
