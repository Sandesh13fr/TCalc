# TCalc — JetBrains IDE Plugin

Local-first workspace token calculator, model recommender, and coding-agent optimizer for IntelliJ-based IDEs.

## Requirements

- IntelliJ IDEA 2024.2+ (also compatible with WebStorm, PyCharm, and other IntelliJ Platform IDEs)
- Node.js 18+ installed on your system
- TCalc CLI built from source (see root repo README)

## Quick Start

1. **Build the plugin**: `./gradlew buildPlugin`
2. **Run in sandbox**: `./gradlew runIde`
3. In the sandbox IDE, open **Settings → Tools → TCalc**
4. Set the path to your Node.js executable and the WMA CLI (`apps/cli/dist/index.js`)
5. Open **View → Tool Windows → TCalc**
6. Click **Scan Workspace**

## Features

- Tool window with scan results and actions
- Scan Workspace, Compare Models, Generate Repo Map, Generate Agent Rules, Export Report
- Configurable settings for CLI path, goal, privacy mode, token budget
- All processing is local — no telemetry, no cloud calls, no source upload

## Architecture

The plugin wraps the existing TCalc Node.js CLI. It does not reimplement core logic in Kotlin. All scans, recommendations, and analysis are performed by the CLI binary — the plugin invokes it as a subprocess with safe, predefined arguments.

## Limitations (MVP)

- Requires Node.js and CLI to be built separately
- No deep PSI (program structure index) integration yet
- No Marketplace publishing yet

## Security

- No telemetry
- No cloud calls
- No source code upload
- No arbitrary command execution — arguments are predefined per action

## License

MIT
