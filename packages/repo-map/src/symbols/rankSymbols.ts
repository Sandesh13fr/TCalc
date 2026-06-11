import type { RepoMapSymbol, WorkspaceGoal } from "@wma/core";

export function rankSymbols(symbols: RepoMapSymbol[], goal?: WorkspaceGoal): RepoMapSymbol[] {
  const copy = [...symbols];

  copy.sort((a, b) => {
    if (a.exported !== b.exported) return a.exported ? -1 : 1;
    if (b.priority !== a.priority) return b.priority - a.priority;

    if (goal === "debug" || goal === "test-generation") {
      const aTest = a.relativePath.includes("test") ? 1 : 0;
      const bTest = b.relativePath.includes("test") ? 1 : 0;
      if (aTest !== bTest) return bTest - aTest;
    }

    return a.name.localeCompare(b.name);
  });

  return copy;
}
