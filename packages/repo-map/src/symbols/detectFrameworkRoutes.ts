import type { WorkspaceScanResult, RepoMapRoute, RepoMapFile } from "@wma/core";
import { readFileSync } from "node:fs";

export function detectFrameworkRoutes(
  scanResult: WorkspaceScanResult,
  files: RepoMapFile[],
): RepoMapRoute[] {
  const routes: RepoMapRoute[] = [];
  const pathSet = new Set(files.map((f) => f.relativePath));

  for (const file of scanResult.files) {
    if (!pathSet.has(file.relativePath)) continue;
    const rp = file.relativePath.replace(/\\/g, "/");

    // Next.js App Router (matches both root app/page.tsx and nested app/some/page.tsx, with optional src/ prefix)
    const appPageMatch = rp.match(/^(?:src\/)?app\/(?:(.*)\/)?page\.(?:js|jsx|ts|tsx)$/);
    if (appPageMatch) {
      const route = appPageMatch[1] ?? "";
      routes.push({
        relativePath: rp,
        routePattern: `/${route.replace(/\/$/, "")}`,
        framework: "nextjs",
        reason: `Next.js App Router page: ${rp}`,
      });
      continue;
    }

    const appLayoutMatch = rp.match(/^(?:src\/)?app\/(?:(.*)\/)?layout\.(?:js|jsx|ts|tsx)$/);
    if (appLayoutMatch) {
      const route = appLayoutMatch[1] ?? "";
      routes.push({
        relativePath: rp,
        routePattern: `/${route.replace(/\/$/, "")}`,
        framework: "nextjs",
        reason: `Next.js App Router layout: ${rp}`,
      });
      continue;
    }

    const appRouteMatch = rp.match(/^(?:src\/)?app\/(?:(.*)\/)?route\.(?:js|ts)$/);
    if (appRouteMatch) {
      const route = appRouteMatch[1] ?? "";
      routes.push({
        relativePath: rp,
        routePattern: `/${route.replace(/\/$/, "")}`,
        framework: "nextjs",
        reason: `Next.js App Router API route: ${rp}`,
      });
      continue;
    }

    // Next.js Pages Router (supports optional src/ prefix and normalizes root index to "/")
    const pagesMatch = rp.match(/^(?:src\/)?pages\/(.*)(?:\.js|\.jsx|\.ts|\.tsx)$/);
    if (pagesMatch) {
      let route = pagesMatch[1] === "index" ? "" : pagesMatch[1].replace(/\/index$/, "");
      route = route.replace(/\[\.\.\.(\w+)\]/g, ":$1*").replace(/\[(\w+)\]/g, ":$1");
      routes.push({
        relativePath: rp,
        routePattern: route ? `/${route}` : "/",
        framework: "nextjs",
        reason: `Next.js Pages Router: ${rp}`,
      });
      continue;
    }
  }

  // Express-style route detection
  for (const file of scanResult.files) {
    if (!pathSet.has(file.relativePath)) continue;
    if (![".ts", ".tsx", ".js", ".jsx"].includes(file.extension)) continue;
    try {
      const content = readFileSync(file.path, "utf-8");
      const routeRegex = /(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let m: RegExpExecArray | null;
      while ((m = routeRegex.exec(content)) !== null) {
        routes.push({
          relativePath: file.relativePath,
          routePattern: m[2],
          framework: "express",
          reason: `${m[1].toUpperCase()} ${m[2]}`,
        });
      }
    } catch {
      // Skip files that can't be read
    }
  }

  for (const file of scanResult.files) {
    if (!pathSet.has(file.relativePath) || ![".py", ".java", ".kt"].includes(file.extension)) continue;
    try {
      const content = readFileSync(file.path, "utf-8");
      const patterns = file.extension === ".py"
        ? [
            { regex: /@(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g, framework: "fastapi" as const },
            { regex: /@app\.route\s*\(\s*['"]([^'"]+)['"]/g, framework: "flask" as const },
          ]
        : [{ regex: /@(Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:value\s*=\s*)?['"]([^'"]+)['"]/g, framework: "spring" as const }];
      for (const { regex, framework } of patterns) {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
          const route = match[3] ?? match[2] ?? match[1];
          routes.push({ relativePath: file.relativePath, routePattern: route, framework, reason: `${framework} route: ${route}` });
        }
      }
    } catch {
      // Skip files that cannot be read.
    }
  }

  return routes;
}
