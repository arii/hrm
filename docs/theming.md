# Frontend Theming Architecture

This document outlines the architecture of the frontend theming system, which is built upon Material-UI's (MUI) powerful theming capabilities. The goal is to create a robust, configurable, and extendable system that ensures visual consistency and improves developer experience.

## 1. Core Principles

-   **Centralized Design Tokens**: All core design tokens (colors, typography, spacing, etc.) are managed in a central location for consistency.
-   **Modularity**: The theme is broken down into smaller, manageable modules (palette, typography, components) to improve maintainability.
-   **Extensibility**: The system is designed to be easily extended with new themes (e.g., dark mode) or variations without significant refactoring.
-   **Developer Experience**: Components should be able to consume theme tokens intuitively, and the process for styling new components should be straightforward.

## 2. Directory Structure

The entire theme system is located in the `lib/theme/` directory:

```
lib/
└── theme/
    ├── components.ts       # MUI component style overrides
    ├── darkPalette.ts      # Color palette for dark mode
    ├── index.ts            # Main theme factory
    ├── lightPalette.ts     # Color palette for light mode
    └── typography.ts       # Typography scale and font settings
```

## 3. Key Files and Concepts

### `index.ts` (Theme Factory)

This is the heart of the theming system. It contains a `createCustomTheme` function that assembles and returns a complete MUI theme object.

-   It imports the different theme modules (palettes, typography, components).
-   It accepts a `mode` argument (`'light'` or `'dark'`) to dynamically select the appropriate color palette.
-   It combines the selected palette with common settings (typography, spacing, component overrides) to generate the final theme.

### `lightPalette.ts` & `darkPalette.ts`

These files define the color palettes for the application's light and dark themes.

-   They export a `palette` object that adheres to the MUI `PaletteOptions` structure.
-   This is where all application colors are defined, including `primary`, `secondary`, `background`, `text`, etc.

### `typography.ts`

This file defines the typographic scale for the application, from `h1` to `caption`.

-   It specifies `fontFamily`, `fontSize`, `fontWeight`, and `lineHeight` for each text variant.
-   Using these predefined variants in components ensures a consistent type hierarchy.

### `components.ts`

This module contains all global style overrides for MUI components.

-   It allows us to customize the default appearance and behavior of components like `MuiButton`, `MuiCard`, and `MuiTextField`.
-   This is the ideal place to enforce a consistent look and feel for base components across the application.

## 4. Consuming the Theme in Components

The theme is made available to all components via the `ThemeProvider` in `context/ThemeContext.tsx`. To access theme properties within a component:

### Using the `useTheme` Hook

The `useTheme` hook from `@mui/material/styles` provides direct access to the theme object. This is useful for applying theme-based styles that aren't covered by component props.

```jsx
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <Box sx={{ color: theme.palette.primary.main }}>
      This text uses the primary color from the theme.
    </Box>
  );
};
```

### Using the `sx` Prop

The `sx` prop, available on all MUI components, is the most common and recommended way to apply custom, one-off styles. It has access to the theme object, so you can reference design tokens directly.

```jsx
import Button from '@mui/material/Button';

const MyButton = () => (
  <Button
    sx={{
      backgroundColor: 'primary.main', // Accesses theme.palette.primary.main
      padding: (theme) => theme.spacing(2), // Use theme for spacing
      fontSize: 'h6.fontSize', // Access typography scale
    }}
  >
    Click Me
  </Button>
);
```

## 5. Adding and Modifying Themes

### To modify an existing theme:

-   **Colors**: Edit the `lightPalette.ts` or `darkPalette.ts` files.
-   **Typography**: Modify the values in `typography.ts`.
-   **Component Styles**: Update the overrides in `components.ts`.

### To add a new theme (e.g., "contrast"):

1.  Create a new palette file, e.g., `contrastPalette.ts`, in `lib/theme/`.
2.  Import the new palette in the theme factory (`lib/theme/index.ts`).
3.  Update the `createCustomTheme` function to accept the new theme name and return the corresponding palette.
4.  Update the `ThemeContext` to allow switching to the new theme.

## 6. Best Practices

-   **Always use theme tokens** for colors, spacing, and typography. Avoid hardcoding values (e.g., `'#FF0000'`, `'16px'`).
-   For component-specific styles that will be reused, consider creating a `Styled` component using MUI's `styled()` utility.
-   For one-off styles, the `sx` prop is preferred.
-   Keep the theme modules focused. `palette` should only contain colors, `typography` only type styles, etc.
-   When overriding component styles globally, do so in `components.ts`.
