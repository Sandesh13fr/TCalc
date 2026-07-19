import { readFile } from "node:fs/promises";
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
}

const IGNORE_FILE_NAMES = [
  ".gitignore",
  ".cursorignore",
  ".aiderignore",
  ".continueignore",
  ".tcalcignore",
];

export class IgnoreResolver {
  private ig = ignore();

  constructor(private options: IgnoreResolverOptions = {}) {}

  async loadIgnoreFiles(rootPath: string): Promise<void> {
    const files = [...IGNORE_FILE_NAMES, ...(this.options.additionalIgnoreFiles ?? [])];
    for (const fileName of files) {
      try {
        const content = await readFile(path.join(rootPath, fileName), "utf-8");
        this.ig.add(content);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          this.options.onWarning?.(`Failed to read ignore file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
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
