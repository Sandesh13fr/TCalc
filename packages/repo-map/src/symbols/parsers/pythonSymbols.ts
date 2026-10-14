
import type { RepoMapSymbol } from "@wma/core";

function maskPythonNonCode(content: string): string {
  const chars = content.split("");
  let i = 0;

  const mask = (index: number) => {
    if (chars[index] !== "\n" && chars[index] !== "\r") {
      chars[index] = " ";
    }
  };

  while (i < chars.length) {
    // Ignore Python comments.
    if (chars[i] === "#") {
      while (i < chars.length && chars[i] !== "\n") {
        mask(i);
        i++;
      }
      continue;
    }

    const quote = chars[i];

    if (quote === "'" || quote === '"') {
      const triple =
        chars[i + 1] === quote && chars[i + 2] === quote;
      const delimiterLength = triple ? 3 : 1;

      for (let j = 0; j < delimiterLength; j++) {
        mask(i + j);
      }
      i += delimiterLength;

      while (i < chars.length) {
        // Skip escaped characters inside strings.
        if (chars[i] === "\\") {
          mask(i);
          i++;

          if (i < chars.length) {
            mask(i);
            i++;
          }
          continue;
        }

        // Find the closing quote.
        const closesString = triple
          ? chars[i] === quote &&
            chars[i + 1] === quote &&
            chars[i + 2] === quote
          : chars[i] === quote;

        if (closesString) {
          for (let j = 0; j < delimiterLength; j++) {
            mask(i + j);
          }
          i += delimiterLength;
          break;
        }

        // Ordinary quoted strings cannot continue across an
        // unescaped newline.
        if (
          !triple &&
          (chars[i] === "\n" || chars[i] === "\r")
        ) {
          break;
        }

        mask(i);
        i++;
      }

      continue;
    }

    i++;
  }

  return chars.join("");
}

export function extractPythonSymbols(
  content: string,
  relativePath: string,
): RepoMapSymbol[] {
  const symbols: RepoMapSymbol[] = [];
  const lines = maskPythonNonCode(content).split("\n");

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
