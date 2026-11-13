import path from "node:path";
import type {
  WorkspaceScanResult,
  WorkspaceFileInfo,
  TokenDriftReport,
  FileDriftDelta,
  DirectoryDriftDelta,
  DriftPolicyConfig,
  DriftStatus,
} from "@wma/core";

export function analyzeTokenDrift(
  baseline: WorkspaceScanResult,
  current: WorkspaceScanResult,
  policy: DriftPolicyConfig = {},
): TokenDriftReport {
  const baselineMap = new Map<string, WorkspaceFileInfo>();
  for (const f of baseline.files) {
    const norm = f.relativePath.replace(/\\/g, "/");
    baselineMap.set(norm, f);
  }

  const currentMap = new Map<string, WorkspaceFileInfo>();
  for (const f of current.files) {
    const norm = f.relativePath.replace(/\\/g, "/");
    currentMap.set(norm, f);
  }

  const allPaths = new Set<string>([...baselineMap.keys(), ...currentMap.keys()]);

  const fileDeltas: FileDriftDelta[] = [];
  let filesAdded = 0;
  let filesRemoved = 0;
  let filesModified = 0;
  let filesUnchanged = 0;

  for (const relPath of allPaths) {
    const baseFile = baselineMap.get(relPath);
    const currFile = currentMap.get(relPath);

    let status: DriftStatus;
    let baseTokens = 0;
    let currTokens = 0;
    let addedFlags: string[] = [];
    let removedFlags: string[] = [];

    if (!baseFile && currFile) {
      status = "added";
      filesAdded++;
      currTokens = currFile.estimatedTokens;
      addedFlags = [...currFile.riskFlags];
    } else if (baseFile && !currFile) {
      status = "removed";
      filesRemoved++;
      baseTokens = baseFile.estimatedTokens;
      removedFlags = [...baseFile.riskFlags];
    } else if (baseFile && currFile) {
      baseTokens = baseFile.estimatedTokens;
      currTokens = currFile.estimatedTokens;
      const prevFlags = new Set(baseFile.riskFlags);
      const nowFlags = new Set(currFile.riskFlags);

      addedFlags = currFile.riskFlags.filter((x) => !prevFlags.has(x));
      removedFlags = baseFile.riskFlags.filter((x) => !nowFlags.has(x));

      if (baseTokens !== currTokens || addedFlags.length > 0 || removedFlags.length > 0) {
        status = "modified";
        filesModified++;
      } else {
        status = "unchanged";
        filesUnchanged++;
      }
    } else {
      continue;
    }

    const tokenDelta = currTokens - baseTokens;
    let percentChange = 0;
    if (baseTokens > 0) {
      percentChange = Number((((currTokens - baseTokens) / baseTokens) * 100).toFixed(2));
    } else if (currTokens > 0) {
      percentChange = 100;
    }

    fileDeltas.push({
      relativePath: relPath,
      status,
      baselineTokens: baseTokens,
      currentTokens: currTokens,
      tokenDelta,
      percentChange,
      riskFlagsAdded: addedFlags,
      riskFlagsRemoved: removedFlags,
    });
  }

  // Aggregate directory drifts
  const dirMap = new Map<
    string,
    { baseTokens: number; currTokens: number; fileDelta: number }
  >();

  for (const delta of fileDeltas) {
    const dir = path.dirname(delta.relativePath).replace(/\\/g, "/") || ".";
    const existing = dirMap.get(dir) ?? { baseTokens: 0, currTokens: 0, fileDelta: 0 };

    existing.baseTokens += delta.baselineTokens;
    existing.currTokens += delta.currentTokens;
    if (delta.status === "added") existing.fileDelta += 1;
    if (delta.status === "removed") existing.fileDelta -= 1;

    dirMap.set(dir, existing);
  }

  const directoryDrifts: DirectoryDriftDelta[] = [];
  for (const [dir, data] of dirMap.entries()) {
    const tokenDelta = data.currTokens - data.baseTokens;
    let percentChange = 0;
    if (data.baseTokens > 0) {
      percentChange = Number((((data.currTokens - data.baseTokens) / data.baseTokens) * 100).toFixed(2));
    } else if (data.currTokens > 0) {
      percentChange = 100;
    }

    directoryDrifts.push({
      directory: dir,
      baselineTokens: data.baseTokens,
      currentTokens: data.currTokens,
      tokenDelta,
      percentChange,
      fileCountDelta: data.fileDelta,
    });
  }

  directoryDrifts.sort((a, b) => Math.abs(b.tokenDelta) - Math.abs(a.tokenDelta));

  const topGrowingFiles = fileDeltas
    .filter((f) => f.tokenDelta > 0)
    .sort((a, b) => b.tokenDelta - a.tokenDelta)
    .slice(0, 10);

  const topShrinkingFiles = fileDeltas
    .filter((f) => f.tokenDelta < 0)
    .sort((a, b) => a.tokenDelta - b.tokenDelta)
    .slice(0, 10);

  const baselineTotalTokens = baseline.totalEstimatedTokens ?? 0;
  const currentTotalTokens = current.totalEstimatedTokens ?? 0;
  const netTokenDelta = currentTotalTokens - baselineTotalTokens;

  let netPercentChange = 0;
  if (baselineTotalTokens > 0) {
    netPercentChange = Number((((currentTotalTokens - baselineTotalTokens) / baselineTotalTokens) * 100).toFixed(2));
  } else if (currentTotalTokens > 0) {
    netPercentChange = 100;
  }

  // Policy validation
  const violations: string[] = [];

  if (policy.maxTokenIncrease !== undefined && netTokenDelta > policy.maxTokenIncrease) {
    violations.push(
      `Token increase of ${netTokenDelta.toLocaleString()} exceeds maximum allowed increase of ${policy.maxTokenIncrease.toLocaleString()}`,
    );
  }

  if (policy.maxDriftPercentage !== undefined && netPercentChange > policy.maxDriftPercentage) {
    violations.push(
      `Token drift of +${netPercentChange}% exceeds policy threshold of +${policy.maxDriftPercentage}%`,
    );
  }

  if (policy.maxFileCountIncrease !== undefined) {
    const netFiles = filesAdded - filesRemoved;
    if (netFiles > policy.maxFileCountIncrease) {
      violations.push(
        `Net file count increase of ${netFiles} exceeds allowed limit of ${policy.maxFileCountIncrease}`,
      );
    }
  }

  if (policy.alertOnNewRiskFlags) {
    const newRiskFiles = fileDeltas.filter((f) => f.riskFlagsAdded.length > 0);
    if (newRiskFiles.length > 0) {
      for (const rf of newRiskFiles) {
        violations.push(
          `New risk flag(s) [${rf.riskFlagsAdded.join(", ")}] introduced in ${rf.relativePath}`,
        );
      }
    }
  }

  return {
    baselineTotalTokens,
    currentTotalTokens,
    netTokenDelta,
    netPercentChange,
    filesAdded,
    filesRemoved,
    filesModified,
    filesUnchanged,
    topGrowingFiles,
    topShrinkingFiles,
    directoryDrifts,
    violations,
    passed: violations.length === 0,
    generatedAt: new Date().toISOString(),
  };
}
