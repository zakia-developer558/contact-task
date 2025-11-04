# Contacts-Tasks App

Feature-rich Next.js App Router application to manage contacts and their tasks at scale.

## Highlights

- 12k+ contacts dataset with fast virtualized list.
- Search, sort, pagination, and row density toggle (`comfortable`/`compact`).
- Keyboard shortcuts: `/` focus search, `r` reset, `d` toggle density; list nav with `j/k`, arrows, Home/End, Enter.
- Tasks: create, edit, toggle complete, delete; fully optimistic with error toasts and retry for failed optimistic creates.
- Accessibility: labeled controls, roles, `aria-pressed` on density toggle, focus management.
- Storage: JSON files on disk with in-memory caching.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- ESLint + Prettier
- Jest + React Testing Library
- Playwright (e2e)

## Commands

- `npm run dev` – start dev server at `http://localhost:3000/`
- `npm run build` – build for production
- `npm start` – run the production build
- `npm run lint` – run ESLint
- `npm test` – run unit/integration tests
- `npm run e2e` – run Playwright tests
- `npm run format` – format code with Prettier

## Notes

- Contacts and tasks data persist under `data/contacts.json` and `data/tasks.json`.
- The Contacts page implements virtualized rendering without external deps for performance and simplicity.

## Setup

- Prerequisites: Node.js 18+ and npm
- Install dependencies: `npm install`
- Start dev server: `npm run dev` and open `http://localhost:3000/`
- Optional: Seeded data lives under `data/contacts.json` and `data/tasks.json`

## Features Checklist

- Contacts: large dataset (12k+), instant search, sort, density modes
- Tasks: create/edit/toggle/delete with optimistic UI and error toasts
- Keyboard navigation and shortcuts for common actions
- Preferences persisted (density, sort) across reloads
- Accessible controls with labels, roles, and focus management
- Performance: memoization, efficient list updates, minimal re-renders

## Trade-offs

- Persistence uses JSON files for simplicity; suitable for demo/small scale, not multi-user.
- Custom lightweight list rendering instead of heavy virtualization libraries to reduce deps.
- Coverage focuses on services and critical UI flows; API route units are limited due to Next integration, but main flows are covered via component and e2e tests.

## Testing & Coverage

- Unit/Component: `npm test` (Jest + RTL)
- Coverage: generated under `coverage/` with HTML at `coverage/lcov-report/index.html`
- E2E: `npm run e2e` (Playwright)

Coverage summary from latest run:
- Statements: 34.62%
- Branches: 30.40%
- Functions: 33.99%
- Lines: 35.92%

## Submission

- GitHub (recommended):
  - `git init && git add . && git commit -m "Initial"`
  - Create a GitHub repo and push: `git remote add origin <your_repo_url>` then `git push -u origin main`
  - Share the repo link
- Zip archive (without `node_modules`):
  - Option 1 (Git): `git archive -o contacts-tasks-app.zip HEAD`
  - Option 2 (PowerShell): compress folder after removing `node_modules` — `Remove-Item -Recurse -Force node_modules; Compress-Archive -Path . -DestinationPath contacts-tasks-app.zip`

## Deliverables Checklist

- [x] GitHub repo or zipped project
- [x] README with setup, feature checklist, trade-offs
- [x] ADR.md with architecture and decision notes
- [x] LOG.md with work steps and timeline
- [x] Unit, component, and e2e tests with coverage
- [ ] Optional 3-min demo video

## Evaluation Criteria

1. Architecture & Structure (20)
2. Code Quality (20)
3. Problem Solving & Correctness (20)
4. Edge Case Handling (15)
5. Performance (15)
6. Accessibility (5)
7. Testing (5)

## Demo Video (Optional)

- Record a short walkthrough (≤3 minutes):
  - Show landing page at `http://localhost:3000/` and Features.
  - Navigate to Contacts; demonstrate search, sort, density toggle, and keyboard shortcuts.
  - Create/edit/delete a task; show optimistic update and error toast/retry.
  - Briefly call out performance choices and accessibility.
