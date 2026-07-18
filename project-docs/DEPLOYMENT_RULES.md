# Deployment Rules: Allurite CRM

## Pre-deployment Quality Gates
- Code must compile with zero compiler errors or warnings in TypeScript.
- All linting rules must pass without errors (`npm run lint`).
- Code must not contain any console logs, test credentials, debug flags, or localhost endpoints.

## Bundle Optimization
- Production build must use minified assets.
- Route-based code splitting must be configured to optimize initial page loading.
- Compress public assets (images, SVGs) before publishing.

## Environment Management
- Environment configurations must rely on system environment variables (e.g. `process.env.MONGODB_URI`).
- Create and maintain a `.env.example` showing all required configuration keys.
- Do not commit `.env` or `.env.local` to git repository.

## Pipeline & Verification
- Use automated CI/CD pipelines (e.g. GitHub Actions) to run lint checks, builds, and tests on pull requests.
- Deployments must support zero-downtime rolling updates.
- Post-deployment smoke tests must verify core endpoints and database connectivity.
