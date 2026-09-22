import type { ModelInfo } from "@wma/core";
import type {
  CatalogQueryAggregate,
  CatalogQueryResult,
  ModelQueryOptions,
  ModelSortDirection,
  ModelSortField,
} from "./types/catalogQuery.js";

function calculateCompositeScore(model: ModelInfo): number {
  const coding = model.codingScore ?? 50;
  const blendedPrice = (model.inputPricePerMillion * 3 + model.outputPricePerMillion) / 4;
  const costScore = blendedPrice === 0 ? 100 : Math.max(0, 100 - blendedPrice * 6);
  return Number(((coding * 0.7) + (costScore * 0.3)).toFixed(2));
}

function matchesSearchTerm(model: ModelInfo, term: string): boolean {
  const cleanTerm = term.trim().toLowerCase();
  if (!cleanTerm) return true;

  const idMatch = model.id.toLowerCase().includes(cleanTerm);
  const nameMatch = model.displayName.toLowerCase().includes(cleanTerm);
  const providerMatch = model.provider.toLowerCase().includes(cleanTerm);

  return idMatch || nameMatch || providerMatch;
}

function sortModels(
  models: ModelInfo[],
  field: ModelSortField = "compositeValue",
  direction: ModelSortDirection = "desc",
): ModelInfo[] {
  const sorted = [...models];

  sorted.sort((a, b) => {
    let cmp = 0;

    switch (field) {
      case "cost": {
        const costA = (a.inputPricePerMillion * 3 + a.outputPricePerMillion) / 4;
        const costB = (b.inputPricePerMillion * 3 + b.outputPricePerMillion) / 4;
        cmp = costA - costB;
        break;
      }
      case "context": {
        cmp = a.contextWindow - b.contextWindow;
        break;
      }
      case "codingScore": {
        cmp = (a.codingScore ?? 0) - (b.codingScore ?? 0);
        break;
      }
      case "latencyScore": {
        cmp = (a.latencyScore ?? 0) - (b.latencyScore ?? 0);
        break;
      }
      case "compositeValue": {
        cmp = calculateCompositeScore(a) - calculateCompositeScore(b);
        break;
      }
      case "name": {
        cmp = a.displayName.localeCompare(b.displayName);
        break;
      }
    }

    return direction === "asc" ? cmp : -cmp;
  });

  return sorted;
}

function computeAggregates(models: ModelInfo[]): CatalogQueryAggregate {
  if (models.length === 0) {
    return {
      totalMatched: 0,
      providerCounts: {},
      averageInputPrice: 0,
      averageOutputPrice: 0,
      averageCodingScore: 0,
      localModelsCount: 0,
      cloudModelsCount: 0,
    };
  }

  const providerCounts: Record<string, number> = {};
  let totalInputPrice = 0;
  let totalOutputPrice = 0;
  let totalCodingScore = 0;
  let scoredCount = 0;
  let localCount = 0;
  let cloudCount = 0;

  for (const m of models) {
    providerCounts[m.provider] = (providerCounts[m.provider] ?? 0) + 1;
    totalInputPrice += m.inputPricePerMillion;
    totalOutputPrice += m.outputPricePerMillion;

    if (m.codingScore !== null && m.codingScore !== undefined) {
      totalCodingScore += m.codingScore;
      scoredCount++;
    }

    if (m.supportsLocal || m.privacyMode === "local") {
      localCount++;
    } else {
      cloudCount++;
    }
  }

  return {
    totalMatched: models.length,
    providerCounts,
    averageInputPrice: Number((totalInputPrice / models.length).toFixed(3)),
    averageOutputPrice: Number((totalOutputPrice / models.length).toFixed(3)),
    averageCodingScore: scoredCount > 0 ? Number((totalCodingScore / scoredCount).toFixed(1)) : 0,
    localModelsCount: localCount,
    cloudModelsCount: cloudCount,
  };
}

export function queryModelCatalog(
  models: ModelInfo[],
  options: ModelQueryOptions = {},
): CatalogQueryResult {
  const {
    filter = {},
    sortBy = "compositeValue",
    sortDirection = "desc",
    offset = 0,
    limit = 50,
  } = options;

  const filtered = models.filter((model) => {
    if (filter.searchTerm && !matchesSearchTerm(model, filter.searchTerm)) {
      return false;
    }

    if (filter.providers && filter.providers.length > 0) {
      const matchProvider = filter.providers.some(
        (p) => p.toLowerCase() === model.provider.toLowerCase(),
      );
      if (!matchProvider) return false;
    }

    if (filter.excludeProviders && filter.excludeProviders.length > 0) {
      const isExcluded = filter.excludeProviders.some(
        (p) => p.toLowerCase() === model.provider.toLowerCase(),
      );
      if (isExcluded) return false;
    }

    if (filter.privacyModes && filter.privacyModes.length > 0) {
      if (!filter.privacyModes.includes(model.privacyMode)) {
        return false;
      }
    }

    if (filter.supportsTools !== undefined && model.supportsTools !== filter.supportsTools) {
      return false;
    }

    if (filter.supportsImages !== undefined && model.supportsImages !== filter.supportsImages) {
      return false;
    }

    if (filter.supportsLocal !== undefined && model.supportsLocal !== filter.supportsLocal) {
      return false;
    }

    if (filter.minContextWindow !== undefined && model.contextWindow < filter.minContextWindow) {
      return false;
    }

    if (filter.maxContextWindow !== undefined && model.contextWindow > filter.maxContextWindow) {
      return false;
    }

    if (
      filter.maxInputPricePerMillion !== undefined &&
      model.inputPricePerMillion > filter.maxInputPricePerMillion
    ) {
      return false;
    }

    if (
      filter.maxOutputPricePerMillion !== undefined &&
      model.outputPricePerMillion > filter.maxOutputPricePerMillion
    ) {
      return false;
    }

    if (filter.minCodingScore !== undefined) {
      if (model.codingScore === null || model.codingScore < filter.minCodingScore) {
        return false;
      }
    }

    if (filter.minLatencyScore !== undefined) {
      if (model.latencyScore === null || model.latencyScore < filter.minLatencyScore) {
        return false;
      }
    }

    return true;
  });

  const aggregates = computeAggregates(filtered);
  const sorted = sortModels(filtered, sortBy, sortDirection);

  const paginated = sorted.slice(offset, offset + limit);
  const hasMore = offset + limit < sorted.length;

  return {
    models: paginated,
    totalMatched: sorted.length,
    offset,
    limit,
    hasMore,
    aggregates,
  };
}
