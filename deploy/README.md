# Deployment Configuration - Temporary Regression Prevention

This directory contains production configuration files and documentation for the HRM deployment strategy.

## Overview

The changes in this directory implement a **temporary fix** to prevent regressions in the `deploy.yml` workflow when transitioning from Next.js **standalone** builds to standard **non-standalone** builds that output to `.next_prod`.

## The Problem

The branch introduced changes to:

- Use non-standalone mode in root with `distDir: '.next_prod'`
- Use standalone mode in deploy with `output: 'standalone'`
- Serve static assets from `.next_prod/static`

Without updates to the build and deployment pipeline, the workflow would fail because:

1. The root build outputs to `.next_prod` (non-standalone) but deployment uses standalone
2. The packaging script needs to handle both modes correctly
3. The server would look for static assets in the wrong directory

## The Solution (Temporary)

This folder centralizes production configuration to prevent regressions:

- **next.config.js** - Deployment config with `output: 'standalone'`
- **ecosystem.config.cjs** - PM2 process management config
- **start-production.sh** - Production startup script with validation
- **README.md** (this file) - Documentation of the temporary fix

The workflow now:

1. Copies `deploy/next.config.js` to the project root before building for deployment
2. Sets `IS_DEPLOYMENT=true` environment variable
3. Uses `deploy/` config files in the release artifact
4. Packages `.next/standalone` for deployment

## How It Works

### Build Pipeline (.github/workflows/deploy.yml)

```yaml
# Before build, use production config
cp deploy/next.config.js next.config.js
IS_DEPLOYMENT=true pnpm run build  # Outputs to .next_prod
./scripts/package.sh  # Packages from .next_prod, copies deploy/* files
```

### Server (server.ts)

```typescript
const isDeployment = process.env.IS_DEPLOYMENT === 'true'
const nextDir = isDeployment ? '.next_prod' : '.next'
const staticPath = path.join(process.cwd(), nextDir, 'static')
```

### Packaging (scripts/package.sh)

```bash
# Copy production build
cp -r .next_prod release_build/

# Copy production configs from deploy/
cp deploy/next.config.js release_build/
cp deploy/ecosystem.config.cjs release_build/
cp deploy/start-production.sh release_build/
```

## Why This Is Temporary

This solution is intentionally minimal to prevent immediate regressions. A comprehensive deployment strategy should:

1. **Separate configs properly** - Move all production-specific configs to their rightful places
2. **Update base templates** - Update root `next.config.js` to use conditional distDir based on environment
3. **Improve CI/CD** - Design a cleaner build process that doesn't require file copying
4. **Add validation** - Enhanced checks for build artifacts and configuration
5. **Document end-to-end** - Complete deployment workflow documentation

For now, this folder serves as a temporary bridge to prevent regression while the team plans comprehensive improvements.

## Implementation Changes

### Phase 1: Prevent Regressions (Minimal Changes)

- [x] Copy files from origin/leader into ./deploy
  - [x] next.config.js (uses `distDir: '.next_prod'` for production)
  - [x] ecosystem.config.cjs
  - [x] start-production.sh (updated version using non-standalone build)

### Phase 1.5: Build Configuration

- [x] Update deploy.yml Build Artifact step
  - [x] Add `IS_DEPLOYMENT=true` to env block
  - [x] Add step to overwrite next.config.js: `cp deploy/next.config.js next.config.js`
  - This ensures build uses production config with `.next_prod` distDir

### Phase 2: Update Server Configuration

- [x] Update server.ts
  - [x] Add `dir: process.cwd()` to next() initialization
  - [x] Use IS_DEPLOYMENT env var to conditionally set:
    - staticPath to `.next_prod/static` (deployment) or `.next/static` (dev)
    - nextDir variable to `.next_prod` or `.next` based on environment
  - IS_DEPLOYMENT is set by deploy.yml and deploy/start-production.sh

### Phase 3: Update Packaging Script

- [x] Update scripts/package.sh
  - [x] Copy files from ./deploy/ (next.config.js, ecosystem.config.cjs, start-production.sh) instead of project root files
  - [x] Replace .next/standalone copying with .next_prod directory
  - [x] Maintain compatibility with existing artifact structure

## Modified Files

| File                         | Change                                            | Reason                                                 |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| .github/workflows/deploy.yml | Add IS_DEPLOYMENT=true; cp deploy/next.config.js  | Use production config during build                     |
| server.ts                    | Add IS_DEPLOYMENT check for nextDir/staticPath    | Support both dev and deployment paths                  |
| scripts/package.sh           | Copy from deploy/ instead of root; use .next_prod | Centralize production config; use correct build output |
| deploy/start-production.sh   | Updated                                           | Production startup script                              |

## Reference

See [relevant_changes.log](./relevant_changes.log) for detailed diffs from the leader branch.
