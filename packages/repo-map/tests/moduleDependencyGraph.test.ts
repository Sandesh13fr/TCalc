import { describe, it, expect } from "vitest";
import { buildModuleDependencyGraph } from "../src/index.js";

describe("buildModuleDependencyGraph", () => {
  it("builds a clean linear DAG and computes topological ordering", () => {
    const files = ["src/index.ts", "src/service.ts", "src/db.ts"];
    const imports = [
      { sourceFile: "src/index.ts", importedPath: "./service.js" },
      { sourceFile: "src/service.ts", importedPath: "./db.js" },
    ];

    const graph = buildModuleDependencyGraph(files, imports);

    expect(graph.totalModules).toBe(3);
    expect(graph.totalEdges).toBe(2);
    expect(graph.isAcyclic).toBe(true);
    expect(graph.circularCycles).toHaveLength(0);
    expect(graph.topologicalOrder).toEqual(["src/index.ts", "src/service.ts", "src/db.ts"]);

    expect(graph.nodes["src/service.ts"].inDegree).toBe(1);
    expect(graph.nodes["src/service.ts"].outDegree).toBe(1);
    expect(graph.nodes["src/db.ts"].inDegree).toBe(1);
    expect(graph.nodes["src/db.ts"].outDegree).toBe(0);
  });

  it("identifies and ranks core hub modules by centrality score", () => {
    const files = ["src/index.ts", "src/api.ts", "src/worker.ts", "src/utils.ts"];
    const imports = [
      { sourceFile: "src/index.ts", importedPath: "./utils.js" },
      { sourceFile: "src/api.ts", importedPath: "./utils.js" },
      { sourceFile: "src/worker.ts", importedPath: "./utils.js" },
    ];

    const graph = buildModuleDependencyGraph(files, imports);

    expect(graph.hubModules[0].relativePath).toBe("src/utils.ts");
    expect(graph.hubModules[0].inDegree).toBe(3);
    expect(graph.hubModules[0].centralityScore).toBe(6); // inDegree * 2
  });

  it("detects circular dependency cycles (A -> B -> C -> A)", () => {
    const files = ["src/a.ts", "src/b.ts", "src/c.ts", "src/leaf.ts"];
    const imports = [
      { sourceFile: "src/a.ts", importedPath: "./b.js" },
      { sourceFile: "src/b.ts", importedPath: "./c.js" },
      { sourceFile: "src/c.ts", importedPath: "./a.js" },
      { sourceFile: "src/a.ts", importedPath: "./leaf.js" },
    ];

    const graph = buildModuleDependencyGraph(files, imports);

    expect(graph.isAcyclic).toBe(false);
    expect(graph.circularCycles.length).toBeGreaterThanOrEqual(1);
    expect(graph.topologicalOrder).toBeNull();

    const cycle = graph.circularCycles[0];
    expect(cycle.length).toBe(3);
    expect(cycle.modules).toContain("src/a.ts");
    expect(cycle.modules).toContain("src/b.ts");
    expect(cycle.modules).toContain("src/c.ts");
  });

  it("ignores external third-party package imports", () => {
    const files = ["src/index.ts"];
    const imports = [
      { sourceFile: "src/index.ts", importedPath: "vitest" },
      { sourceFile: "src/index.ts", importedPath: "@wma/core" },
      { sourceFile: "src/index.ts", importedPath: "node:path" },
    ];

    const graph = buildModuleDependencyGraph(files, imports);

    expect(graph.totalEdges).toBe(0);
    expect(graph.nodes["src/index.ts"].outDegree).toBe(0);
  });

  it("handles directory index file resolution", () => {
    const files = ["src/app.ts", "src/components/index.ts"];
    const imports = [
      { sourceFile: "src/app.ts", importedPath: "./components" },
    ];

    const graph = buildModuleDependencyGraph(files, imports);

    expect(graph.totalEdges).toBe(1);
    expect(graph.nodes["src/app.ts"].dependencies).toContain("src/components/index.ts");
  });

  it("handles empty workspace module lists gracefully", () => {
    const graph = buildModuleDependencyGraph([], []);

    expect(graph.totalModules).toBe(0);
    expect(graph.totalEdges).toBe(0);
    expect(graph.isAcyclic).toBe(true);
    expect(graph.circularCycles).toHaveLength(0);
    expect(graph.topologicalOrder).toEqual([]);
  });
});
