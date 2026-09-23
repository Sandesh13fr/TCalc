import type {
  CompactionStage,
  CompactedCodeResult,
  CompactorOptions,
} from "./compactionLevels.js";

/**
 * Stage 1: Strip single-line, multi-line comments and docstrings.
 */
export function stripComments(code: string, language?: string): string {
  const isPython = language?.toLowerCase().includes("python") || language?.toLowerCase() === "py";

  let result = "";
  let i = 0;
  
  if (isPython) {
    while (i < code.length) {
      if (code.startsWith('"""', i) || code.startsWith("'''", i)) {
        const quote = code.slice(i, i + 3);
        const end = code.indexOf(quote, i + 3);
        if (end !== -1) {
          result += quote + "..." + quote;
          i = end + 3;
        } else {
          result += code.slice(i);
          break;
        }
      } else if (code[i] === '"' || code[i] === "'") {
        const quote = code[i];
        result += quote;
        i++;
        while (i < code.length) {
          if (code[i] === '\\') {
            result += code[i];
            if (i + 1 < code.length) {
              result += code[i + 1];
              i++;
            }
          } else if (code[i] === quote) {
            result += quote;
            i++;
            break;
          } else {
            result += code[i];
          }
          i++;
        }
      } else if (code[i] === '#') {
        while (i < code.length && code[i] !== '\n') {
          i++;
        }
      } else {
        result += code[i];
        i++;
      }
    }
  } else {
    while (i < code.length) {
      if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
        const quote = code[i];
        result += quote;
        i++;
        while (i < code.length) {
          if (code[i] === '\\') {
            result += code[i];
            if (i + 1 < code.length) {
              result += code[i + 1];
              i++;
            }
          } else if (code[i] === quote) {
            result += quote;
            i++;
            break;
          } else {
            result += code[i];
          }
          i++;
        }
      } else if (code.startsWith('//', i)) {
        while (i < code.length && code[i] !== '\n') {
          i++;
        }
      } else if (code.startsWith('/*', i)) {
        const end = code.indexOf('*/', i + 2);
        if (end !== -1) {
          i = end + 2;
        } else {
          i = code.length;
        }
      } else if (code[i] === '/') {
        let isRegex = false;
        let j = i + 1;
        let validRegex = false;
        if (j < code.length && code[j] !== ' ' && code[j] !== '*' && code[j] !== '/' && code[j] !== '\n') {
            while (j < code.length && code[j] !== '\n') {
                if (code[j] === '\\') { j += 2; continue; }
                if (code[j] === '/') { validRegex = true; j++; break; }
                j++;
            }
        }
        if (validRegex) {
            result += code.slice(i, j);
            i = j;
        } else {
            result += code[i];
            i++;
        }
      } else {
        result += code[i];
        i++;
      }
    }
  }

  // Remove empty comment lines and excessive consecutive blank lines
  return result
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join("\n");
}

/**
 * Stage 2: Collapse function and method implementation blocks { ... } to signatures.
 */
export function collapseFunctionBodies(code: string): string {
  const lines = code.split("\n");
  const output: string[] = [];
  let inBlock = false;
  let braceDepth = 0;
  let signatureHeader = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line looks like a function, method, constructor, or arrow function
    const isClassHeader = /^(export\s+)?(abstract\s+)?class\s+/.test(trimmed);
    const genericSignatureMatch = trimmed.match(/\b([A-Za-z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^;{]+)?\s*\{?$/);
    const isControlFlow = genericSignatureMatch && ["if", "for", "while", "switch", "catch", "with"].includes(genericSignatureMatch[1]);
    
    const isSignature =
      !isClassHeader && !isControlFlow &&
      (trimmed.startsWith("function ") ||
        trimmed.startsWith("export function ") ||
        trimmed.startsWith("async function ") ||
        trimmed.startsWith("export async function ") ||
        trimmed.startsWith("constructor") ||
        (genericSignatureMatch !== null) ||
        /^(const|let|var)\s+[A-Za-z0-9_$]+\s*=\s*(async\s*)?\([^)]*\)\s*(=>)?\s*\{?$/.test(trimmed));

    if (isSignature && !inBlock) {
      if (line.includes("{")) {
        const header = line.slice(0, line.indexOf("{") + 1);
        output.push(`${header} /* collapsed */ }`);
        // Count open vs close braces on this line
        const opens = (line.match(/{/g) || []).length;
        const closes = (line.match(/}/g) || []).length;
        braceDepth = opens - closes;
        if (braceDepth > 0) {
          inBlock = true;
        }
      } else {
        signatureHeader = line;
        output.push(line);
      }
      continue;
    }

    if (signatureHeader && !inBlock) {
      if (line.includes("{")) {
        output.push("  /* collapsed */\n}");
        inBlock = true;
        braceDepth = 1;
        signatureHeader = "";
      }
      continue;
    }

    if (inBlock) {
      const opens = (line.match(/{/g) || []).length;
      const closes = (line.match(/}/g) || []).length;
      braceDepth += opens - closes;
      if (braceDepth <= 0) {
        inBlock = false;
        braceDepth = 0;
      }
      continue;
    }

    output.push(line);
  }

  return output.join("\n");
}

/**
 * Stage 3: Extract exported outline (interfaces, types, exports, signatures, imports).
 */
export function extractExportOutline(code: string): string {
  const lines = code.split("\n");
  const outlineLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      trimmed.startsWith("import ") ||
      trimmed.startsWith("export ") ||
      trimmed.startsWith("interface ") ||
      trimmed.startsWith("type ") ||
      trimmed.startsWith("declare ") ||
      trimmed.startsWith("enum ") ||
      trimmed.startsWith("from ") ||
      trimmed === "}" ||
      trimmed.startsWith("export default")
    ) {
      outlineLines.push(line);
    }
  }

  return outlineLines.join("\n");
}

