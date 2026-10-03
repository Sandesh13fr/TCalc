import fs from "node:fs";
import path from "node:path";
import { estimateFileTokens } from "@wma/tokenizers";
import { z } from "zod";
import { validateRootPath } from "../utils/safeRootPath.js";

export const EstimateFilesTokensInputSchema = z.object({
  filePaths: z.array(z.string()).min(1, "At least one file path must be specified"),
  workspaceRoot: z.string().optional(),
  targetModel: z.string().optional(),
  contextBudget: z.number().int().positive().optional(),
});

export type EstimateFilesTokensInput = z.infer<typeof EstimateFilesTokensInputSchema>;

export interface FileTokenDetail {
  filePath: string;
  relativePath: string;
  bytes: number;
  estimatedTokens: number;
  exists: boolean;
  error?: string;
}

export interface EstimateFilesTokensOutput {
  workspaceRoot: string;
  totalFiles: number;
  existingFiles: number;
  totalBytes: number;
  totalTokens: number;
  targetModel?: string;
  contextBudget?: number;
  fitsBudget?: boolean;
  budgetUtilizationPercent?: number;
  files: FileTokenDetail[];
}

function isContained(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel));
}

export async function handleEstimateFilesTokens(args: unknown): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = EstimateFilesTokensInputSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Invalid arguments: ${parseResult.error.message}`,
        },
      ],
      isError: true,
    };
  }

  const { filePaths, workspaceRoot: explicitRoot, targetModel, contextBudget } = parseResult.data;
  let root: string;
  try {
    root = validateRootPath(explicitRoot);
  } catch (err) {
    return {
      content: [
        {
          type: "text" as const,
          text: err instanceof Error ? err.message : String(err),
        },
      ],
      isError: true,
    };
  }

  const fileDetails: FileTokenDetail[] = [];
  let totalBytes = 0;
  let totalTokens = 0;
  let existingFiles = 0;

  for (const fp of filePaths) {
    const resolvedPath = path.isAbsolute(fp) ? path.resolve(fp) : path.resolve(root, fp);

    if (!isContained(root, resolvedPath)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Path traversal denied: '${fp}' resolves outside workspace boundary '${root}'`,
          },
        ],
        isError: true,
      };
    }

    const rel = path.relative(root, resolvedPath).replace(/\\/g, "/");

    try {
      if (!fs.existsSync(resolvedPath)) {
        fileDetails.push({
          filePath: resolvedPath,
          relativePath: rel,
          bytes: 0,
          estimatedTokens: 0,
          exists: false,
          error: "File not found",
        });
        continue;
      }

      const stat = fs.statSync(resolvedPath);
      if (stat.isDirectory()) {
        fileDetails.push({
          filePath: resolvedPath,
          relativePath: rel,
          bytes: stat.size,
          estimatedTokens: 0,
          exists: true,
          error: "Path is a directory, not a file",
        });
        continue;
      }

      const content = fs.readFileSync(resolvedPath, "utf-8");
      const tokens = estimateFileTokens(content, rel);

      existingFiles++;
      totalBytes += stat.size;
      totalTokens += tokens;

      fileDetails.push({
        filePath: resolvedPath,
        relativePath: rel,
        bytes: stat.size,
        estimatedTokens: tokens,
        exists: true,
      });
    } catch (err) {
      fileDetails.push({
        filePath: resolvedPath,
        relativePath: rel,
        bytes: 0,
        estimatedTokens: 0,
        exists: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let fitsBudget: boolean | undefined;
  let budgetUtilizationPercent: number | undefined;

  if (contextBudget !== undefined && contextBudget > 0) {
    fitsBudget = totalTokens <= contextBudget;
    budgetUtilizationPercent = Number(((totalTokens / contextBudget) * 100).toFixed(2));
  }

  const output: EstimateFilesTokensOutput = {
    workspaceRoot: root,
    totalFiles: filePaths.length,
    existingFiles,
    totalBytes,
    totalTokens,
    targetModel,
    contextBudget,
    fitsBudget,
    budgetUtilizationPercent,
    files: fileDetails,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(output, null, 2),
      },
    ],
  };
}
