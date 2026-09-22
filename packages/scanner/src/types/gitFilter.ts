export type GitFileStatusCode =
  | "M" // Modified
  | "A" // Added
  | "D" // Deleted
  | "R" // Renamed
  | "C" // Copied
  | "U" // Updated but unmerged (conflict)
  | "?" // Untracked
  | "!" // Ignored
  | " "; // Unmodified in this area

export interface GitFileStatus {
  path: string;
  originalPath?: string;
  indexStatus: GitFileStatusCode;
  worktreeStatus: GitFileStatusCode;
  isStaged: boolean;
  isUnstaged: boolean;
  isUntracked: boolean;
  isConflicted: boolean;
  isDeleted: boolean;
}

export type GitFilterScope = "staged" | "unstaged" | "all-dirty" | "untracked" | "conflicted";

export interface GitStatusFilterOptions {
  cwd?: string;
  scope?: GitFilterScope;
  includeDeleted?: boolean;
  gitExecutable?: string;
}

export interface GitStatusSummary {
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  conflictedFiles: string[];
  deletedFiles: string[];
  totalDirtyCount: number;
  entries: GitFileStatus[];
}