export function progressiveCompact(
  code: string,
  options: CompactorOptions = {},
): CompactedCodeResult {
  const ratio = options.charToTokenRatio ?? 3.8;
  const originalChars = code.length;
  const originalTokens = Math.max(1, Math.ceil(originalChars / ratio));

  if (originalChars === 0) {
    return {
      stage: 0,
      originalChars: 0,
      compactedChars: 0,
      originalTokens: 0,
      compactedTokens: 0,
      reductionPercentage: 0,
      code: "",
    };
  }

  // If specific targetStage is requested, apply directly
  if (options.targetStage !== undefined) {
    const stage = options.targetStage;
    let compacted = code;

    if (stage >= 1) {
      compacted = stripComments(compacted, options.language);
    }
    if (stage >= 2) {
      compacted = collapseFunctionBodies(compacted);
    }
    if (stage >= 3) {
      compacted = extractExportOutline(compacted);
    }

    const compactedChars = compacted.length;
    const compactedTokens = Math.max(1, Math.ceil(compactedChars / ratio));
    const reductionPercentage = Number(
      (((originalTokens - compactedTokens) / originalTokens) * 100).toFixed(2),
    );

    return {
      stage,
      originalChars,
      compactedChars,
      originalTokens,
      compactedTokens,
      reductionPercentage: Math.max(0, reductionPercentage),
      code: compacted,
    };
  }

  // If maxTargetTokens is requested, find the lowest stage that satisfies it
  const maxTokens = options.maxTargetTokens ?? originalTokens;

  if (originalTokens <= maxTokens) {
    return {
      stage: 0,
      originalChars,
      compactedChars: originalChars,
      originalTokens,
      compactedTokens: originalTokens,
      reductionPercentage: 0,
      code,
    };
  }

  // Try Stage 1
  const stage1Code = stripComments(code, options.language);
  const stage1Tokens = Math.max(1, Math.ceil(stage1Code.length / ratio));
  if (stage1Tokens <= maxTokens) {
    return {
      stage: 1,
      originalChars,
      compactedChars: stage1Code.length,
      originalTokens,
      compactedTokens: stage1Tokens,
      reductionPercentage: Number((((originalTokens - stage1Tokens) / originalTokens) * 100).toFixed(2)),
      code: stage1Code,
    };
  }

  // Try Stage 2
  const stage2Code = collapseFunctionBodies(stage1Code);
  const stage2Tokens = Math.max(1, Math.ceil(stage2Code.length / ratio));
  if (stage2Tokens <= maxTokens) {
    return {
      stage: 2,
      originalChars,
      compactedChars: stage2Code.length,
      originalTokens,
      compactedTokens: stage2Tokens,
      reductionPercentage: Number((((originalTokens - stage2Tokens) / originalTokens) * 100).toFixed(2)),
      code: stage2Code,
    };
  }

  // Fallback to Stage 3
  const stage3Code = extractExportOutline(stage2Code);
  const stage3Tokens = Math.max(1, Math.ceil(stage3Code.length / ratio));
  return {
    stage: 3,
    originalChars,
    compactedChars: stage3Code.length,
    originalTokens,
    compactedTokens: stage3Tokens,
    reductionPercentage: Number((((originalTokens - stage3Tokens) / originalTokens) * 100).toFixed(2)),
    code: stage3Code,
  };
}
