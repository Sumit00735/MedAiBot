# Contributing to MedScan AI

Thank you for your interest in contributing to MedScan AI! 🎉

## Getting Started

1. **Fork** this repository
2. **Clone** your fork locally
3. **Install dependencies**: `npm install`
4. **Create a branch**: `git checkout -b feature/your-feature-name`
5. **Make your changes** and test them locally
6. **Commit**: `git commit -m "feat: add your feature description"`
7. **Push**: `git push origin feature/your-feature-name`
8. **Open a Pull Request** against the `main` branch

## Development Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your Gemini API key to .env.local
# Get one free at https://aistudio.google.com/

# Start development server
npm run dev
```

## Code Style

- Use **ES6+** syntax
- Follow existing code patterns and naming conventions
- Use `'use client'` directive for client-side components
- Keep components focused and reusable

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, etc.)
- `refactor:` — Code refactoring
- `perf:` — Performance improvements

## Reporting Bugs

Open an [issue](https://github.com/Sumit00735/MedAiBot/issues) with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
