import type { WorkspaceFileInfo, LanguageBreakdown } from "@wma/core";

export interface WorkspaceTokenCount {
  totalTokens: number;
  includedTokens: number;
  excludedTokens: number;
  fileCount: number;
  perFile: Array<{
    relativePath: string;
    tokens: number;
    language: string;
  }>;
  perLanguage: LanguageBreakdown[];
}

export function countWorkspaceTokens(files: WorkspaceFileInfo[]): WorkspaceTokenCount {
  const perFile = files.map(f => ({
    relativePath: f.relativePath,
    tokens: f.estimatedTokens,
    language: f.language,
  }));

  const included = files.filter(f => f.included);
  const excluded = files.filter(f => !f.included);

  const langMap = new Map<string, { count: number; bytes: number; tokens: number }>();
  for (const f of included) {
    const entry = langMap.get(f.language) ?? { count: 0, bytes: 0, tokens: 0 };
    entry.count++;
    entry.bytes += f.bytes;
    entry.tokens += f.estimatedTokens;
    langMap.set(f.language, entry);
  }

  const includedTokens = included.reduce((s, f) => s + f.estimatedTokens, 0);
  const perLanguage: LanguageBreakdown[] = [];
  for (const [language, data] of langMap) {
    perLanguage.push({
      language,
      fileCount: data.count,
      totalBytes: data.bytes,
      totalTokens: data.tokens,
      percentage: includedTokens > 0 ? Math.round((data.tokens / includedTokens) * 10000) / 100 : 0,
    });
  }
  perLanguage.sort((a, b) => b.totalTokens - a.totalTokens);

  return {
    totalTokens: includedTokens + excluded.reduce((s, f) => s + f.estimatedTokens, 0),
    includedTokens,
    excludedTokens: excluded.reduce((s, f) => s + f.estimatedTokens, 0),
    fileCount: files.length,
    perFile,
    perLanguage,
  };
}
