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

## Accessibility Testing

This project uses the Storybook Accessibility Addon (`@storybook/addon-a11y`) to help identify and fix accessibility issues in components during development.

### How to Use the Addon

1.  **Open a Story**: Navigate to any component story in the Storybook UI.
2.  **Select the Accessibility Tab**: In the addons panel at the bottom of the screen, click on the "Accessibility" tab.
3.  **Review the Results**: The panel will display a list of automated accessibility checks. It highlights:
    - **Violations**: Issues that fail accessibility standards (e.g., WCAG). These should be fixed.
    - **Passes**: Rules that the component correctly adheres to.
    - **Incomplete**: Rules that could not be automatically checked and may require manual verification.

By using this tool, you can catch common problems like incorrect color contrast, missing ARIA attributes, and improper element structures, ensuring our components are usable by as many people as possible.

## Benefits

- **Isolated Development**: Test components without full app context
- **Visual Testing**: Compare component states visually
- **Documentation**: Living documentation of component APIs
