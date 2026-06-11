export type PrivacyMode = "cloud" | "local" | "hybrid";

export interface ModelInfo {
  id: string;
  displayName: string;
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputPricePerMillion: number;
  cachedInputPricePerMillion: number | null;
  outputPricePerMillion: number;
  supportsTools: boolean;
  supportsImages: boolean;
  supportsLocal: boolean;
  privacyMode: PrivacyMode;
  codingScore: number | null;
  latencyScore: number | null;
  updatedAt: string;
}

export interface ModelCatalog {
  version: string;
  updatedAt: string;
  models: ModelInfo[];
}
