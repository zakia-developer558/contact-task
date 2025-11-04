# Architecture Decision Record (ADR)

This ADR captures the architecture and key decisions for the Contacts-Tasks App.

## Stack & Structure

- Framework: Next.js 16 (App Router) with TypeScript
- UI: Tailwind CSS v4
- Testing: Jest + React Testing Library (unit/component), Playwright (e2e)
- Lint/Format: ESLint + Prettier
- Data: JSON files in `data/` with in-memory caching
- Routing: App Router pages under `src/app/` (`/`, `/contacts`, `/contacts/[id]`, API routes)

## Core Decisions

1. App Router
   - Rationale: Simplifies file-based routing, server actions, and modern layouts.
   - Impact: Clear separation of pages and API routes; improved data fetching patterns.

2. Persistence via JSON files
   - Rationale: Simple local persistence for demo and offline-friendly development.
   - Trade-off: Not suitable for concurrent multi-user writes; limited scalability.

3. In-memory caching for services
   - Rationale: Reduce disk reads during requests; improve responsiveness.
   - Trade-off: Cache invalidation needs care; reset on server restart.

4. Optimistic UI for tasks
   - Rationale: Immediate feedback for create/edit/delete and toggle actions.
   - Trade-off: Requires rollback on failures; error toasts with retry implemented.

5. Keyboard-friendly interactions
   - Rationale: Speed up navigation for large datasets.
   - Implementation: Shortcuts for search (`/`), reset (`r`), density toggle (`d`), and list navigation (`j/k`, arrows, Home/End, Enter).

6. Performance-first list updates
   - Rationale: Handle 12k+ contacts smoothly without heavy dependencies.
   - Implementation: Efficient state updates, memoization, and careful re-render control.

7. Accessibility
   - Rationale: Ensure usable controls for keyboard and assistive tech.
   - Implementation: Labels, roles, `aria-pressed`, focus management, and sensible semantics.

8. Testing strategy
   - Rationale: Confidence via unit tests for services, component tests for UI logic, and e2e for main flows.
   - Trade-off: API route units are limited due to framework integration; coverage emphasizes services and components.

## Notable Alternatives Considered

- Database (SQLite/Postgres) instead of JSON: More robust but heavier setup; JSON chosen for simplicity.
- Virtualization library (react-window): Removed to reduce dependencies; custom efficient rendering used.
- Server-side redirects from `/` to `/contacts`: Reconsidered; landing page kept as default (`/`) per product preference.

## Risks & Mitigations

- Concurrent writes to JSON: Low risk in single-user demo; would require a real DB for production.
- Optimistic update failures: Toasts and retry pathways mitigate user confusion.
- Large dataset: Performance profiling performed; memoization and batched updates reduce churn.

## Future Enhancements

- Migrate persistence to SQLite/Prisma or Postgres for multi-user robustness.
- Add API route unit tests via request mocks for higher coverage.
- Expand accessibility audit (color contrast, ARIA landmarks) and add automated checks.