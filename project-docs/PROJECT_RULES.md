# Project Rules: Allurite CRM

## Core Project Constraints
1. **Directory Structure**:
   - `/project-docs/`: Project documentation and governance systems.
   - `/src/`: Production source code.
   - `/public/`: Public assets.
2. **Branch Management**:
   - `main`: Production-ready branch. No direct commits to `main` without review.
   - All feature branches must map to a specific task name and task ID.
3. **Commit Standards**:
   - Commit messages must follow conventional commits: `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`.
   - Never commit API keys, environment variables, credentials, or secrets. Ensure `.gitignore` is strictly configured.

## Quality Gates
- Code must pass linting and TypeScript checks before integration.
- No commit is allowed if it breaks existing types, compilation, or builds.
- PRs must contain verification evidence (manual screenshots, console outputs, or automated test runs).

## Workflow Execution
- Every developer action must reference a task in `/project-docs/TASK_EXECUTION_RULES.md`.
- No ad-hoc development outside defined tasks.
- If scope changes, the task definition must be updated and approved before editing code.
