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
  it("detects Next.js app routes (including src/ directory convention)", () => {
    const files = [
      makeFileInfo("app/page.jsx", ".jsx"),
      makeFileInfo("app/api/hello/route.js", ".js"),
      makeFileInfo("src/app/dashboard/page.tsx", ".tsx"),
      makeFileInfo("src/app/layout.tsx", ".tsx"),
      makeFileInfo("src/app/api/user/route.ts", ".ts"),
    ];
    const important = files.map((f) => makeRepoMapFile(f.relativePath));
    const scanResult: WorkspaceScanResult = {
      rootPath: tempDir,
      scannedAt: new Date().toISOString(),
      totalFiles: files.length,
      includedFiles: files.length,
      excludedFiles: 0,
      totalBytes: 500,
      includedBytes: 500,
      totalEstimatedTokens: 125,
      includedTokens: 125,
      files,
      folders: [],
      languages: [],
      warnings: [],
      riskFiles: [],
    };
    const routes = detectFrameworkRoutes(scanResult, important);
    expect(routes.length).toBe(5);

    const rootPage = routes.find((r) => r.relativePath === "app/page.jsx");
    expect(rootPage).toBeDefined();
    expect(rootPage?.routePattern).toBe("/");

    const apiRoute = routes.find((r) => r.relativePath === "app/api/hello/route.js");
    expect(apiRoute).toBeDefined();
    expect(apiRoute?.routePattern).toBe("/api/hello");

    const srcDashboard = routes.find((r) => r.relativePath === "src/app/dashboard/page.tsx");
    expect(srcDashboard).toBeDefined();
    expect(srcDashboard?.routePattern).toBe("/dashboard");

    const srcLayout = routes.find((r) => r.relativePath === "src/app/layout.tsx");
    expect(srcLayout).toBeDefined();
    expect(srcLayout?.routePattern).toBe("/");

    const srcApi = routes.find((r) => r.relativePath === "src/app/api/user/route.ts");
    expect(srcApi).toBeDefined();
    expect(srcApi?.routePattern).toBe("/api/user");
  });

  it("detects Next.js pages routes (including src/ directory convention and root index)", () => {
    const files = [
      makeFileInfo("pages/index.tsx", ".tsx"),
      makeFileInfo("src/pages/index.tsx", ".tsx"),
      makeFileInfo("pages/about.tsx", ".tsx"),
      makeFileInfo("src/pages/blog/[slug].tsx", ".tsx"),
      makeFileInfo("pages/docs/[...slug].tsx", ".tsx"),
    ];
    const important = files.map((f) => makeRepoMapFile(f.relativePath));
    const scanResult: WorkspaceScanResult = {
      rootPath: tempDir,
      scannedAt: new Date().toISOString(),
      totalFiles: files.length,
      includedFiles: files.length,
      excludedFiles: 0,
      totalBytes: 500,
      includedBytes: 500,
      totalEstimatedTokens: 125,
      includedTokens: 125,
      files,
      folders: [],
      languages: [],
      warnings: [],
      riskFiles: [],
    };
    const routes = detectFrameworkRoutes(scanResult, important);
    expect(routes.length).toBe(5);

    const rootIndex = routes.find((r) => r.relativePath === "pages/index.tsx");
    expect(rootIndex).toBeDefined();
    expect(rootIndex?.routePattern).toBe("/");

    const srcIndex = routes.find((r) => r.relativePath === "src/pages/index.tsx");
    expect(srcIndex).toBeDefined();
    expect(srcIndex?.routePattern).toBe("/");

    const aboutPage = routes.find((r) => r.relativePath === "pages/about.tsx");
    expect(aboutPage).toBeDefined();
    expect(aboutPage?.routePattern).toBe("/about");

    const dynamicSlug = routes.find((r) => r.relativePath === "src/pages/blog/[slug].tsx");
    expect(dynamicSlug).toBeDefined();
    expect(dynamicSlug?.routePattern).toBe("/blog/:slug");

    const catchAll = routes.find((r) => r.relativePath === "pages/docs/[...slug].tsx");
    expect(catchAll).toBeDefined();
    expect(catchAll?.routePattern).toBe("/docs/:slug*");
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
