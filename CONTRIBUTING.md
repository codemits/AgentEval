# Contributing to AgentEval

Thank you for your interest in contributing to AgentEval! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)

## Code of Conduct

Be respectful and inclusive. We're all here to learn and improve the project together.

## Security

- Never commit sensitive data (API keys, passwords, tokens)
- Use `.env` for configuration (never commit this file)
- Review `.gitignore` before committing
- Report security issues by opening a GitHub issue

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/agent-eval.git`
3. Add upstream remote: `git remote add upstream https://github.com/originalowner/agent-eval.git`

## Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the mock server (Terminal 1)
npm run start:mock

# Run the agent (Terminal 2)
npm run start

# Run evaluation
npm run evaluate

# Development mode with auto-reload
npm run dev:mock
```

## Project Structure

```
src/
├── mock-server.ts      # Express API server
├── tools.ts            # Agent utilities (API calls, validation)
├── agentRunner.ts      # Agent execution engine
└── evaluate.ts         # Evaluation framework

dist/                   # Compiled JavaScript (generated)
```

## Making Changes

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

Examples:
```
feat(agent): add support for POST requests
fix(evaluate): correct schema validation logic
docs(readme): update installation instructions
refactor(tools): extract HTTP client to separate module
```

## Testing

```bash
# Run all tests
npm test

# Type check only
npm run lint

# Test individual components
node dist/agentRunner.js
node dist/evaluate.js
```

### Adding Tests

When adding new features:
1. Add test cases to `test.sh` if applicable
2. Ensure all existing tests pass
3. Update documentation

## Submitting Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:
   ```bash
   npm run build
   npm test
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** with:
   - Clear title and description
   - Reference any related issues
   - Screenshots if applicable
   - Test results

## Coding Standards

### TypeScript

- **Use strict TypeScript**: Enable all strict type checking
- **Type everything**: Avoid `any` types when possible
- **Use interfaces**: Define clear interfaces for data structures
- **Document functions**: Add JSDoc comments for public functions

Example:
```typescript
/**
 * Execute the agent workflow
 * @param prompt - The user prompt to guide execution
 * @returns Array of execution trace steps
 */
export async function runAgent(prompt: string): Promise<TraceStep[]> {
  // Implementation
}
```

### Code Style

- **Indentation**: 2 spaces
- **Line length**: 80-100 characters (flexible)
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for types and interfaces
  - `UPPER_CASE` for constants
- **Imports**: Group by type (Node built-ins, external, internal)

### File Organization

```typescript
// 1. Imports
import { external } from 'external-package';
import { internal } from './internal-module.js';

// 2. Type definitions
interface MyInterface {
  // ...
}

// 3. Constants
const MY_CONSTANT = 'value';

// 4. Helper functions
function helperFunction() {
  // ...
}

// 5. Main exports
export function mainFunction() {
  // ...
}
```

## What to Contribute

### Good First Issues

- Add more validation rules to evaluation framework
- Improve error messages
- Add more test cases
- Update documentation
- Add examples

### Feature Ideas

- Support for different HTTP methods (POST, PUT, DELETE)
- Plugin system for custom validators
- CLI interface
- Configuration file support
- Parallel test execution
- More detailed HTML reports
- Support for multiple API servers

### Bug Reports

When reporting bugs, include:
- Description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS)
- Error messages or logs

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to AgentEval! 🚀
