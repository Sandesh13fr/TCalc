import { readFile } from "node:fs/promises";
import path from "node:path";
import { isPrivacySetting, isWorkspaceGoal, type PrivacySetting, type WorkspaceGoal } from "./types/options.js";

export const TEAM_POLICY_SCHEMA_VERSION = "1.0" as const;

export interface ModelProfile {
  id: string;
  allowedProviders?: string[];
  allowedModelIds?: string[];
  preferredModelIds?: string[];
}

export interface TeamPolicy {
  schemaVersion: typeof TEAM_POLICY_SCHEMA_VERSION;
  defaultGoal?: WorkspaceGoal;
  privacyMode?: PrivacySetting;
  maxTokenBudget?: number;
  exclude?: string[];
  modelProfiles?: ModelProfile[];
  activeProfile?: string;
}

export async function loadTeamPolicy(rootPath: string): Promise<TeamPolicy | undefined> {
  try {
    return parseTeamPolicy(JSON.parse(await readFile(path.join(rootPath, ".tcalc", "team.json"), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export function parseTeamPolicy(value: unknown): TeamPolicy {
  if (!isRecord(value) || value.schemaVersion !== TEAM_POLICY_SCHEMA_VERSION) throw new TypeError(`Team policy schemaVersion must be ${TEAM_POLICY_SCHEMA_VERSION}`);
  if (value.defaultGoal !== undefined && !isWorkspaceGoal(value.defaultGoal)) throw new TypeError("Team policy defaultGoal is invalid");
  if (value.privacyMode !== undefined && !isPrivacySetting(value.privacyMode)) throw new TypeError("Team policy privacyMode is invalid");
  if (value.maxTokenBudget !== undefined && (!Number.isSafeInteger(value.maxTokenBudget) || (value.maxTokenBudget as number) <= 0)) throw new TypeError("Team policy maxTokenBudget must be a positive integer");
  const exclude = optionalStrings(value.exclude, "exclude");
  const profiles = value.modelProfiles === undefined ? undefined : parseProfiles(value.modelProfiles);
  if (value.activeProfile !== undefined && typeof value.activeProfile !== "string") throw new TypeError("Team policy activeProfile must be a string");
  if (value.activeProfile && !profiles?.some((profile) => profile.id === value.activeProfile)) throw new TypeError(`Team policy activeProfile "${value.activeProfile}" was not found`);
  return {
    schemaVersion: TEAM_POLICY_SCHEMA_VERSION,
    defaultGoal: value.defaultGoal as WorkspaceGoal | undefined,
    privacyMode: value.privacyMode as PrivacySetting | undefined,
    maxTokenBudget: value.maxTokenBudget as number | undefined,
    exclude,
    modelProfiles: profiles,
    activeProfile: value.activeProfile as string | undefined,
  };
}

export function getActiveModelProfile(policy: TeamPolicy | undefined): ModelProfile | undefined {
  return policy?.modelProfiles?.find((profile) => profile.id === policy.activeProfile);
}

function parseProfiles(value: unknown): ModelProfile[] {
  if (!Array.isArray(value)) throw new TypeError("Team policy modelProfiles must be an array");
  const ids = new Set<string>();
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id) throw new TypeError("Every model profile needs an id");
    if (ids.has(entry.id)) throw new TypeError(`Duplicate model profile id "${entry.id}"`);
    ids.add(entry.id);
    return {
      id: entry.id,
      allowedProviders: optionalStrings(entry.allowedProviders, "allowedProviders"),
      allowedModelIds: optionalStrings(entry.allowedModelIds, "allowedModelIds"),
      preferredModelIds: optionalStrings(entry.preferredModelIds, "preferredModelIds"),
    };
  });
}

function optionalStrings(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item)) throw new TypeError(`Team policy ${field} must contain strings`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
