export { scanWorkspace, walkFiles, resolveIgnoreRules } from "./scanWorkspace.js";
export type { ScanOptions } from "./scanWorkspace.js";
export { classifyFile, detectSecretRisk } from "./classifyFile.js";
export { IgnoreResolver } from "./ignoreResolver.js";
export type { IgnoreResult, IgnoreResolverOptions } from "./ignoreResolver.js";

export { loadScanCache, saveScanCache, SCAN_CACHE_VERSION } from "./scanCache.js";
export type { ScanCacheEntry } from "./scanCache.js";

export {
  computeContentChecksum,
  computeFileChecksum,
  verifyCacheEntry,
  ScanCacheManager,
} from "./scanCacheChecksum.js";
export type {
  CacheVerificationStrategy,
  CacheHitMethod,
  CacheLookupResult,
  ScanCacheTelemetry,
} from "./scanCacheChecksum.js";
