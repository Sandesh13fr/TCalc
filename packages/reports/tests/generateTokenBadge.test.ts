import { describe, it, expect } from "vitest";
import {
  formatTokenMetric,
  resolveBadgeColor,
  generateBadgeSvg,
  generateTokenBadge,
  generateModelFitBadge,
} from "../src/generateTokenBadge.js";

describe("formatTokenMetric", () => {
  it("formats sub-thousand tokens directly", () => {
    expect(formatTokenMetric(750)).toBe("750 tokens");
  });

  it("formats thousands in compact 'k' representation", () => {
    expect(formatTokenMetric(15_000)).toBe("15k tokens");
    expect(formatTokenMetric(42_500)).toBe("42.5k tokens");
  });

  it("formats millions in compact 'M' representation", () => {
    expect(formatTokenMetric(1_000_000)).toBe("1M tokens");
    expect(formatTokenMetric(1_250_000)).toBe("1.3M tokens");
  });

  it("formats non-compact numbers with commas", () => {
    expect(formatTokenMetric(120_000, false)).toBe("120,000 tokens");
  });
});

describe("resolveBadgeColor", () => {
  it("resolves default color buckets by absolute token counts", () => {
    expect(resolveBadgeColor(25_000)).toBe("#44cc11"); // brightgreen
    expect(resolveBadgeColor(50_000)).toBe("#97ca00"); // green
    expect(resolveBadgeColor(100_000)).toBe("#dfb317"); // yellow
    expect(resolveBadgeColor(180_000)).toBe("#fe7d37"); // orange
    expect(resolveBadgeColor(300_000)).toBe("#e05d44"); // red
  });

  it("resolves dynamic color buckets relative to target context window", () => {
    const targetContext = 200_000;
    expect(resolveBadgeColor(50_000, targetContext)).toBe("#44cc11"); // 25% <= 40%
    expect(resolveBadgeColor(120_000, targetContext)).toBe("#97ca00"); // 60% <= 70%
    expect(resolveBadgeColor(160_000, targetContext)).toBe("#dfb317"); // 80% <= 85%
    expect(resolveBadgeColor(195_000, targetContext)).toBe("#fe7d37"); // 97.5% <= 100%
    expect(resolveBadgeColor(250_000, targetContext)).toBe("#e05d44"); // 125% > 100%
  });
});

describe("generateBadgeSvg", () => {
  it("generates valid standalone SVG element with correct accessibility title", () => {
    const { svg, width, height } = generateBadgeSvg("workspace", "42k tokens", "green", "flat");

    expect(svg).toContain("<svg xmlns=");
    expect(svg).toContain("<title>workspace: 42k tokens</title>");
    expect(svg).toContain('rx="3"');
    expect(width).toBeGreaterThan(50);
    expect(height).toBe(20);
  });

  it("respects pill and flat-square border radius styles", () => {
    const pill = generateBadgeSvg("status", "ready", "blue", "pill");
    expect(pill.svg).toContain('rx="10"');

    const square = generateBadgeSvg("status", "ready", "blue", "flat-square");
    expect(square.svg).toContain('rx="0"');
  });

  it("escapes XML characters in label and value", () => {
    const { svg } = generateBadgeSvg("test & verify", "<50k>", "#44cc11");
    expect(svg).toContain("test &amp; verify");
    expect(svg).toContain("&lt;50k&gt;");
  });
});

describe("generateTokenBadge", () => {
  it("generates complete badge result from number of tokens", () => {
    const badge = generateTokenBadge(48_000, {
      label: "repo size",
      style: "pill",
    });

    expect(badge.label).toBe("repo size");
    expect(badge.value).toBe("48k tokens");
    expect(badge.tokens).toBe(48_000);
    expect(badge.svg).toContain("<svg");
    expect(badge.markdownSnippet).toContain("![repo size](data:image/svg+xml");
    expect(badge.htmlSnippet).toContain('<img src="data:image/svg+xml');
  });

  it("generates complete badge result from scan result object", () => {
    const badge = generateTokenBadge({ totalEstimatedTokens: 95_000 });
    expect(badge.tokens).toBe(95_000);
    expect(badge.value).toBe("95k tokens");
  });
});

describe("generateModelFitBadge", () => {
  it("generates percentage-based model context fit badge", () => {
    const badge = generateModelFitBadge(100_000, {
      displayName: "Claude 3.5 Sonnet",
      contextWindow: 200_000,
    });

    expect(badge.label).toBe("Claude 3.5 Sonnet fit");
    expect(badge.value).toBe("50% (100k tokens)");
    expect(badge.color).toBe("#97ca00"); // 50% <= 70% green
    expect(badge.svg).toContain("Claude 3.5 Sonnet fit");
  });
});
