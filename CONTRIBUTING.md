## Contributing Guide

Thank you for your interest in contributing! This guide will help you get set up and make successful contributions.

### Development Setup

1. Fork and clone the repository
2. Install dependencies in each package:
   - `LegisAPI/`
   - `LegisMCP_Server/`
   - `LegisMCP_Frontend/`
3. Copy environment templates (see each package docs) and set values via secrets, not in code

### Branching & Commits

- Create feature branches from `main`
- Use conventional commits:
  - `feat(scope): ...`
  - `fix(scope): ...`
  - `chore(oss): ...`
- Keep edits focused and small; add tests for critical logic

### Code Style

- TypeScript, strict types where possible
- No secrets in code or history
- Organize code with clear modules and `// MARK:` section headers where helpful

### Testing

- Add unit tests for services and utils
- Verify dev servers start for all three packages

### Security

- Never commit `.env`, `.dev.vars`, keys, or tokens
- Use placeholders in docs (`your-tenant.us.auth0.com`, `pk_live_...`)

### Pull Requests

- Describe changes and motivation
- Link related issues
- Confirm you ran build and basic tests locally

### License

By contributing, you agree your contributions are licensed under the MIT License.


