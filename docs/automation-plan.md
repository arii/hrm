# Automation Plan for Chrome DevTools Workflows

**Last updated:** 2025-11-10

## Goal

Automate end-to-end verification of the HRM application by launching the custom dev stack, opening required Chrome pages, driving user flows (including mock inputs), and capturing deterministic screenshots for documentation and regression testing.

## Tooling Evaluation

### Node.js / npm Ecosystem (Recommended)

- **Playwright (Node)** provides first-class Chromium control, built-in screenshot APIs, video capture, and resilient waiting primitives.
- **Chrome DevTools MCP client (TypeScript)** already exists in this repos workflows, allowing reuse of established launch flags and VS Code tasks.
- **Integration ease**: aligns with existing TypeScript codebase, npm scripts, and CI tooling; no cross-language dependency management.
- **Community support**: modern ecosystem, active maintenance, fits well with Next.js stack.

### Python Ecosystem

- **Playwright (Python)** mirrors Node features but introduces a second language runtime, extra virtual environment management, and synchronization challenges with npm-based tasks.
- **Selenium / PyAutoGUI** would require heavier setup and offer less stability compared to Playwright.
- **Integration friction**: mixing Python automation with Node services complicates developer onboarding and CI.

### Decision

Use **Node-based automation** (Playwright + optional Chrome DevTools MCP helpers) to minimize tooling sprawl and maximize reuse of current scripts. Python solutions are not necessary unless future requirements demand specialized data analysis workflows.

## Implementation Roadmap

1. **Environment Orchestration Script**
   - Create `scripts/start-dev-with-chrome.ts` (run via ts-node) to:
     - Ensure dev server (`pnpm run dev:clean`) is running in background.
     - Launch Chrome with required debugging flags (reusing documented flags) and record PID.
     - Optionally start the Chrome DevTools MCP server for advanced workflows.
     - Emit structured status logs and teardown instructions.

2. **Baseline Navigation & Interaction**
   - Implement `scripts/automation/baseline.ts` using Playwright:
     - Connect to the running Chromium instance (or launch within Playwright with equivalent flags).
     - Open dashboard, control panel, mock client, and connect page.
     - Drive the mock client to simulate HR data, start Tabata timer, and confirm state changes via assertions.
     - Provide CLI prompts (inquirer-style) for manual step-by-step confirmation when needed.

3. **Screenshot Capture Pipeline**
   - Extend baseline script or create `scripts/automation/capture-screenshots.ts` to:
     - Apply consistent viewport, theme, and auth state.
     - Capture full-page screenshots after each major interaction.
     - Store assets under `screenshots/baseline/DATE/` and optionally compare against previous baselines.

4. **Enhanced Flow Coverage**
   - Add scenario modules to exercise Spotify controls (using test doubles), timer transitions, and Bluetooth mock hookups.
   - Introduce reusable helper library (`scripts/automation/helpers.ts`) for selectors, waits, and WebSocket validation stubs.

5. **Command & Documentation Integration**
   - Update `package.json` (see "Package.json Script Plan" below) so new automation entry points are easily discoverable.
   - Document usage, prerequisites, and troubleshooting in `docs/automation-plan.md` and update `README.md` quick start section.

6. **Future Enhancements**
   - Integrate screenshot diffing (Playwright, pixelmatch) for regression detection.
   - Pipe results into CI (GitHub Actions) to run headless verification on pushes.
   - Extend MCP-driven flows for DOM inspections and performance tracing if needed.

## Next Steps

- Prototype `start-dev-with-chrome.ts` leveraging existing MCP launch instructions.
- Scaffold Playwright project structure inside `scripts/automation/` with shared config.
- Validate baseline navigation and screenshot capture locally, iterate on flakiness, and finalize documentation.

## Package.json Script Plan

1. **Inventory Current Scripts**
   - Review existing automation-related entries (`mcp:chrome-devtools`, `dev:clean`, etc.) to avoid collisions and reuse patterns for background execution.

2. **Prune / Consolidate Legacy Commands**
   - Identify redundant or obsolete scripts (e.g., stale `dev:*` variants, unused deploy helpers) and fold their behavior into the new automation pipeline where appropriate.
   - Remove aliases that duplicate functionality while documenting any intentional changes in `CHANGELOG` or commit messages so downstream environments stay aligned.

3. **Add Core Automation Commands**
   - `automation:start`: runs `tsx scripts/start-dev-with-chrome.ts` (or `ts-node` if preferred) to orchestrate dev server + Chrome setup.
   - `automation:baseline`: runs Playwright baseline navigation script (`tsx scripts/automation/baseline.ts`).
   - `automation:screenshots`: runs screenshot capture (`tsx scripts/automation/capture-screenshots.ts`).
   - Include optional `automation:teardown` for stopping Chrome/MCP processes (call helper script).

4. **Wire Supporting Utilities**
   - Add helper script shortcuts if needed, e.g., `automation:reset` for cleaning screenshots directory, `automation:report` to summarize outputs.
   - Ensure `playwright test` integration remains separate (`pnpm run test:visual`) but reference the new automation scripts in documentation.

5. **Dependency Verification**
   - Confirm `tsx` (or `ts-node`) and `playwright` are present in `devDependencies`; add `@playwright/test` if not already installed.
   - Update `pnpm run lint` or CI workflows if they should lint new TypeScript automation files.

6. **Documentation & Task Sync**
   - Mirror new pnpm scripts in `.vscode/tasks.json` for quick access via VS Code Run panel.
   - Update `README.md` and this plan with usage examples (`pnpm run automation:baseline`).
