import path from "node:path";
import type {
  WorkspaceDependencyGraph,
  ModuleNode,
  CircularCycle,
  HubModuleRanking,
  ModuleImportReference,
} from "./types.js";

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function resolveImportTarget(
  sourceFile: string,
  importSpecifier: string,
  allFiles: Set<string>,
): string | null {
  if (!importSpecifier.startsWith(".")) {
    // External package import (e.g. "vitest", "@wma/core")
    return null;
  }

  const sourceDir = path.dirname(sourceFile);
  const rawTarget = path.join(sourceDir, importSpecifier).replace(/\\/g, "/");

  // Candidates with extension variations (.ts, .tsx, .js, .jsx, /index.ts)
  const candidateExtensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];
  const stripped = rawTarget.replace(/\.(js|ts|jsx|tsx)$/, "");

  for (const ext of candidateExtensions) {
    const candidate = normalizePath(stripped + ext);
    if (allFiles.has(candidate)) {
      return candidate;
    }
  }

  const direct = normalizePath(rawTarget);
  if (allFiles.has(direct)) {
    return direct;
  }

  return null;
}

export function buildModuleDependencyGraph(
  files: string[],
  imports: ModuleImportReference[],
): WorkspaceDependencyGraph {
  const fileSet = new Set(files.map(normalizePath));
  const adj = new Map<string, Set<string>>();
  const revAdj = new Map<string, Set<string>>();

  for (const f of fileSet) {
    adj.set(f, new Set());
    revAdj.set(f, new Set());
  }

  let totalEdges = 0;

  for (const ref of imports) {
    const src = normalizePath(ref.sourceFile);
    if (!fileSet.has(src)) continue;

    const target = resolveImportTarget(src, ref.importedPath, fileSet);
    if (target && target !== src) {
      if (!adj.get(src)!.has(target)) {
        adj.get(src)!.add(target);
        revAdj.get(target)!.add(src);
        totalEdges++;
      }
    }
  }

  // Tarjan's Strongly Connected Components algorithm for cycle detection
  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) ?? []) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);

      if (scc.length > 1) {
        sccs.push(scc);
      }
    }
  }

  for (const f of fileSet) {
    if (!indices.has(f)) {
      strongConnect(f);
    }
  }

  const circularCycles: CircularCycle[] = sccs.map((scc, idx) => ({
    cycleId: `cycle-${idx + 1}`,
    length: scc.length,
    modules: [...scc].reverse(),
  }));

  const isAcyclic = circularCycles.length === 0;

  // Build node objects and centrality ranks
  const nodes: Record<string, ModuleNode> = {};
  const hubList: HubModuleRanking[] = [];

  for (const f of fileSet) {
    const dependencies = Array.from(adj.get(f) ?? []);
    const dependents = Array.from(revAdj.get(f) ?? []);
    const inDegree = dependents.length;
    const outDegree = dependencies.length;

    nodes[f] = {
      id: f,
      relativePath: f,
      inDegree,
      outDegree,
      dependencies,
      dependents,
    };

    const centralityScore = inDegree * 2 + outDegree;
    hubList.push({
      relativePath: f,
      centralityScore,
      inDegree,
      outDegree,
    });
  }

  hubList.sort((a, b) => b.centralityScore - a.centralityScore);

  // Topological sorting via Kahn's algorithm if acyclic
  let topologicalOrder: string[] | null = null;
  if (isAcyclic) {
    const inDegreeMap = new Map<string, number>();
    for (const f of fileSet) {
      inDegreeMap.set(f, revAdj.get(f)?.size ?? 0);
    }

    const queue: string[] = [];
    for (const [f, deg] of inDegreeMap.entries()) {
      if (deg === 0) queue.push(f);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);

      for (const v of adj.get(u) ?? []) {
        inDegreeMap.set(v, inDegreeMap.get(v)! - 1);
        if (inDegreeMap.get(v) === 0) {
          queue.push(v);
        }
      }
    }

    if (order.length === fileSet.size) {
      topologicalOrder = order;
    }
  }

  return {
    totalModules: fileSet.size,
    totalEdges,
    isAcyclic,
    circularCycles,
    hubModules: hubList.slice(0, 15),
    topologicalOrder,
    nodes,
  };
}
