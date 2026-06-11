import { readFile } from "node:fs/promises";
import type { WmaConfig } from "@wma/core";
import { DEFAULT_CONFIG } from "@wma/core";
import { findWorkspaceConfigPath } from "./paths.js";

export async function loadWorkspaceConfig(rootPath: string): Promise<WmaConfig> {
  const configPath = findWorkspaceConfigPath(rootPath);
  try {
    const content = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}
