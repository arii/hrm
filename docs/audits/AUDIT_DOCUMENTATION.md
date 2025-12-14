# [Audit] Documentation & Repository Structure

## Summary
This audit reveals that while the repository contains a substantial amount of documentation, it suffers from significant organizational issues and "documentation drift." The `README.md` is comprehensive but contains outdated information. The file structure is disorganized, violating standard Next.js conventions and creating clutter. Finally, inline code documentation is sparse, failing to adhere to TSDoc standards, which hinders maintainability.

## Structure Refactoring Proposals

| Area                  | Issue                                                                                                                                                             | Recommendation                                                                                                                                                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root Directory**    | **Clutter and Disorganization**: The root directory is cluttered with numerous `.md` files, configuration files (`middleware.ts`, `server.ts`), and conflicting lockfiles. | **Consolidate and Reorganize**: <br> 1. Create a `docs/` directory and move all supplementary Markdown files into it (`DESIGN_GUIDELINES.md`, `DEVELOPMENT.md`, etc.). <br> 2. Create a `src/` directory to house all source code (`app`, `components`, `lib`, `services`, `server.ts`, etc.) for a cleaner root. <br> 3. Standardize on `pnpm` and delete the `package-lock.json` file. |
| **`app/` Directory**  | **Mixing UI and Logic**: The `app/` directory currently contains API routes (`app/api/`), client pages (`app/client/`), and main pages (`app/page.tsx`).             | **Adhere to App Router Conventions**: Keep the `app/` directory strictly for routing. Business logic, services, and complex utilities should be located in the `src/lib/` or `src/services/` directories to maintain a clear separation of concerns.                                                                  |
| **`components/`**     | **Lack of Co-location**: Reusable components are in a flat structure, and components specific to a certain page (e.g., `ControlPanel`) are not grouped.            | **Group by Feature/Route**: For complex pages, co-locate page-specific components in a sub-directory. For example, components used only in `app/client/control/page.tsx` should live in `app/client/control/_components/`. This makes it easier to understand dependencies.                                   |

## Missing Documentation

1.  **Architecture Decision Record (ADR)**: The `README.md` explains that the server is stateful and cannot be deployed on Vercel, but it doesn't explain *why* this architectural choice was made. An ADR file (e.g., `docs/adr/001-custom-stateful-server.md`) would provide critical context for future developers.
2.  **CI/CD Pipeline Guide**: There is no documentation explaining the CI/CD workflow, what the different jobs do, or how to interpret their results.
3.  **Onboarding Checklist**: While the setup instructions are detailed, a simple checklist for a new developer (e.g., "1. Clone repo, 2. Create `.env.local`, 3. Run `pnpm install`...") at the top of the README would improve the onboarding experience.

## Comment Quality Report

The project severely lacks high-quality, standardized inline documentation.

*   **File**: `services/tabataTimer.ts`
*   **Issue**: **Missing TSDoc Blocks**: None of the public methods (`getState`, `setConfig`, `handleCommand`, `setMode`) have TSDoc comments. A developer cannot understand what these methods do, what parameters they expect, or what they return without reading the source code. This is a major violation of best practices for a library-like service module.
*   **Impact**: Increased cognitive load for new developers, higher risk of misuse, and difficult to auto-generate documentation.
*   **Recommendation**: Enforce a strict TSDoc policy for all exported functions, classes, and types. Use an ESLint plugin (`eslint-plugin-jsdoc`) to enforce this standard automatically.

**Example of Poor Documentation (Current):**
```typescript
// services/tabataTimer.ts

// ...
  public setConfig(config: { workDuration: number; restDuration: number }) {
    const sanitizedWorkDuration = Math.max(1, Math.floor(config.workDuration))
    const sanitizedRestDuration = Math.max(0, Math.floor(config.restDuration))

    this.timerState.workDuration = sanitizedWorkDuration
    this.timerState.restDuration = sanitizedRestDuration
    // ...
  }
// ...
```

**Example of Good Documentation (Recommended):**
```typescript
// services/tabataTimer.ts

// ...
  /**
   * Updates the timer's work and rest durations.
   * Sanitizes inputs to ensure they are valid integers.
   * If the timer is idle, it updates the initial countdown value.
   * @param config - The new timer configuration.
   * @param config.workDuration - The duration of the work phase in seconds.
   * @param config.restDuration - The duration of the rest phase in seconds.
   */
  public setConfig(config: { workDuration: number; restDuration: number }): void {
    const sanitizedWorkDuration = Math.max(1, Math.floor(config.workDuration))
    const sanitizedRestDuration = Math.max(0, Math.floor(config.restDuration))

    this.timerState.workDuration = sanitizedWorkDuration
    this.timerState.restDuration = sanitizedRestDuration
    // ...
  }
// ...
```

## Setup/Onboarding Fixes

The `README.md` `Quick Start` section needs to be corrected for clarity and accuracy.

*   **Problem**: The manual setup guide is confusing. It lists `pnpm install` correctly but then provides `npm` commands in a separate block. It also refers to outdated script names like `test:core`.
*   **Solution**: Rewrite the setup instructions to be a single, clear, step-by-step list using only `pnpm` commands. Update all script names and file paths to match the current state of the repository.

**Proposed README `Quick Start` Section:**
```markdown
## Quick Start

### 1. Prerequisites
- Node.js (v18+)
- pnpm (`npm install -g pnpm`)

### 2. Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/arii/hrm.git
   cd hrm
   ```
2. **Configure Environment:**
   ```bash
   cp .env.example .env.local
   ```
   *Edit `.env.local` and add your Spotify and NextAuth credentials.*

3. **Install Dependencies:**
   ```bash
   pnpm install --frozen-lockfile
   ```
4. **Install Browser Binaries:**
   ```bash
   pnpm exec playwright install --with-deps
   ```

### 3. Run the Application
```bash
pnpm run dev
```
The application will be available at `http://127.0.0.1:3000`.
```
