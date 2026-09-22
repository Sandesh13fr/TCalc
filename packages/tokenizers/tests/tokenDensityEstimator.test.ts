import { describe, it, expect } from "vitest";
import { estimateTokenDensity } from "../src/index.js";

describe("estimateTokenDensity", () => {
  it("returns zero metrics for empty text", () => {
    const profile = estimateTokenDensity("");
    expect(profile.charCount).toBe(0);
    expect(profile.rawEstimate).toBe(0);
    expect(profile.adjustedTokens).toBe(0);
    expect(profile.densityMultiplier).toBe(1.0);
    expect(profile.classification).toBe("normal");
    expect(profile.metrics.lineCount).toBe(0);
  });

  it("classifies standard TypeScript code as normal density", () => {
    const code = `
      function greet(name: string): string {
        const message = "Hello, " + name;
        return message;
      }
    `;
    const profile = estimateTokenDensity(code);

    expect(profile.charCount).toBeGreaterThan(50);
    expect(profile.rawEstimate).toBeGreaterThan(10);
    expect(profile.densityMultiplier).toBeGreaterThanOrEqual(0.85);
    expect(profile.densityMultiplier).toBeLessThanOrEqual(1.25);
    expect(profile.classification).toBe("normal");
    expect(profile.metrics.lineCount).toBe(6);
  });

  it("classifies operator-heavy regex and math expressions as dense", () => {
    const denseCode = `
      const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
      const result = (((a & b) ^ (c | d)) >> 3) * (e % f) + (g === h ? 1 : 0);
      const matrix = [[1, 2], [3, 4]]; return matrix[0][1] += ((x * y) - (z / w));
    `;
    const profile = estimateTokenDensity(denseCode);

    expect(profile.metrics.punctuationDensity).toBeGreaterThan(0.2);
    expect(profile.densityMultiplier).toBeGreaterThan(1.15);
    expect(profile.adjustedTokens).toBeGreaterThan(profile.rawEstimate);
  });

  it("increases density multiplier for non-ASCII/CJK characters", () => {
    const cjkCode = `
      // 日本語のコメントと中国語のテキスト
      const translation = "自然言語処理と機械学習モデルのトークン数計算テスト";
      console.log("こんにちは世界");
    `;
    const profile = estimateTokenDensity(cjkCode);

    expect(profile.metrics.nonAsciiRatio).toBeGreaterThan(0.4);
    expect(profile.densityMultiplier).toBeGreaterThanOrEqual(1.25);
    expect(profile.classification).toBe("dense");
    expect(profile.adjustedTokens).toBeGreaterThan(profile.rawEstimate * 1.2);
  });

  it("increases multiplier for minified code with tiny identifiers and zero indentation", () => {
    const minified = `!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e=e||self).App=t()}(this,function(){function e(e){return e&&e.__esModule?e:{default:e}}var t=e(n);return t.default})`;
    const profile = estimateTokenDensity(minified);

    expect(profile.metrics.whitespaceRatio).toBeLessThan(0.05);
    expect(profile.metrics.avgWordLength).toBeLessThan(4.5);
    expect(profile.densityMultiplier).toBeGreaterThan(1.2);
    expect(profile.adjustedTokens).toBeGreaterThan(profile.rawEstimate);
  });

  it("classifies sparse, heavily indented whitespace code as sparse", () => {
    const sparse = `
      
                                        
                value = 1
                
                
                return value
                
                
    `;
    const profile = estimateTokenDensity(sparse);

    expect(profile.metrics.whitespaceRatio).toBeGreaterThan(0.6);
    expect(profile.densityMultiplier).toBeLessThanOrEqual(0.85);
    expect(profile.classification).toBe("sparse");
    expect(profile.adjustedTokens).toBeLessThan(profile.rawEstimate);
  });

  it("respects custom baseCharRatio and clamps within multiplier limits", () => {
    const text = "const x = 1;";
    const profile = estimateTokenDensity(text, {
      baseCharRatio: 2.0,
      minMultiplier: 0.9,
      maxMultiplier: 1.1,
    });

    expect(profile.densityMultiplier).toBeGreaterThanOrEqual(0.9);
    expect(profile.densityMultiplier).toBeLessThanOrEqual(1.1);
  });

  it("calculates accurate word length and line metrics", () => {
    const multiline = "first line\nsecond longidentifier line\nthird line";
    const profile = estimateTokenDensity(multiline);

    expect(profile.metrics.lineCount).toBe(3);
    expect(profile.metrics.avgWordLength).toBeGreaterThan(4);
  });
});
