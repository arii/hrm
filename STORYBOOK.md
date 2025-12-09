# Storybook Component Development

This document describes the Storybook setup for developing and visualizing MUI components in isolation.

## Overview

Storybook allows us to develop and test UI components independently from the main application, without needing to run the full server stack or mock WebSocket/Auth dependencies.

## Available Stories

### HrTile Component

Location: `stories/HrTile.stories.tsx`

The HrTile story demonstrates different heart rate zones with various configurations:

- **Rest Zone** (45% - Green)
- **Cardio Zone** (78% - Orange)
- **Peak Zone** (95% - Red)

## Running Storybook

```bash
# Start Storybook development server
npm run storybook

# Build static Storybook
npm run build-storybook
```

## Benefits

- **Isolated Development**: Test components without full app context
- **Visual Testing**: Compare component states visually
- **Documentation**: Living documentation of component APIs
