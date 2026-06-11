import { describe, it, expect } from "vitest";
import { classifyFile, detectSecretRisk } from "../src/classifyFile.js";

describe("classifyFile", () => {
  it("should return TypeScript for .ts files", () => {
    const result = classifyFile("src/index.ts", 100);
    expect(result.language).toBe("TypeScript");
    expect(result.isBinary).toBe(false);
  });

  it("should flag .env files with secret risk", () => {
    const result = classifyFile(".env", 50);
    expect(result.riskFlags).toContain("secret");
  });

  it("should flag .env.local with secret risk", () => {
    const result = classifyFile(".env.local", 50);
    expect(result.riskFlags).toContain("secret");
  });

  it("should mark binary extensions as isBinary", () => {
    const result = classifyFile("image.png", 1000);
    expect(result.isBinary).toBe(true);
  });

  it("should add binary risk flag for binary files", () => {
    const result = classifyFile("photo.jpg", 5000);
    expect(result.riskFlags).toContain("binary");
  });

  it("should flag large files with large-file risk", () => {
    const result = classifyFile("data.json", 600_000);
    expect(result.riskFlags).toContain("large-file");
  });

  it("should not flag small files with large-file risk", () => {
    const result = classifyFile("data.json", 100);
    expect(result.riskFlags).not.toContain("large-file");
  });

  it("should return Unknown for unrecognized extensions", () => {
    const result = classifyFile("foo.xyz", 100);
    expect(result.language).toBe("Unknown");
  });

  it("should detect lockfile risk for package-lock.json", () => {
    const result = classifyFile("package-lock.json", 1000);
    expect(result.riskFlags).toContain("lockfile");
  });

  it("should detect lockfile risk for yarn.lock", () => {
    const result = classifyFile("yarn.lock", 500);
    expect(result.riskFlags).toContain("lockfile");
  });

  it("should detect build-output risk", () => {
    const result = classifyFile("dist/bundle.js", 1000);
    expect(result.riskFlags).toContain("build-output");
  });

  it("should detect build-output risk for coverage directory", () => {
    const result = classifyFile("coverage/lcov.info", 100);
    expect(result.riskFlags).toContain("build-output");
  });

  it("should classify generated extensions", () => {
    const result = classifyFile("script.min.js", 1000);
    expect(result.isGenerated).toBe(false);
  });

  it("should detect database-dump risk", () => {
    const result = classifyFile("backup.sql", 1000);
    expect(result.riskFlags).toContain("database-dump");
  });

  it("should detect log-file risk", () => {
    const result = classifyFile("app.log", 500);
    expect(result.riskFlags).toContain("log-file");
  });

  it("should classify Dockerfile correctly", () => {
    const result = classifyFile("Dockerfile", 100);
    expect(result.language).toBe("Dockerfile");
  });

  it("should classify Makefile correctly", () => {
    const result = classifyFile("Makefile", 100);
    expect(result.language).toBe("Makefile");
  });

  it("should classify .gitignore as Ignore language", () => {
    const result = classifyFile(".gitignore", 100);
    expect(result.language).toBe("Ignore");
  });

  it("should handle PEM files as secret risk", () => {
    const result = classifyFile("key.pem", 100);
    expect(result.riskFlags).toContain("secret");
  });

  it("should handle service-account.json as secret risk", () => {
    const result = classifyFile("service-account.json", 100);
    expect(result.riskFlags).toContain("secret");
  });

  it("should classify .svg as non-binary text/XML-like file", () => {
    const result = classifyFile("icon.svg", 1000);
    expect(result.isBinary).toBe(false);
    expect(result.language).toBe("SVG");
    expect(result.riskFlags).not.toContain("binary");
  });

  it("should still flag large .svg files as large-file", () => {
    const result = classifyFile("large-icon.svg", 600_000);
    expect(result.isBinary).toBe(false);
    expect(result.language).toBe("SVG");
    expect(result.riskFlags).toContain("large-file");
  });
});

describe("detectSecretRisk", () => {
  it("should detect API key in content", () => {
    const content = 'const api_key = "sk-live_AbCdEfGhIjKlMnOpQrStUvWxYz123456";';
    const result = detectSecretRisk("config.js", content);
    expect(result).toContain("secret");
  });

  it("should detect GitHub token in content", () => {
    const content = "ghp_abcdefghijklmnopqrstuvwxyz1234567890abcd";
    const result = detectSecretRisk("config.js", content);
    expect(result).toContain("secret");
  });

  it("should detect private key in content", () => {
    const content = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA";
    const result = detectSecretRisk("config.js", content);
    expect(result).toContain("secret");
  });

  it("should detect password in content", () => {
    const content = 'password = "mySuperSecretPassword123"';
    const result = detectSecretRisk("config.js", content);
    expect(result).toContain("secret");
  });

  it("should return empty for safe content", () => {
    const content = "const name = 'hello'; const age = 42;";
    const result = detectSecretRisk("config.js", content);
    expect(result).toEqual([]);
  });

  it("should skip binary extensions", () => {
    const result = detectSecretRisk("image.png", "some binary data here");
    expect(result).toEqual([]);
  });

  it("should detect Google API key", () => {
    const content = "AIzaSyD-abcdefghijklmnopqrstuvwxyz1234567";
    const result = detectSecretRisk("config.js", content);
    expect(result).toContain("secret");
  });

  it("should detect access token", () => {
    const content = 'access_token = "abcdefghijklmnopqrstuvwxyz123456"';
    const result = detectSecretRisk("config.js", content);
    expect(result).toContain("secret");
  });
});
