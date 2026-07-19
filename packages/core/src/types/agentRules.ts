/**
 * Agent rules types for rule generation.
 */

import type { AgentTarget, OptimizationMode } from "./options.js";

export type { AgentTarget, OptimizationMode } from "./options.js";

/** Generated agent rules output. */
export interface AgentRulesOutput {
  /** Target agent. */
  target: AgentTarget;
  /** Optimization mode applied. */
  mode: OptimizationMode;
  /** Generated file name (e.g. ".cursorrules"). */
  fileName: string;
  /** Generated rules content. */
  content: string;
  /** Files to avoid or limit. */
  avoidFiles: string[];
  /** Token budget guidance. */
  tokenBudget: number;
}
