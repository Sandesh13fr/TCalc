import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { detectFrameworkRoutes } from "../../src/symbols/detectFrameworkRoutes.js";
import type { WorkspaceScanResult, WorkspaceFileInfo, RepoMapFile } from "@wma/core";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tempDir: string;

beforeAll(() => { tempDir = mkdtempSync(join(tmpdir(), "wma-routes-test-")); });
afterAll(() => { rmSync(tempDir, { recursive: true, force: true }); });

function makeFileInfo(relativePath: string, extension: string, content?: string): WorkspaceFileInfo {
  return { path: join(tempDir, relativePath.replace(/\//g, "\\")), relativePath: relativePath.replace(/\\/g, "/"), extension, language: extension === ".ts" ? "TypeScript" : extension === ".tsx" ? "TypeScript React" : "Unknown", bytes: content ? Buffer.byteLength(content, "utf-8") : 100, estimatedTokens: 25, included: true, riskFlags: [] };
}
function makeRepoMapFile(relativePath: string): RepoMapFile { return { relativePath: relativePath.replace(/\\/g, "/"), estimatedTokens: 100, reason: "test", priority: 5 }; }
function scan(files: WorkspaceFileInfo[]): WorkspaceScanResult { return { rootPath: tempDir, scannedAt: new Date().toISOString(), totalFiles: files.length, includedFiles: files.length, excludedFiles: 0, totalBytes: files.length * 100, includedBytes: files.length * 100, totalEstimatedTokens: files.length * 25, includedTokens: files.length * 25, files, folders: [], languages: [], warnings: [], riskFiles: [] }; }

describe("detectFrameworkRoutes", () => {
  it("detects root, src and package-nested Next.js app routes relative to the router root", () => {
    const files = [
      makeFileInfo("app/page.jsx", ".jsx"),
      makeFileInfo("src/app/users/[id]/page.tsx", ".tsx"),
      makeFileInfo("apps/dashboard/app/docs/page.tsx", ".tsx"),
      makeFileInfo("packages/admin/src/app/api/users/route.ts", ".ts"),
      makeFileInfo("next.config.js", ".js"),
      makeFileInfo("apps/dashboard/next.config.js", ".js"),
      makeFileInfo("packages/admin/next.config.ts", ".ts"),
    ];
    const routes = detectFrameworkRoutes(scan(files), files.map((f) => makeRepoMapFile(f.relativePath)));
    expect(routes.find((r) => r.relativePath === "app/page.jsx")?.routePattern).toBe("/");
    expect(routes.find((r) => r.relativePath === "src/app/users/[id]/page.tsx")?.routePattern).toBe("/users/:id");
    expect(routes.find((r) => r.relativePath === "apps/dashboard/app/docs/page.tsx")?.routePattern).toBe("/docs");
    expect(routes.find((r) => r.relativePath === "packages/admin/src/app/api/users/route.ts")?.routePattern).toBe("/api/users");
  });

  it("detects src and package-nested Pages Router paths", () => {
    const files = [
      makeFileInfo("src/pages/index.tsx", ".tsx"),
      makeFileInfo("apps/site/pages/blog/[slug].tsx", ".tsx"),
      makeFileInfo("next.config.mjs", ".mjs"),
      makeFileInfo("apps/site/next.config.js", ".js"),
    ];
    const routes = detectFrameworkRoutes(scan(files), files.map((f) => makeRepoMapFile(f.relativePath)));
    expect(routes.find((r) => r.relativePath === "src/pages/index.tsx")?.routePattern).toBe("/");
    expect(routes.find((r) => r.relativePath === "apps/site/pages/blog/[slug].tsx")?.routePattern).toBe("/blog/:slug");
  });

  it("does not classify app routes in a non-Next package", () => {
    const packagePath = join(tempDir, "packages", "admin", "package.json");
    const pagePath = join(tempDir, "packages", "admin", "app", "users", "page.tsx");
    mkdirSync(join(tempDir, "packages", "admin", "app", "users"), { recursive: true });
    writeFileSync(packagePath, JSON.stringify({ dependencies: { react: "^19.0.0" } }), "utf-8");
    writeFileSync(pagePath, "export default function Page() { return null; }", "utf-8");

    const manifest = makeFileInfo("packages/admin/package.json", ".json");
    manifest.path = packagePath;
    const page = makeFileInfo("packages/admin/app/users/page.tsx", ".tsx");
    page.path = pagePath;
    const files = [manifest, page];
    expect(detectFrameworkRoutes(scan(files), files.map((f) => makeRepoMapFile(f.relativePath)))).toEqual([]);
  });

  it("does not treat an unrelated app directory without Next.js route files as a route", () => {
    const files = [makeFileInfo("lib/app/helpers.ts", ".ts")];
    expect(detectFrameworkRoutes(scan(files), files.map((f) => makeRepoMapFile(f.relativePath)))).toEqual([]);
  });

  it("detects Express-style routes from file content", () => {
    const content = `const app = express();\napp.get("/api/health", (req, res) => {});\napp.post("/api/data", (req, res) => {});\nconst router = Router();\nrouter.get("/users", (req, res) => {});`;
    writeFileSync(join(tempDir, "server.ts"), content, "utf-8");
    const files = [makeFileInfo("server.ts", ".ts", content)];
    const patterns = detectFrameworkRoutes(scan(files), files.map((f) => makeRepoMapFile(f.relativePath))).map((r) => r.routePattern);
    expect(patterns).toContain("/api/health"); expect(patterns).toContain("/api/data"); expect(patterns).toContain("/users");
  });
});
