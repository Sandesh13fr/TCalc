# JetBrains Plugin

TCalc for IntelliJ-based IDEs (IntelliJ IDEA, WebStorm, PyCharm, and more).

## Setup

### Prerequisites

- Node.js 18+ installed on your system
- JetBrains IDE based on IntelliJ Platform 2024.2 or 2024.3
- TCalc repo cloned and dependencies installed (`pnpm install && pnpm build`)

### Generate the Gradle wrapper

From the `apps/jetbrains-plugin/` directory:

```bash
gradle wrapper --gradle-version 8.9
```

If you don't have Gradle installed locally, download the wrapper scripts from
<https://services.gradle.org/distributions/gradle-8.9-bin.zip> or run from the
repo root and copy the `apps/jetbrains-plugin/gradlew` scripts.

### Build the plugin

```bash
cd apps/jetbrains-plugin
./gradlew buildPlugin
```

The plugin ZIP is at `build/distributions/tcalc-jetbrains-*.zip`.

## Development

### Run in sandbox IDE

```bash
cd apps/jetbrains-plugin
./gradlew runIde
```

This launches an IntelliJ sandbox with the plugin installed.

### Build and verify

```bash
./gradlew build
./gradlew verifyPlugin
```

## Plugin Architecture

The JetBrains plugin wraps the existing TCalc Node.js CLI:

```
┌─────────────────────────────┐
│   IntelliJ IDE (sandbox)   │
│  ┌───────────────────────┐  │
│  │  TCalc Tool Window    │  │
│  │  ├─ Scan Workspace    │  │
│  │  ├─ Compare Models    │  │
│  │  ├─ Repo Map          │  │
│  │  └─ Agent Rules       │  │
│  └───────┬───────────────┘  │
│          │ subprocess        │
│  ┌───────▼───────────────┐  │
│  │  wma CLI (Node.js)    │  │
│  │  ── scan --format json │  │
│  │  ── recommend ...      │  │
│  │  ── repo-map ...       │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### Package structure

```
apps/jetbrains-plugin/
├── build.gradle.kts          # Gradle build (IntelliJ Platform Plugin 2.x)
├── settings.gradle.kts       # Project settings
├── gradle.properties         # Build properties
├── gradle/wrapper/           # Gradle wrapper
├── src/main/kotlin/
│   └── com/tcalc/plugin/
│       ├── WmaToolWindowFactory.kt          # Tool window factory
│       ├── WmaToolWindowPanel.kt            # Tool window UI (buttons + output)
│       ├── actions/
│       │   ├── ScanWorkspaceAction.kt       # Scan workspace
│       │   ├── CompareModelsAction.kt       # Compare/recommend models
│       │   ├── GenerateRepoMapAction.kt     # Generate repo map
│       │   ├── GenerateAgentRulesAction.kt  # Generate agent rules
│       │   ├── ExportReportAction.kt        # Export report
│       │   ├── OpenSettingsAction.kt        # Open settings
│       │   └── ActionSupport.kt             # Safe background/write helpers
│       ├── settings/
│       │   ├── WmaSettingsState.kt          # Persistent settings state
│       │   └── WmaSettingsConfigurable.kt   # Settings UI panel
│       ├── runner/
│       │   └── CliRunner.kt                 # Safe CLI subprocess runner
│       └── model/
│           ├── ScanResult.kt                # Scan JSON model
│           ├── RecommendResult.kt           # Recommend JSON model
│           └── RulesResult.kt               # Rules output model
└── src/main/resources/
    └── META-INF/
        └── plugin.xml                       # Plugin descriptor
```

## Limitations (MVP)

- **CLI dependency**: Requires Node.js and the TCalc CLI to be built and configured.
  The plugin does not bundle Node.js or the CLI — they must be installed separately.
- **No PSI integration**: The plugin does not use IntelliJ's Program Structure Index
  yet. It relies on the CLI's file scanner instead.
- **No persistence**: Scan results are not cached between IDE restarts.
- **No Marketplace publishing**: The plugin is not published on the JetBrains
  Marketplace in this phase.

## Security / Privacy

- **No telemetry**: The plugin does not collect usage data.
- **No cloud calls**: All processing is local via the CLI.
- **No source upload**: File contents are never sent over the network.
- **No arbitrary command execution**: CLI arguments are predefined per action.
- **Risky file paths** are listed by path only — contents are never displayed.

## Future: Marketplace Publishing

When ready to publish:

1. Set `JETBRAINS_TOKEN` in CI secrets
2. Update `pluginVersion` in `gradle.properties`
3. Remove `dry-run` guard from CI workflow
4. Run `./gradlew publishPlugin`

## Commands

The plugin supports these CLI commands:

| Action | CLI Command |
|--------|-------------|
| Scan Workspace | `wma scan <workspace> --format json` |
| Compare Models | `wma recommend <workspace> --format json` |
| Generate Repo Map | `wma repo-map <workspace> --format markdown` |
| Generate Agent Rules | `wma rules <workspace> --target generic --mode repo-map-first` |
| Export Report | `wma report <workspace> --format markdown --include-repo-map` |
