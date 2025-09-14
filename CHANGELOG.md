# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.6] - 2025-09-14

### Fixed
- Fixed npm-release-manager configuration to use correct branch name (master instead of main)
- Enhanced uv project initialization to include --package flag for proper Python package structure

## [1.0.5] - 2025-09-13

### Changed
- Automated release process optimization
- Updated CHANGELOG.md format and content

## [1.0.4] - 2025-09-13

### Added
- Added `__init__.py` import requirement instruction for better Python module structure
- Enhanced documentation and setup instructions

### Changed
- Updated version to 1.0.4 for release

### Fixed
- Fixed syntax errors in `.claude.md` template
- Properly escaped backticks for JavaScript parsing in templates

## [1.0.3] - 2025-09-12

### Added
- Initial public release
- Modern Python project template with comprehensive best practices
- CLI tool for creating Python projects with uv, ruff, mypy, pytest integration
- Claude Code integration and configuration
- Type hints support throughout the project
- Async programming patterns
- Pydantic and structlog integration
- Security testing with bandit

[1.0.4]: https://github.com/jhonma82/create-python-modern/releases/tag/v1.0.4
[1.0.3]: https://github.com/jhonma82/create-python-modern/releases/tag/v1.0.3