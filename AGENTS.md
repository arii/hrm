# AGENTS.md

## Commands

- `pnpm run test` - run the full test suite
- `pnpm run build` - build the project
- `pnpm run lint` - run the lint task
- `pnpm run format` - run the format task
- `pnpm exec jest <path>` - scoped unit run (preferred over full suite; never parallel with lint/build)
- `gh pr checks|view` / `gh issue view|comment` - PR/issue ops (repo `arii/hrm`)
- Push `.github/*` via SSH (`git push git@github.com:arii/hrm.git <branch>`) - HTTPS token lacks `workflow` scope
- VRT: root-basePath prod build with `NODE_ENV=production`, then `SKIP_WEBSERVER=1 PORT=3100`

## Code Map

- `app` - application source
- `tests` - automated tests
- `docs` - project documentation

## Conventions

- Use ESM `import`/`export` syntax for modules.
- Name Jest unit tests `*.test.ts`.
- Name Playwright tests `*.spec.ts`.
