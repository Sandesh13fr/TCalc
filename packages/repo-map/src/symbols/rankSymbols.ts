import type { RepoMapSymbol, WorkspaceGoal } from "@wma/core";

const TEST_PATH_PATTERN =
  /(?:^|[\\/])(?:__tests__|tests?)(?:[\\/]|$)|(?:\.|_)(?:test|spec)\.[a-zA-Z0-9]+$|(?:^|[\\/])tests?\.[a-zA-Z0-9]+$/i;

export function isTestFilePath(relativePath: string): boolean {
  return TEST_PATH_PATTERN.test(relativePath);
}

export function rankSymbols(symbols: RepoMapSymbol[], goal?: WorkspaceGoal): RepoMapSymbol[] {
  const copy = [...symbols];

  copy.sort((a, b) => {
    if (a.exported !== b.exported) return a.exported ? -1 : 1;
    if (b.priority !== a.priority) return b.priority - a.priority;

    if (goal === "debug" || goal === "test-generation") {
      const aTest = isTestFilePath(a.relativePath) ? 1 : 0;
      const bTest = isTestFilePath(b.relativePath) ? 1 : 0;
      if (aTest !== bTest) return bTest - aTest;
    }

    return a.name.localeCompare(b.name);
  });

  return copy;
}
