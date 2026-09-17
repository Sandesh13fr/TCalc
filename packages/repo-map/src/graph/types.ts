export interface ModuleNode {
  id: string;
  relativePath: string;
  inDegree: number;
  outDegree: number;
  dependencies: string[];
  dependents: string[];
}

export interface CircularCycle {
  cycleId: string;
  length: number;
  modules: string[];
}

export interface HubModuleRanking {
  relativePath: string;
  centralityScore: number;
  inDegree: number;
  outDegree: number;
}

export interface WorkspaceDependencyGraph {
  totalModules: number;
  totalEdges: number;
  isAcyclic: boolean;
  circularCycles: CircularCycle[];
  hubModules: HubModuleRanking[];
  topologicalOrder: string[] | null;
  nodes: Record<string, ModuleNode>;
}

export interface ModuleImportReference {
  sourceFile: string;
  importedPath: string;
}
