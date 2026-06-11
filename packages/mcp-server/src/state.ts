import type { WorkspaceScanResult, RecommendationResult, RepoMapResult, ModelCatalog } from "@wma/core";

interface ServerState {
  latestScan: WorkspaceScanResult | null;
  latestRecommendation: RecommendationResult | null;
  latestRepoMap: RepoMapResult | null;
  latestCatalog: ModelCatalog | null;
}

const state: ServerState = {
  latestScan: null,
  latestRecommendation: null,
  latestRepoMap: null,
  latestCatalog: null,
};

export function setLatestScan(scan: WorkspaceScanResult): void {
  state.latestScan = scan;
}

export function getLatestScan(): WorkspaceScanResult | null {
  return state.latestScan;
}

export function setLatestRecommendation(rec: RecommendationResult): void {
  state.latestRecommendation = rec;
}

export function getLatestRecommendation(): RecommendationResult | null {
  return state.latestRecommendation;
}

export function setLatestRepoMap(map: RepoMapResult): void {
  state.latestRepoMap = map;
}

export function getLatestRepoMap(): RepoMapResult | null {
  return state.latestRepoMap;
}

export function setLatestCatalog(catalog: ModelCatalog): void {
  state.latestCatalog = catalog;
}

export function getLatestCatalog(): ModelCatalog | null {
  return state.latestCatalog;
}

export function clearState(): void {
  state.latestScan = null;
  state.latestRecommendation = null;
  state.latestRepoMap = null;
  state.latestCatalog = null;
}

export { state };
export type { ServerState };