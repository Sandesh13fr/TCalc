import { describe, expect, it } from "vitest";
import { fetchCatalogFeed } from "../src/fetchCatalogFeed.js";

const model = {
  id: "test/model", displayName: "Model", provider: "test", contextWindow: 1000, maxOutputTokens: 100,
  inputPricePerMillion: 0, cachedInputPricePerMillion: null, outputPricePerMillion: 0,
  supportsTools: false, supportsImages: false, supportsLocal: true, privacyMode: "local",
  codingScore: 50, latencyScore: 50, updatedAt: "2026-07-01",
};

describe("fetchCatalogFeed", () => {
  it("loads an explicitly requested HTTPS feed", async () => {
    const fetcher = async () => new Response(JSON.stringify({ version: "1.0", updatedAt: "2026-07-01", models: [model] }));
    const catalog = await fetchCatalogFeed("https://catalog.example/models.json", { fetcher: fetcher as typeof fetch });
    expect(catalog.models[0].id).toBe("test/model");
  });

  it("rejects insecure feed URLs", async () => {
    await expect(fetchCatalogFeed("http://catalog.example/models.json")).rejects.toThrow(/HTTPS/);
  });

  it("rejects oversized streamed bodies", async () => {
    const fetcher = async () => new Response("x".repeat(20));
    await expect(fetchCatalogFeed("https://catalog.example/models.json", { fetcher: fetcher as typeof fetch, maxBytes: 10 }))
      .rejects.toThrow(/exceeds 10 bytes/);
  });

  it("rejects redirects that leave HTTPS", async () => {
    const response = new Response("{}", { status: 200 });
    Object.defineProperty(response, "url", { value: "http://catalog.example/models.json" });
    const fetcher = async () => response;
    await expect(fetchCatalogFeed("https://catalog.example/models.json", { fetcher: fetcher as typeof fetch }))
      .rejects.toThrow(/redirected/);
  });
});
