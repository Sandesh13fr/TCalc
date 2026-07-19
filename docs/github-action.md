# TCalc GitHub Action

```yaml
- uses: Sandesh13fr/TCalc@v0.1.3
  id: tcalc
  with:
    path: .
    goal: debug
    privacy: local-first
    token-budget: "32000"

- uses: actions/upload-artifact@v4
  with:
    name: tcalc-report
    path: tcalc-artifacts/
```

The composite action performs local analysis on the runner and produces `report.json` and `repo-map.md`. Marketplace publication requires a public tagged release; no service credentials are required.
