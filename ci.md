# Docker MCP Server - CI/CD Setup

This document describes the Continuous Integration and Continuous Deployment setup for the Docker MCP Server project.

## Overview

The CI/CD pipeline is implemented using GitHub Actions and includes:

1. **Linting** - Code quality checks with ESLint
2. **Type Checking** - TypeScript type validation
3. **Testing** - Comprehensive test suite with Jest
4. **Building** - TypeScript compilation
5. **Release Creation** - Automated releases on main branch commits

## GitHub Actions Workflow

The workflow file is located at `.github/workflows/ci-cd.yml` and runs on:

- All pushes to any branch
- Pull requests targeting main/master branches

### Jobs

#### 1. Lint and Type Check

- Runs ESLint to check code quality and style
- Performs TypeScript type checking
- Fails if any linting rules are violated or type errors exist

#### 2. Test

- Runs the complete test suite using Jest
- Generates code coverage reports
- Uploads coverage to Codecov (optional)
- Tests run in Node.js 20 environment

#### 3. Build

- Compiles TypeScript to JavaScript
- Uploads build artifacts for later use
- Only runs if linting and tests pass

#### 4. Release (Main branch only)

- Creates GitHub releases automatically when commits are pushed to main
- Generates release notes with commit information
- Creates and uploads release archives
- Only runs if all previous jobs pass

## Test Suite

The project includes comprehensive tests:

### Test Files

- `src/__tests__/docker.test.ts` - Docker service and manager tests
- `src/__tests__/tools.test.ts` - MCP tools registration and functionality tests
- `src/__tests__/config.test.ts` - Configuration validation tests
- `src/__tests__/integration.test.ts` - Integration and dependency tests

### Test Coverage

Current test coverage includes:

- Docker service functionality (container management, image operations)
- Docker manager multi-server operations
- MCP tool registration and parameter validation
- Configuration validation and error handling

### Running Tests Locally

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## Linting Configuration

ESLint is configured with:

- TypeScript parser for .ts files
- Node.js and Jest environments
- Basic ESLint recommended rules
- TypeScript-specific rules for unused variables
- Console warnings (allows error/warn, warns on log)

Configuration file: `.eslintrc.json`

## Jest Configuration

Jest is configured for:

- TypeScript support with ts-jest
- ES Modules support
- Code coverage reporting (HTML, LCOV, text)
- Test file patterns in `__tests__` directories
- Module name mapping for ES imports

Configuration file: `jest.config.js`

## Release Process

### Automatic Releases

- Releases are created automatically when commits are pushed to the main branch
- Release version is read from `package.json`
- Only creates a new release if the version tag doesn't already exist
- Includes build artifacts and source code

### Manual Version Updates

To create a new release:

1. Update the version in `package.json`
2. Commit and push to main branch
3. The CI/CD pipeline will automatically create the release

### Release Contents

Each release includes:

- Compiled JavaScript files (build artifacts)
- Source code archive
- Package.json and documentation
- Automated release notes with commit SHA and branch information

## Dependencies

### Production Dependencies

- `dotenv` - Environment variable management

### Development Dependencies

- `typescript` - TypeScript compiler
- `@types/*` - Type definitions
- `jest` & `ts-jest` - Testing framework
- `eslint` & `@typescript-eslint/*` - Linting
- `@modelcontextprotocol/sdk` - MCP framework
- `dockerode` - Docker API client
- `zod` - Schema validation

## Environment Requirements

### GitHub Repository Setup

- No special secrets required for basic functionality
- Optional: `CODECOV_TOKEN` for coverage reporting
- Uses default `GITHUB_TOKEN` for releases

### Local Development

- Node.js 20 or later
- npm for package management
- Docker (for runtime, not required for testing)

## Troubleshooting

### Common Issues

1. **TypeScript Version Warning**
   - The project uses TypeScript 5.9.2 which is newer than officially supported by ESLint
   - This warning can be ignored as functionality works correctly

2. **Module Resolution in Tests**
   - Jest is configured to handle ES modules and TypeScript imports
   - Test files use `.ts` extensions in imports, not `.js`

3. **Coverage Gaps**
   - Current coverage focuses on core functionality
   - Some integration paths require Docker daemon and are mocked in tests

### Adding New Tests

When adding new functionality:

1. Create corresponding test files in `src/__tests__/`
2. Follow the existing pattern of mocking external dependencies
3. Ensure tests are isolated and don't require external services
4. Update coverage collection patterns if needed

## Performance

The CI/CD pipeline typically completes in:

- Lint & Type Check: ~30-60 seconds
- Tests: ~30-60 seconds  
- Build: ~30 seconds
- Release: ~60 seconds

Total pipeline time: ~3-5 minutes for complete runs.
