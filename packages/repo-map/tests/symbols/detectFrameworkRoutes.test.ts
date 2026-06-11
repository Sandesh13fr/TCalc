import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { detectFrameworkRoutes } from "../../src/symbols/detectFrameworkRoutes.js";
import type { WorkspaceScanResult, WorkspaceFileInfo, RepoMapFile } from "@wma/core";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "wma-routes-test-"));
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function makeFileInfo(relativePath: string, extension: string, content?: string): WorkspaceFileInfo {
  return {
    path: join(tempDir, relativePath.replace(/\//g, "\\")),
    relativePath: relativePath.replace(/\\/g, "/"),
    extension,
    language: extension === ".ts" ? "TypeScript" : extension === ".tsx" ? "TypeScript React" : "Unknown",
    bytes: content ? Buffer.byteLength(content, "utf-8") : 100,
    estimatedTokens: 25,
    included: true,
    riskFlags: [],
  };
}

function makeRepoMapFile(relativePath: string): RepoMapFile {
  return {
    relativePath: relativePath.replace(/\\/g, "/"),
    estimatedTokens: 100,
    reason: "test",
    priority: 5,
  };
}

describe("detectFrameworkRoutes", () => {
  it("detects Next.js app routes", () => {
    const files = [makeFileInfo("app/page.tsx", ".tsx"), makeFileInfo("app/api/hello/route.ts", ".ts")];
    const important = files.map((f) => makeRepoMapFile(f.relativePath));
    const scanResult: WorkspaceScanResult = {
      rootPath: tempDir,
      scannedAt: new Date().toISOString(),
      totalFiles: 2,
      includedFiles: 2,
      excludedFiles: 0,
      totalBytes: 200,
      includedBytes: 200,
      totalEstimatedTokens: 50,
      includedTokens: 50,
      files,
      folders: [],
      languages: [],
      warnings: [],
      riskFiles: [],
    };
    const routes = detectFrameworkRoutes(scanResult, important);
    expect(routes.length).toBeGreaterThanOrEqual(2);
    expect(routes.some((r) => r.relativePath === "app/page.tsx")).toBe(true);
    expect(routes.some((r) => r.relativePath === "app/api/hello/route.ts")).toBe(true);
  });

  it("detects Next.js pages routes", () => {
    const files = [makeFileInfo("pages/index.tsx", ".tsx")];
    const important = files.map((f) => makeRepoMapFile(f.relativePath));
    const scanResult: WorkspaceScanResult = {
      rootPath: tempDir,
      scannedAt: new Date().toISOString(),
      totalFiles: 1,
      includedFiles: 1,
      excludedFiles: 0,
      totalBytes: 100,
      includedBytes: 100,
      totalEstimatedTokens: 25,
      includedTokens: 25,
      files,
      folders: [],
      languages: [],
      warnings: [],
      riskFiles: [],
    };
    const routes = detectFrameworkRoutes(scanResult, important);
    expect(routes.some((r) => r.framework === "nextjs")).toBe(true);
  });

  it("detects Express-style routes from file content", () => {
    const content = `
const app = express();
app.get("/api/health", (req, res) => {});
app.post("/api/data", (req, res) => {});
const router = Router();
router.get("/users", (req, res) => {});
`;
    writeFileSync(join(tempDir, "server.ts"), content, "utf-8");
    const files = [makeFileInfo("server.ts", ".ts", content)];
    const important = files.map((f) => makeRepoMapFile(f.relativePath));
    const scanResult: WorkspaceScanResult = {
      rootPath: tempDir,
      scannedAt: new Date().toISOString(),
      totalFiles: 1,
      includedFiles: 1,
      excludedFiles: 0,
      totalBytes: Buffer.byteLength(content, "utf-8"),
      includedBytes: Buffer.byteLength(content, "utf-8"),
      totalEstimatedTokens: 50,
      includedTokens: 50,
      files,
      folders: [],
      languages: [],
      warnings: [],
      riskFiles: [],
    };
    const routes = detectFrameworkRoutes(scanResult, important);
    const patterns = routes.map((r) => r.routePattern);
    expect(patterns).toContain("/api/health");
    expect(patterns).toContain("/api/data");
    expect(patterns).toContain("/users");
  });
});
