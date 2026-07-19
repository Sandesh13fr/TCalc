# P3 capabilities

## Provider tokenizers and cached scans

Library callers can pass a `ProviderTokenizer` to `scanWorkspace`; failures use the offline heuristic. CLI scans can opt into a persistent cache:

```bash
pnpm cli scan . --cache
```

## Team policy and shared model profiles

Commit `.tcalc/team.json`:

```json
{
  "schemaVersion": "1.0",
  "privacyMode": "local-first",
  "maxTokenBudget": 32000,
  "exclude": ["fixtures/private/**"],
  "modelProfiles": [
    {
      "id": "local",
      "allowedProviders": ["local"],
      "preferredModelIds": ["local/qwen2.5-coder-32b"]
    }
  ],
  "activeProfile": "local"
}
```

CLI and MCP scans, recommendations, reports, repo maps, and generated rules enforce this policy.

## Goal compaction

```bash
pnpm cli compact --goal add-feature --summary "Added cached scans" --changed-file packages/scanner/src/scanCache.ts --source-tokens 12000
```

## Optional catalog feed

Network access occurs only for an explicit HTTPS fetch:

```bash
pnpm cli catalog fetch https://raw.githubusercontent.com/Sandesh13fr/TCalc/main/catalogs/models.json --output models-feed.json
```
