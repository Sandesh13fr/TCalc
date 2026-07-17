You are a senior Kotlin/IntelliJ Platform plugin engineer, TypeScript monorepo engineer, and developer-tools product architect.

Project: Workspace Model Advisor
Repo root: TCalc

Current state:

* VS Code extension is published.
* Open VSX extension is published.
* CLI works.
* MCP server works.
* Agent integration docs exist or are planned.
* No telemetry.
* No cloud calls.
* TypeScript packages contain the core scanner/recommender/repo-map logic.

Your task:
Implement Phase 13: JetBrains IDE Plugin MVP.

Main goal:
Create a JetBrains IntelliJ Platform plugin that exposes Workspace Model Advisor inside IntelliJ-based IDEs by wrapping the existing CLI/MCP capabilities rather than reimplementing all logic in Kotlin.

Target IDEs:

* IntelliJ IDEA
* WebStorm
* PyCharm
* other IntelliJ Platform IDEs if compatible

Do not implement:

* telemetry
* cloud calls
* account/login flows
* hosted services
* paid licensing
* deep PSI parser integration yet
* Marketplace publishing in this phase

Architecture decision:

* Use the existing Node CLI as the execution backend for MVP.
* Kotlin plugin should call the local CLI with safe arguments only.
* No arbitrary shell execution.
* No uploading code.
* All scans run locally.

Create:

* apps/jetbrains-plugin/

Use:

* Kotlin
* Gradle
* IntelliJ Platform Gradle Plugin 2.x
* Java/Kotlin compatible with the current JetBrains plugin tooling
* existing repo CLI built from apps/cli

Plugin features MVP:

1. Tool window:

   * Workspace Model Advisor
   * Shows scan summary
   * total tokens
   * included/excluded files
   * top folders
   * language breakdown
   * recommendation cards

2. Actions:

   * Scan Workspace
   * Compare Models
   * Generate Repo Map
   * Generate Agent Rules
   * Export Report
   * Open Settings

3. Settings:

   * Node executable path
   * WMA CLI path
   * default goal
   * privacy mode
   * token budget

4. Local command runner:

   * invoke CLI commands safely
   * no arbitrary user command string
   * pass arguments as arrays
   * capture stdout/stderr
   * timeout for long scans
   * show friendly error if Node/CLI missing

5. Output handling:

   * parse JSON output where possible
   * show Markdown repo map in editor tab
   * save generated reports to workspace root after confirmation

6. Security:

   * no network calls
   * no telemetry
   * no source upload
   * do not print file contents
   * list risky files by path only

Repo structure:
apps/jetbrains-plugin/

* build.gradle.kts
* settings.gradle.kts or use root Gradle config if appropriate
* gradle.properties
* src/main/kotlin/...
* src/main/resources/META-INF/plugin.xml
* README.md
* CHANGELOG.md

Implementation tasks:

1. Create plugin skeleton.
2. Add plugin.xml metadata.
3. Add tool window UI.
4. Add actions.
5. Add settings panel.
6. Add CLI runner.
7. Add JSON models for scan/recommend output.
8. Add docs.
9. Add tests where practical.
10. Add GitHub Actions job for JetBrains plugin build only, not publish.

Commands to support:

* wma scan <workspace> --format json
* wma recommend <workspace> --format json
* wma repo-map <workspace> --format markdown
* wma rules <workspace> --target generic --mode repo-map-first
* wma report <workspace> --format markdown --include-repo-map

Docs:
Create:

* docs/jetbrains-plugin.md

Include:

* setup
* development
* run plugin sandbox
* build plugin zip
* limitations
* privacy/security notes
* future Marketplace publishing plan

CI:
Add workflow or extend CI:

* build JetBrains plugin
* run tests
* upload plugin zip artifact if built

Acceptance criteria:

* Gradle build passes.
* Plugin can run in IntelliJ sandbox.
* Tool window opens.
* Scan Workspace calls CLI and displays summary.
* Generate Repo Map opens Markdown output.
* Generate Agent Rules works.
* No telemetry/cloud calls.
* No arbitrary shell command execution.
* Docs explain limitations and local-first behavior.

After implementation, print:

1. Files changed.
2. JetBrains plugin structure.
3. Actions added.
4. Settings added.
5. How to run in IntelliJ sandbox.
6. Remaining TODOs.
