import type {
  TokenDensityProfile,
  TokenDensityMetrics,
  DensityAdjustmentOptions,
  DensityClassification,
} from "./types/density.js";

const PUNCTUATION_REGEX = /[{}()[\];,.:<>=!&|?+\-*/%^~#@$]/g;
const NON_ASCII_REGEX = /[^\x00-\x7F]/g;
const WORD_REGEX = /[A-Za-z0-9_]+/g;

export function estimateTokenDensity(
  text: string,
  options: DensityAdjustmentOptions = {},
): TokenDensityProfile {
  const charCount = text.length;
  if (charCount === 0) {
    const emptyMetrics: TokenDensityMetrics = {
      punctuationDensity: 0,
      whitespaceRatio: 0,
      nonAsciiRatio: 0,
      avgWordLength: 0,
      lineCount: 0,
    };
    return {
      charCount: 0,
      rawEstimate: 0,
      densityMultiplier: 1.0,
      adjustedTokens: 0,
      classification: "normal",
      metrics: emptyMetrics,
    };
  }

  const baseRatio = options.baseCharRatio ?? 3.8;
  const rawEstimate = Math.max(1, Math.ceil(charCount / baseRatio));

  let whitespaceCount = 0;
  let lineCount = 1;
  for (let i = 0; i < charCount; i++) {
    const code = text.charCodeAt(i);
    if (code === 32 || code === 9 || code === 13) {
      whitespaceCount++;
    } else if (code === 10) {
      whitespaceCount++;
      lineCount++;
    }
  }

  const nonWhitespaceCount = Math.max(1, charCount - whitespaceCount);
  const punctuationMatches = text.match(PUNCTUATION_REGEX);
  const punctuationCount = punctuationMatches ? punctuationMatches.length : 0;
  const punctuationDensity = Number((punctuationCount / nonWhitespaceCount).toFixed(4));

  const whitespaceRatio = Number((whitespaceCount / charCount).toFixed(4));

  const nonAsciiMatches = text.match(NON_ASCII_REGEX);
  const nonAsciiCount = nonAsciiMatches ? nonAsciiMatches.length : 0;
  const nonAsciiRatio = Number((nonAsciiCount / charCount).toFixed(4));

  const words = text.match(WORD_REGEX) || [];
  let totalWordChars = 0;
  for (const w of words) {
    totalWordChars += w.length;
  }
  const avgWordLength = words.length > 0 ? Number((totalWordChars / words.length).toFixed(2)) : 0;

  // Calculate density multiplier
  let multiplier = 1.0;

  // Dense punctuation penalty (BPE tokens break on almost every operator)
  if (punctuationDensity > 0.28) {
    multiplier += 0.35;
  } else if (punctuationDensity > 0.18) {
    multiplier += 0.18;
  } else if (punctuationDensity < 0.08) {
    multiplier -= 0.1;
  }

  // Unicode / multi-byte characters require multiple BPE tokens per character
  if (nonAsciiRatio > 0.15) {
    multiplier += 0.65;
  } else if (nonAsciiRatio > 0.03) {
    multiplier += 0.3;
  }

  // Whitespace compression (indented source code compresses into shared indentation tokens)
  if (whitespaceRatio > 0.45) {
    multiplier -= 0.25;
  } else if (whitespaceRatio > 0.32) {
    multiplier -= 0.12;
  } else if (whitespaceRatio < 0.12) {
    // Minified code with little/no whitespace
    multiplier += 0.22;
  }

  // Minified identifiers (short single-letter variables) increase token counts relative to bytes
  if (avgWordLength > 0 && avgWordLength < 2.5) {
    multiplier += 0.25;
  } else if (avgWordLength > 8.0) {
    // Long identifiers often share common prefixes/words
    multiplier -= 0.08;
  }

  const minMult = options.minMultiplier ?? 0.65;
  const maxMult = options.maxMultiplier ?? 2.2;
  const clampedMultiplier = Number(Math.min(maxMult, Math.max(minMult, multiplier)).toFixed(3));

  const adjustedTokens = Math.max(1, Math.round(rawEstimate * clampedMultiplier));

  let classification: DensityClassification = "normal";
  if (clampedMultiplier >= 1.25) {
    classification = "dense";
  } else if (clampedMultiplier <= 0.85) {
    classification = "sparse";
  }

  return {
    charCount,
    rawEstimate,
    densityMultiplier: clampedMultiplier,
    adjustedTokens,
    classification,
    metrics: {
      punctuationDensity,
      whitespaceRatio,
      nonAsciiRatio,
      avgWordLength,
      lineCount,
    },
  };
}
