import type { ModelInfo, PrivacyMode } from "@wma/core";

export interface ModelQueryFilter {
  searchTerm?: string;
  providers?: string[];
  excludeProviders?: string[];
  privacyModes?: PrivacyMode[];
  supportsTools?: boolean;
  supportsImages?: boolean;
  supportsLocal?: boolean;
  minContextWindow?: number;
  maxContextWindow?: number;
  maxInputPricePerMillion?: number;
  maxOutputPricePerMillion?: number;
  minCodingScore?: number;
  minLatencyScore?: number;
}

export type ModelSortField =
  | "cost"
  | "context"
  | "codingScore"
  | "latencyScore"
  | "compositeValue"
  | "name";

export type ModelSortDirection = "asc" | "desc";

export interface ModelQueryOptions {
  filter?: ModelQueryFilter;
  sortBy?: ModelSortField;
  sortDirection?: ModelSortDirection;
  limit?: number;
  offset?: number;
}

export interface CatalogQueryAggregate {
  totalMatched: number;
  providerCounts: Record<string, number>;
  averageInputPrice: number;
  averageOutputPrice: number;
  averageCodingScore: number;
  localModelsCount: number;
  cloudModelsCount: number;
}

export interface CatalogQueryResult {
  models: ModelInfo[];
  totalMatched: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  aggregates: CatalogQueryAggregate;
}
