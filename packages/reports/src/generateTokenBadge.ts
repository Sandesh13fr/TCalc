import type { BadgeStyle, TokenBadgeOptions, TokenBadgeResult } from "./types/badge.js";

const COLOR_MAP: Record<string, string> = {
  brightgreen: "#44cc11",
  green: "#97ca00",
  yellowgreen: "#a4a61d",
  yellow: "#dfb317",
  orange: "#fe7d37",
  red: "#e05d44",
  blue: "#007ec6",
  purple: "#8a2be2",
};

export function formatTokenMetric(tokens: number, compact = true): string {
  if (!compact) {
    return `${tokens.toLocaleString("en-US")} tokens`;
  }

  if (tokens >= 1_000_000) {
    const val = (tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1);
    return `${val}M tokens`;
  }
  if (tokens >= 1_000) {
    const val = (tokens / 1_000).toFixed(tokens % 1_000 === 0 ? 0 : 1);
    return `${val}k tokens`;
  }
  return `${tokens} tokens`;
}

export function resolveBadgeColor(tokens: number, targetContext?: number): string {
  if (targetContext && targetContext > 0) {
    const ratio = tokens / targetContext;
    if (ratio <= 0.4) return COLOR_MAP.brightgreen;
    if (ratio <= 0.7) return COLOR_MAP.green;
    if (ratio <= 0.85) return COLOR_MAP.yellow;
    if (ratio <= 1.0) return COLOR_MAP.orange;
    return COLOR_MAP.red;
  }

  if (tokens <= 32_000) return COLOR_MAP.brightgreen;
  if (tokens <= 64_000) return COLOR_MAP.green;
  if (tokens <= 128_000) return COLOR_MAP.yellow;
  if (tokens <= 200_000) return COLOR_MAP.orange;
  return COLOR_MAP.red;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateBadgeSvg(
  label: string,
  value: string,
  rawColor: string,
  style: BadgeStyle = "flat",
): { svg: string; width: number; height: number } {
  const color = COLOR_MAP[rawColor] ?? (rawColor.startsWith("#") ? rawColor : `#${rawColor}`);
  const safeLabel = escapeXml(label);
  const safeValue = escapeXml(value);

  // Approximate shields.io font width calculation
  const labelWidth = Math.max(20, Math.round(label.length * 6.6 + 14));
  const valueWidth = Math.max(20, Math.round(value.length * 6.6 + 14));
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  const labelX = Math.round(labelWidth / 2);
  const valueX = labelWidth + Math.round(valueWidth / 2);

  const borderRadius = style === "pill" ? 10 : style === "flat-square" ? 0 : 3;

  const gradientBlock =
    style === "gradient"
      ? `  <linearGradient id="g" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="100%" stop-opacity=".1"/>
  </linearGradient>`
      : `  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="100%" stop-opacity=".1"/>
  </linearGradient>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${safeLabel}: ${safeValue}">
  <title>${safeLabel}: ${safeValue}</title>
${gradientBlock}
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${borderRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelX * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 14) * 10}">${safeLabel}</text>
    <text x="${labelX * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth - 14) * 10}">${safeLabel}</text>
    <text aria-hidden="true" x="${valueX * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueWidth - 14) * 10}">${safeValue}</text>
    <text x="${valueX * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(valueWidth - 14) * 10}">${safeValue}</text>
  </g>
</svg>`;

  return { svg, width: totalWidth, height };
}

export function generateTokenBadge(
  scanResultOrTokens: { totalEstimatedTokens: number } | number,
  options: TokenBadgeOptions = {},
): TokenBadgeResult {
  const tokens =
    typeof scanResultOrTokens === "number"
      ? scanResultOrTokens
      : scanResultOrTokens.totalEstimatedTokens;

  const label = options.label ?? "workspace tokens";
  const compact = options.compactNumber ?? true;
  const value = formatTokenMetric(tokens, compact);
  const color = options.customColor ?? resolveBadgeColor(tokens, options.targetModelContext);
  const style = options.style ?? "flat";

  const { svg, width, height } = generateBadgeSvg(label, value, color, style);

  const markdownSnippet = `![${label}](data:image/svg+xml;utf8,${encodeURIComponent(svg)})`;
  const htmlSnippet = `<img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" alt="${escapeXml(label)}: ${escapeXml(value)}" />`;

  return {
    svg,
    label,
    value,
    color,
    tokens,
    width,
    height,
    markdownSnippet,
    htmlSnippet,
  };
}

export function generateModelFitBadge(
  tokens: number,
  model: { displayName: string; contextWindow: number },
  style: BadgeStyle = "flat",
): TokenBadgeResult {
  const percentage = Math.min(100, Math.round((tokens / model.contextWindow) * 100));
  const label = `${model.displayName} fit`;
  const value = `${percentage}% (${formatTokenMetric(tokens, true)})`;
  const color = resolveBadgeColor(tokens, model.contextWindow);

  const { svg, width, height } = generateBadgeSvg(label, value, color, style);

  return {
    svg,
    label,
    value,
    color,
    tokens,
    width,
    height,
    markdownSnippet: `![${label}](data:image/svg+xml;utf8,${encodeURIComponent(svg)})`,
    htmlSnippet: `<img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" alt="${escapeXml(label)}: ${escapeXml(value)}" />`,
  };
}
