# Changelog

## [0.1.4] - 2026-07-19

### Added

- Native Activity Bar workspace view with scan state, recommendations, and quick actions
- Full dashboard navigation and searchable model catalogue
- Plain HTML/CSS/JS product website and local JSON report viewer

### Fixed

- Dashboard controls now work under the extension content security policy
- Product links no longer point to the retired ChatGPT Sites deployment

## [0.1.3] - 2026-07-19

### Added

- Responsive VS Code dashboard with provider coverage, ranked alternatives, and actionable context-fit guidance
- Expanded catalogue with 20 models and nine provider endpoints, including four local runtimes

### Fixed

- Optional workspace catalogue probes no longer emit false missing-file errors
- Recommendation tiers use their own ranked next-best candidate instead of catalog order
- Confidence scoring now considers reasoning, coding quality, context fit, and deterministic tie-breaks

## [0.1.1] - 2026-06-13

### Added
- Extension icon for Marketplace and Open VSX listings
- First-run onboarding welcome message (shown once, non-intrusive)
- Quick Start command with step-by-step guide
- Screenshot placeholders and documentation for capturing them
- Marketplace-optimized README with trust banner and install links

### Changed
- Improved README top section with hero title, badges, and install table
- Updated extension README for Marketplace presentation

### Security
- No telemetry, no cloud calls, no source upload (unchanged from 0.1.0)

## [0.1.0] - 2026-06-11

### Added
- Initial release
- Workspace file scanning and token estimation
- Model selection recommendation engine with 9 bundled models
- VS Code extension with dashboard, report export, and compare-models view
- Agent rules generation from workspace context
- Repo map generation for structured agent context
- CLI with 6 commands: `scan`, `recommend`, `repo-map`, `rules`, `report`, `catalog validate`
- Privacy-first architecture: all computation local by default
- BYOK-friendly: bring your own API keys for cloud models
- Model catalog with providers: OpenAI, Anthropic, Google AI, Ollama, OpenRouter
