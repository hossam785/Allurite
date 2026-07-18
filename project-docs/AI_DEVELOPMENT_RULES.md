# AI Development Rules: Allurite CRM

## Code Integrity & Architecture Rules
1. **Type Safety**:
   - Use strict TypeScript. Never use `any`. Specify exact interfaces and types for all variables, parameters, and return types.
2. **Design Patterns**:
   - Prefer declarative over imperative code.
   - Use clean architecture layers: Controllers/Handlers -> Services -> Data Access Models.
   - Separate business logic from UI rendering completely.
3. **Refactoring Principles**:
   - Do not duplicate code. DRY (Don't Repeat Yourself) must be enforced.
   - If a function exceeds 50 lines, refactor it into smaller, single-responsibility functions.
   - Keep files under 300 lines of code.

## Validation & Verification Requirements
- Every new codebase change must be verified against current types.
- Ensure all API inputs are validated at the boundaries (using Zod or equivalent validation schemas).
- Ensure database interactions are validated schema-side to prevent malicious/corrupt payloads.

## Code Commenting & Documentation
- Document all public utility functions and classes using JSDoc.
- Retain all existing unrelated comments in the codebase.
- Explain "why" code was written, not just "what" it does.
