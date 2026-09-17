import { estimateTokens } from "./heuristicTokenizer.js";
import type {
  AllocatedSection,
  PromptBudgetAllocation,
  PromptBudgetOptions,
  PromptPriority,
  PromptSection,
} from "./types/promptSlicer.js";

const PRIORITY_ORDER: Record<PromptPriority, number> = {
  essential: 0,
  high: 1,
  medium: 2,
  low: 3,
  elastic: 4,
};

export interface SliceTextOptions {
  position?: "head" | "middle" | "tail";
  title?: string;
  reserveForNoticeTokens?: number;
}

export function sliceTextToTokenBudget(
  text: string,
  tokenBudget: number,
  options: SliceTextOptions = {},
): {
  slicedText: string;
  tokensUsed: number;
  wasTruncated: boolean;
  truncatedTokens: number;
} {
  const originalTokens = estimateTokens(text);
  if (originalTokens <= tokenBudget) {
    return {
      slicedText: text,
      tokensUsed: originalTokens,
      wasTruncated: false,
      truncatedTokens: 0,
    };
  }

  if (tokenBudget <= 10) {
    return {
      slicedText: "",
      tokensUsed: 0,
      wasTruncated: true,
      truncatedTokens: originalTokens,
    };
  }

  const position = options.position ?? "tail";
  const lines = text.split("\n");

  if (position === "head") {
    // Keep most recent lines (tail of text, truncating from head)
    const keptLines: string[] = [];
    let currentTokens = 15; // allowance for truncation notice
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineTokens = estimateTokens(lines[i] + "\n");
      if (currentTokens + lineTokens > tokenBudget) {
        break;
      }
      keptLines.unshift(lines[i]);
      currentTokens += lineTokens;
    }

    if (keptLines.length === 0) {
      return {
        slicedText: "",
        tokensUsed: 0,
        wasTruncated: true,
        truncatedTokens: originalTokens,
      };
    }

    const notice = `[... Truncated earlier lines (${originalTokens - currentTokens} tokens omitted) ...]\n`;
    const finalContent = notice + keptLines.join("\n");
    const used = estimateTokens(finalContent);

    return {
      slicedText: finalContent,
      tokensUsed: used,
      wasTruncated: true,
      truncatedTokens: Math.max(0, originalTokens - used),
    };
  }

  if (position === "middle") {
    // Keep head lines and tail lines, omit middle
    const halfBudget = Math.floor((tokenBudget - 20) / 2);
    const headLines: string[] = [];
    const tailLines: string[] = [];

    let headTokens = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineTokens = estimateTokens(lines[i] + "\n");
      if (headTokens + lineTokens > halfBudget) break;
      headLines.push(lines[i]);
      headTokens += lineTokens;
    }

    let tailTokens = 0;
    for (let i = lines.length - 1; i >= headLines.length; i--) {
      const lineTokens = estimateTokens(lines[i] + "\n");
      if (tailTokens + lineTokens > halfBudget) break;
      tailLines.unshift(lines[i]);
      tailTokens += lineTokens;
    }

    if (headLines.length === 0 && tailLines.length === 0) {
      return {
        slicedText: "",
        tokensUsed: 0,
        wasTruncated: true,
        truncatedTokens: originalTokens,
      };
    }

    const omittedCount = lines.length - headLines.length - tailLines.length;
    const notice = `\n[... Truncated ${omittedCount} intermediate lines to preserve context boundary ...]\n`;
    const finalContent = headLines.join("\n") + notice + tailLines.join("\n");
    const used = estimateTokens(finalContent);

    return {
      slicedText: finalContent,
      tokensUsed: used,
      wasTruncated: true,
      truncatedTokens: Math.max(0, originalTokens - used),
    };
  }

  // Default: "tail" - keep head lines, truncate end
  const keptLines: string[] = [];
  let currentTokens = 15; // notice buffer
  for (let i = 0; i < lines.length; i++) {
    const lineTokens = estimateTokens(lines[i] + "\n");
    if (currentTokens + lineTokens > tokenBudget) {
      break;
    }
    keptLines.push(lines[i]);
    currentTokens += lineTokens;
  }

  if (keptLines.length === 0) {
    return {
      slicedText: "",
      tokensUsed: 0,
      wasTruncated: true,
      truncatedTokens: originalTokens,
    };
  }

  const omittedLines = lines.length - keptLines.length;
  const notice = `\n[... Truncated ${omittedLines} remaining lines (${Math.max(0, originalTokens - currentTokens)} tokens omitted) ...]`;
  const finalContent = keptLines.join("\n") + notice;
  const used = estimateTokens(finalContent);

  return {
    slicedText: finalContent,
    tokensUsed: used,
    wasTruncated: true,
    truncatedTokens: Math.max(0, originalTokens - used),
  };
}

