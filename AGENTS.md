# AGENTS.md

## Commands

- `pnpm run test` - run the full test suite
- `pnpm run test:unit` - run unit tests
- `pnpm run build` - build the project
- `pnpm run lint` - run the lint task
- `pnpm run format` - run prettier formatting
- Dev server: `pnpm run dev:preview` (preview env for `https://dev-onasafari.ddns.net:8443/hrm` lives inline in that `package.json` script)

## Code Map

- `app` - application source (served under `/hrm` subpath)
- `components` - React components (`WorkoutPhaseGrid.tsx` native table)
- `lib` - utilities (`workoutSizing.ts` content-aware font scaling)
- `tests` - automated tests
- `docs` - project documentation

## Conventions & Workflow

- **Review Recent PRs First**: Check recent PRs (`gh pr list --state all --limit 10`, `gh pr view <number>`) before authoring code/tests to understand active architecture patterns.
- **Git & PRs**:
  - Always branch and target `leader` (never `main`).
  - Follow Conventional Commits format (e.g. `fix(dashboard): ...`).
  - Run `pnpm run lint && pnpm run format` before pushing.
  - Submit PRs via `gh pr create --base leader` and watch CI via `gh pr checks <PR> --watch`.
- **Dashboard & Scaling**:
  - Native table is active (`NEXT_PUBLIC_USE_NATIVE_TABLE=true`).
  - Canvas is fixed at 1600×900 via `ScaledStage`.
  - Workout card heights are fixed (~426px); exercise font sizes step down monotonically (`scaledExerciseFontRem`) and are guarded against clipping with client measurement in `WorkoutPhaseGrid.tsx`.
- **MCP Tool Caveat**: The `boomtick` MCP server is configured for `tech-dancer`. For repo modifications in `hrm`, use standard `git` and `gh` CLI commands.
- Use ESM `import`/`export` syntax for modules.
- Name Jest unit tests `*.test.ts`.
- Name Playwright tests `*.spec.ts`.
- Use `.ts` or `.tsx` extensions for TypeScript files.
