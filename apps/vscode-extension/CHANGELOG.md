# Changelog

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