export function allocatePromptBudget(options: PromptBudgetOptions): PromptBudgetAllocation {
  const {
    maxTokenBudget,
    reserveOutputTokens = 0,
    safetyBufferPercentage = 5,
    sections,
  } = options;

  const safetyBufferTokens = Math.round(maxTokenBudget * (safetyBufferPercentage / 100));
  const usableBudget = Math.max(0, maxTokenBudget - reserveOutputTokens - safetyBufferTokens);

  // Preserve original ordering while planning via priority
  const indexedSections = sections.map((sec, idx) => ({
    sec,
    idx,
    originalTokens: estimateTokens(sec.content),
  }));

  const sortedByPriority = [...indexedSections].sort(
    (a, b) => PRIORITY_ORDER[a.sec.priority] - PRIORITY_ORDER[b.sec.priority],
  );

  let budgetRemaining = usableBudget;
  const allocationMap = new Map<number, AllocatedSection>();

  // Pass 1: Essential sections (guaranteed allocation)
  for (const item of sortedByPriority) {
    if (item.sec.priority !== "essential") continue;

    if (item.originalTokens <= budgetRemaining) {
      allocationMap.set(item.idx, {
        id: item.sec.id,
        title: item.sec.title,
        priority: item.sec.priority,
        originalTokens: item.originalTokens,
        allocatedTokens: item.originalTokens,
        wasTruncated: false,
        truncatedTokens: 0,
        content: item.sec.content,
      });
      budgetRemaining -= item.originalTokens;
    } else {
      // Essential section exceeds budget; slice if allowed, else force full inclusion
      if (item.sec.allowTruncation) {
        const sliced = sliceTextToTokenBudget(item.sec.content, Math.max(20, budgetRemaining), {
          position: item.sec.truncationPosition,
          title: item.sec.title,
        });
        allocationMap.set(item.idx, {
          id: item.sec.id,
          title: item.sec.title,
          priority: item.sec.priority,
          originalTokens: item.originalTokens,
          allocatedTokens: sliced.tokensUsed,
          wasTruncated: true,
          truncatedTokens: sliced.truncatedTokens,
          content: sliced.slicedText,
        });
        budgetRemaining = Math.max(0, budgetRemaining - sliced.tokensUsed);
      } else {
        allocationMap.set(item.idx, {
          id: item.sec.id,
          title: item.sec.title,
          priority: item.sec.priority,
          originalTokens: item.originalTokens,
          allocatedTokens: item.originalTokens,
          wasTruncated: false,
          truncatedTokens: 0,
          content: item.sec.content,
        });
        budgetRemaining -= item.originalTokens;
      }
    }
  }

  // Pass 2: High, medium, low, elastic sections
  for (const item of sortedByPriority) {
    if (item.sec.priority === "essential") continue;

    const maxAllowed = item.sec.maxTokens ? Math.min(item.sec.maxTokens, budgetRemaining) : budgetRemaining;

    if (budgetRemaining <= 0) {
      allocationMap.set(item.idx, {
        id: item.sec.id,
        title: item.sec.title,
        priority: item.sec.priority,
        originalTokens: item.originalTokens,
        allocatedTokens: 0,
        wasTruncated: true,
        truncatedTokens: item.originalTokens,
        content: "",
      });
      continue;
    }

    if (item.originalTokens <= maxAllowed) {
      allocationMap.set(item.idx, {
        id: item.sec.id,
        title: item.sec.title,
        priority: item.sec.priority,
        originalTokens: item.originalTokens,
        allocatedTokens: item.originalTokens,
        wasTruncated: false,
        truncatedTokens: 0,
        content: item.sec.content,
      });
      budgetRemaining -= item.originalTokens;
    } else {
      // Partial / sliced fit
      const canTruncate = item.sec.allowTruncation ?? true;
      if (canTruncate && maxAllowed >= (item.sec.minTokens ?? 20)) {
        const sliced = sliceTextToTokenBudget(item.sec.content, maxAllowed, {
          position: item.sec.truncationPosition,
          title: item.sec.title,
        });
        allocationMap.set(item.idx, {
          id: item.sec.id,
          title: item.sec.title,
          priority: item.sec.priority,
          originalTokens: item.originalTokens,
          allocatedTokens: sliced.tokensUsed,
          wasTruncated: true,
          truncatedTokens: sliced.truncatedTokens,
          content: sliced.slicedText,
        });
        budgetRemaining = Math.max(0, budgetRemaining - sliced.tokensUsed);
      } else {
        // Dropped due to lack of space or disallowed truncation
        allocationMap.set(item.idx, {
          id: item.sec.id,
          title: item.sec.title,
          priority: item.sec.priority,
          originalTokens: item.originalTokens,
          allocatedTokens: 0,
          wasTruncated: true,
          truncatedTokens: item.originalTokens,
          content: "",
        });
      }
    }
  }

  // Restore original ordering
  const allocatedSections: AllocatedSection[] = [];
  for (let i = 0; i < sections.length; i++) {
    const allocated = allocationMap.get(i);
    if (allocated) {
      allocatedSections.push(allocated);
    }
  }

  // Assemble final prompt string
  const assembledParts: string[] = [];
  let usedTokens = 0;

  for (const sec of allocatedSections) {
    if (!sec.content) continue;
    usedTokens += sec.allocatedTokens;
    if (sec.title) {
      assembledParts.push(`## ${sec.title}\n${sec.content}`);
    } else {
      assembledParts.push(sec.content);
    }
  }

  const assembledPrompt = assembledParts.join("\n\n");
  const finalUsedTokens = estimateTokens(assembledPrompt);
  const remainingTokens = Math.max(0, usableBudget - finalUsedTokens);
  const isWithinBudget = finalUsedTokens <= usableBudget;

  return {
    totalBudget: maxTokenBudget,
    reservedOutput: reserveOutputTokens,
    safetyBufferTokens,
    usableBudget,
    usedTokens: finalUsedTokens,
    remainingTokens,
    isWithinBudget,
    assembledPrompt,
    sections: allocatedSections,
  };
}
