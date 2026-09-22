import type { WorkspaceScanResult, RepoMapRoute, RepoMapFile } from "@wma/core";
import { readFileSync } from "node:fs";

function hasNextProjectSignal(
  root: string,
  pathSet: Set<string>,
  fileByRelativePath: Map<string, WorkspaceScanResult["files"][number]>,
): boolean {
  const prefix = root ? `${root}/` : "";
  if (["next.config.js", "next.config.mjs", "next.config.ts"].some((name) => pathSet.has(`${prefix}${name}`))) {
    return true;
  }

  const manifestPath = `${prefix}package.json`;
  const manifest = fileByRelativePath.get(manifestPath);
  if (!manifest) return false;
  try {
    const pkg = JSON.parse(readFileSync(manifest.path, "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    return Boolean(pkg.dependencies?.next || pkg.devDependencies?.next || pkg.peerDependencies?.next);
  } catch {
    return false;
  }
}

function nextRouterRelativePath(
  relativePath: string,
  pathSet: Set<string>,
  fileByRelativePath: Map<string, WorkspaceScanResult["files"][number]>,
): { router: "app" | "pages"; path: string } | null {
  const segments = relativePath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const isSrcRouter = segments[index] === "src" && (segments[index + 1] === "app" || segments[index + 1] === "pages");
    const isDirectRouter = segments[index] === "app" || segments[index] === "pages";
    if (!isSrcRouter && !isDirectRouter) continue;

    const routerIndex = isSrcRouter ? index + 1 : index;
    const rootSegments = segments.slice(0, isSrcRouter ? index : routerIndex);
    const root = rootSegments.join("/");
    if (!hasNextProjectSignal(root, pathSet, fileByRelativePath)) continue;

    return {
      router: segments[routerIndex] as "app" | "pages",
      path: segments.slice(routerIndex + 1).join("/"),
    };
  }
  return null;
}

function normalizeDynamicSegments(route: string): string {
  return route
    .replace(/\[\[\.\.\.(\w+)\]\]/g, ":$1*?")
    .replace(/\[\.\.\.(\w+)\]/g, ":$1*")
    .replace(/\[(\w+)\]/g, ":$1");
}

function normalizeAppRoute(route: string): string | null {
  const segments = route.split("/").filter(Boolean);
  if (segments.some((segment) => segment.startsWith("_"))) return null;
  return normalizeDynamicSegments(segments.filter((segment) => !/^\(.+\)$/.test(segment)).join("/"));
}

function normalizePagesRoute(route: string): string | null {
  const segments = route.split("/").filter(Boolean);
  const leaf = segments.at(-1);
  if (leaf && ["_app", "_document", "_error"].includes(leaf)) return null;
  if (leaf === "index") segments.pop();
  return normalizeDynamicSegments(segments.join("/"));
}

export function detectFrameworkRoutes(
  scanResult: WorkspaceScanResult,
  files: RepoMapFile[],
): RepoMapRoute[] {
  const routes: RepoMapRoute[] = [];
  const pathSet = new Set(files.map((f) => f.relativePath));
  const fileByRelativePath = new Map(scanResult.files.map((file) => [file.relativePath.replace(/\\/g, "/"), file]));

  for (const file of scanResult.files) {
    if (!pathSet.has(file.relativePath)) continue;
    const rp = file.relativePath.replace(/\\/g, "/");
    const routerPath = nextRouterRelativePath(rp, pathSet, fileByRelativePath);
    if (!routerPath) continue;

    if (routerPath.router === "app") {
      const match = routerPath.path.match(/^(?:(.*)\/)?(page|layout|route)\.(?:js|jsx|ts|tsx)$/);
      if (!match) continue;
      const route = normalizeAppRoute(match[1] ?? "");
      if (route === null) continue;
      routes.push({
        relativePath: rp,
        routePattern: `/${route}`,
        framework: "nextjs",
        reason: `Next.js App Router ${match[2]}: ${rp}`,
      });
      continue;
    }

    const pagesMatch = routerPath.path.match(/^(.*)(?:\.js|\.jsx|\.ts|\.tsx)$/);
    if (pagesMatch) {
      const route = normalizePagesRoute(pagesMatch[1]);
      if (route === null) continue;
      routes.push({
        relativePath: rp,
        routePattern: `/${route}`,
        framework: "nextjs",
        reason: `Next.js Pages Router: ${rp}`,
      });
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
        routes.push({ relativePath: file.relativePath, routePattern: m[2], framework: "express", reason: `${m[1].toUpperCase()} ${m[2]}` });
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
