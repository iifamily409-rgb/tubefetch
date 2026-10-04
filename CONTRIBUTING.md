# Contributing to TubeFetch

Thank you for your interest in contributing to TubeFetch! This document provides guidelines for contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tubefetch.git
   cd tubefetch
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Make your changes in the appropriate files.

3. Run tests to ensure nothing is broken:
   ```bash
   npm test
   ```

4. Run the linter:
   ```bash
   npm run lint
   ```

## Code Style

- Use TypeScript with strict mode
- Follow existing code conventions
- Use functional components with hooks
- Keep components small and focused
- Write meaningful commit messages

## Component Guidelines

- Place reusable components in `src/components/`
- Place page components in `src/pages/`
- Keep business logic in `src/services/`
- Define types in `src/types/`
- Utility functions go in `src/lib/`

## Testing

- Write tests for new functionality
- Update existing tests when changing behavior
- Use Vitest for unit tests
- Mock external dependencies

## Pull Request Process

1. Ensure your code passes all tests and linting
2. Update the README.md if needed
3. Create a Pull Request with a clear description
4. Wait for review and address any feedback

## Reporting Issues

- Use the GitHub issue tracker
- Provide steps to reproduce
- Include your environment details
- Add screenshots if applicable

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

Thank you for contributing! 🎉
