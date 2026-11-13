import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { DEFAULT_FILE_SIZE_CONFIG } from "@wma/core";

export interface IgnoreResult {
  ignored: boolean;
  reason?: string;
}

export interface IgnoreResolverOptions {
  additionalIgnoreFiles?: string[];
  userExcludePatterns?: string[];
  maxFileSizeBytes?: number;
  onWarning?: (warning: string) => void;
  signal?: AbortSignal;
}

const IGNORE_FILE_NAMES = [
  ".gitignore",
  ".cursorignore",
  ".aiderignore",
  ".continueignore",
  ".tcalcignore",
];

interface NestedIgnoreFile {
  path: string;
  content: string;
}

export class IgnoreResolver {
  private ig = ignore();

  constructor(private options: IgnoreResolverOptions = {}) {}

  async loadIgnoreFiles(rootPath: string): Promise<void> {
    const files = [...IGNORE_FILE_NAMES, ...(this.options.additionalIgnoreFiles ?? [])];
    // Canonical root for symlink containment (falls back if root is missing).
    const canonicalRoot = await realpath(rootPath).catch(() => path.resolve(rootPath));
    for (const fileName of files) {
      this.options.signal?.throwIfAborted();
      if (path.isAbsolute(fileName) || fileName.split(/[\\/]/).includes("..")) {
        this.options.onWarning?.(`Skipped ignore file outside workspace: ${fileName}`);
        continue;
      }
      const candidate = path.join(rootPath, fileName);
      // Resolve symlinks and verify the real target stays inside the workspace.
      // Missing files preserve existing silent ENOENT handling.
      try {
        const resolvedCandidate = await realpath(candidate);
        const relative = path.relative(canonicalRoot, resolvedCandidate);
        if (path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`) || relative.startsWith("../")) {
          this.options.onWarning?.(`Skipped ignore file outside workspace: ${fileName}`);
          continue;
        }
        try {
          const content = await readFile(resolvedCandidate, "utf-8");
          this.ig.add(content);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            this.options.onWarning?.(`Failed to read ignore file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        this.options.onWarning?.(`Failed to read ignore file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    for (const ignoreFile of await findNestedGitignoreFiles(
      rootPath,
      (relativeDirectory) => this.ig.ignores(`${relativeDirectory}/`),
      this.options.signal,
    )) {
      this.options.signal?.throwIfAborted();
      const directory = path.dirname(path.relative(rootPath, ignoreFile.path)).replace(/\\/g, "/");
      this.ig.add(scopeGitignorePatterns(ignoreFile.content, directory));
    }

    if (this.options.userExcludePatterns) {
      this.ig.add(this.options.userExcludePatterns);
    }
  }

  shouldIgnore(relativePath: string, sizeBytes: number): IgnoreResult {
    const maxSize = this.options.maxFileSizeBytes ?? DEFAULT_FILE_SIZE_CONFIG.maxScanFileBytes;
    if (sizeBytes > maxSize) {
      return { ignored: true, reason: `exceeds max file size (${(sizeBytes / 1_000_000).toFixed(1)}MB)` };
    }
    if (this.ig.ignores(relativePath)) {
      return { ignored: true, reason: "matches ignore pattern" };
    }
    return { ignored: false };
  }
}

async function findNestedGitignoreFiles(
  rootPath: string,
  shouldPrune: (relativeDirectory: string) => boolean,
  signal?: AbortSignal,
): Promise<NestedIgnoreFile[]> {
  const results: NestedIgnoreFile[] = [];
  const rootRealPath = await realpath(rootPath);
  const visited = new Set<string>();

  async function visit(directory: string): Promise<void> {
    signal?.throwIfAborted();

    let directoryRealPath: string;
    try {
      directoryRealPath = await realpath(directory);
    } catch {
      return;
    }
    if (!isWithinRoot(rootRealPath, directoryRealPath) || visited.has(directoryRealPath)) return;
    visited.add(directoryRealPath);

    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      signal?.throwIfAborted();
      if (entry.name === ".git" || entry.name === ".svn" || entry.name === ".hg") continue;

      const childDirectory = path.join(directory, entry.name);
      let isDirectory = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        try {
          const targetRealPath = await realpath(childDirectory);
          if (!isWithinRoot(rootRealPath, targetRealPath)) continue;
          isDirectory = (await stat(childDirectory)).isDirectory();
        } catch {
          continue;
        }
      }
      if (!isDirectory) continue;

      const relativeDirectory = path.relative(rootPath, childDirectory).replace(/\\/g, "/");
      if (shouldPrune(relativeDirectory)) continue;

      const ignoreFile = path.join(childDirectory, ".gitignore");
      try {
        const content = await readFile(ignoreFile, "utf-8");
        results.push({ path: ignoreFile, content });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          // Ignore unreadable nested ignore files and continue scanning.
        }
      }

      await visit(childDirectory);
    }
  }

  await visit(rootPath);
  return results;
}

function scopeGitignorePatterns(content: string, directory: string): string[] {
  const escapedDirectory = escapeIgnoreDirectory(directory);
  return content
    .split(/\r?\n/)
    .flatMap((line) => scopeGitignorePattern(line, escapedDirectory));
}

function scopeGitignorePattern(line: string, directory: string): string[] {
  if (!line || line.startsWith("#")) return [line];

  const negated = line.startsWith("!");
  const pattern = negated ? line.slice(1) : line;
  if (!pattern) return [line];

  const directoryOnly = pattern.endsWith("/");
  const patternBody = directoryOnly ? pattern.slice(0, -1) : pattern;
  const hasInternalSlash = patternBody.includes("/");

  const scopedPatterns = pattern.startsWith("/")
    ? [`${directory}/${pattern.slice(1)}`]
    : hasInternalSlash
      ? [`${directory}/${pattern}`]
      : [`${directory}/${pattern}`, `${directory}/**/${pattern}`];

  return scopedPatterns.map((scopedPattern) => negated ? `!${scopedPattern}` : scopedPattern);
}

function escapeIgnoreDirectory(directory: string): string {
  return directory
    .split("/")
    .map((segment) => {
      let escaped = segment.replace(/([\\*?\[\]])/g, "\\$1");
      if (escaped.startsWith("#") || escaped.startsWith("!")) {
        escaped = `\\${escaped}`;
      }
      return escaped;
    })
    .join("/");
}

function isWithinRoot(rootRealPath: string, candidateRealPath: string): boolean {
  const relative = path.relative(rootRealPath, candidateRealPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
