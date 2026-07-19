import { z } from "zod";
import { WORKSPACE_GOALS } from "@wma/core";
import { compactCompletedGoal } from "@wma/agent-rules";

const CompactCompletedGoalInputSchema = z.object({
  goal: z.enum(WORKSPACE_GOALS),
  summary: z.string().min(1),
  changedFiles: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
  sourceTokens: z.number().int().positive().optional(),
}).strict();

export async function handleCompactCompletedGoal(input: Record<string, unknown>) {
  const result = compactCompletedGoal(CompactCompletedGoalInputSchema.parse(input));
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
}
