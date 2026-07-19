import type { ModelInfo, ModelProfile } from "@wma/core";

export function applyModelProfile(models: ModelInfo[], profile: ModelProfile | undefined): ModelInfo[] {
  if (!profile) return models;
  const allowedProviders = profile.allowedProviders ? new Set(profile.allowedProviders) : undefined;
  const allowedModels = profile.allowedModelIds ? new Set(profile.allowedModelIds) : undefined;
  const preferred = new Set(profile.preferredModelIds ?? []);
  return models
    .filter((model) => (!allowedProviders || allowedProviders.has(model.provider)) && (!allowedModels || allowedModels.has(model.id)))
    .sort((a, b) => Number(preferred.has(b.id)) - Number(preferred.has(a.id)));
}
