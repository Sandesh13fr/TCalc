export type PromptPriority =
  | "essential" // P0: Cannot be dropped, must fit (e.g. system instructions, current task prompt)
  | "high"      // P1: Direct dependency or active edit file
  | "medium"    // P2: Referenced symbols, types, interface definitions
  | "low"       // P3: Repo map summary, general architectural context
  | "elastic";  // P4: Historical context, background logs, best-effort fill

export interface PromptSection {
  id: string;
  title?: string;
  content: string;
  priority: PromptPriority;
  minTokens?: number;
  maxTokens?: number;
  allowTruncation?: boolean;
  truncationPosition?: "head" | "middle" | "tail";
}

export interface PromptBudgetOptions {
  maxTokenBudget: number;
  reserveOutputTokens?: number;
  safetyBufferPercentage?: number; // e.g. 5 means 5% headroom reserved
  sections: PromptSection[];
}

export interface AllocatedSection {
  id: string;
  title?: string;
  priority: PromptPriority;
  originalTokens: number;
  allocatedTokens: number;
  wasTruncated: boolean;
  truncatedTokens: number;
  content: string;
}

export interface PromptBudgetAllocation {
  totalBudget: number;
  reservedOutput: number;
  safetyBufferTokens: number;
  usableBudget: number;
  usedTokens: number;
  remainingTokens: number;
  isWithinBudget: boolean;
  assembledPrompt: string;
  sections: AllocatedSection[];
}
