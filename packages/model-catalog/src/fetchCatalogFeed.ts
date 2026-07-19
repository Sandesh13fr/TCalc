import type { ModelCatalog } from "@wma/core";
import { parseModelCatalog, validateModelCatalog } from "./loadModelCatalog.js";

export interface CatalogFeedOptions {
  timeoutMs?: number;
  maxBytes?: number;
  fetcher?: typeof fetch;
}

export async function fetchCatalogFeed(url: string, options: CatalogFeedOptions = {}): Promise<ModelCatalog> {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:") throw new TypeError("Catalog feeds must use HTTPS");
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? 1_000_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError("Catalog feed timeout must be a positive integer");
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new TypeError("Catalog feed byte limit must be a positive integer");
  const response = await (options.fetcher ?? fetch)(parsedUrl, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Catalog feed returned HTTP ${response.status}`);
  if (response.url && new URL(response.url).protocol !== "https:") throw new Error("Catalog feed redirected to a non-HTTPS URL");
  const declaredBytes = Number(response.headers.get("content-length") ?? 0);
  if (declaredBytes > maxBytes) throw new Error(`Catalog feed exceeds ${maxBytes} bytes`);
  const text = await readLimitedBody(response, maxBytes);
  const catalog = parseModelCatalog(JSON.parse(text));
  const errors = validateModelCatalog(catalog.models);
  if (catalog.models.length === 0 || errors.length > 0) throw new Error(`Invalid catalog feed: ${errors[0] ?? "no models"}`);
  return catalog;
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error(`Catalog feed exceeds ${maxBytes} bytes`);
    }
    text += decoder.decode(value, { stream: true });
  }
}
