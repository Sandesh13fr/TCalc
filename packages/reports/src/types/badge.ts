export type BadgeStyle = "flat" | "flat-square" | "pill" | "gradient";

export type StandardBadgeColor =
  | "brightgreen"
  | "green"
  | "yellowgreen"
  | "yellow"
  | "orange"
  | "red"
  | "blue"
  | "purple";

export interface TokenBadgeOptions {
  style?: BadgeStyle;
  label?: string;
  targetModelContext?: number;
  targetModelName?: string;
  customColor?: string;
  logoSvg?: string;
  compactNumber?: boolean;
}

export interface TokenBadgeResult {
  svg: string;
  label: string;
  value: string;
  color: string;
  tokens: number;
  width: number;
  height: number;
  markdownSnippet: string;
  htmlSnippet: string;
}
