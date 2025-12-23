# Theme System Architecture

This document outlines the architecture of the HRM Dashboard's theme system, which is built upon Material-UI's theming capabilities. The system is designed to be configurable, extensible, and easy to use, ensuring a consistent visual identity across the application.

## Core Concepts

The theme system is composed of three main parts:

1.  **Design Tokens:** A centralized collection of design values (colors, typography, spacing, etc.) that define the visual style of the application.
2.  **Theme Objects:** Material-UI theme objects that consume the design tokens to create concrete theme configurations for different modes (e.g., light and dark).
3.  **Theme Provider:** A React Context provider that makes the current theme object available to all components in the application and manages theme switching.

## File Structure

The theme system is organized within the `theme` directory:

-   `theme/designTokens.ts`: This file exports a `designTokens` object, which contains the theme configurations for both `light` and `dark` modes. It defines the color palette, typography, spacing, and other visual properties.
-   `theme/theme.ts`: This file imports the `designTokens` and uses Material-UI's `createTheme` function to generate the `lightTheme` and `darkTheme` objects.
-   `context/ThemeContext.tsx`: This file contains the `ThemeProvider` component and the `useTheme` hook. The provider is responsible for managing the current theme mode and making the appropriate theme object and the `toggleTheme` function available to its children.

## How to Use the Theme

To use the theme in a component, you can access the theme object in a few different ways.

### Using the `sx` Prop

The simplest way to apply theme-aware styles is to use the `sx` prop available on all MUI components. The `sx` prop accepts a function that receives the theme object as an argument, allowing you to access theme values directly.

```jsx
import Box from '@mui/material/Box';

const MyComponent = () => {
  return (
    <Box
      sx={{
        backgroundColor: (theme) => theme.palette.primary.main,
        color: (theme) => theme.palette.text.primary,
        padding: (theme) => theme.spacing(2),
      }}
    >
      Hello, Theme!
    </Box>
  );
};
```

### Using the `useTheme` Hook

For more complex scenarios where you need to access the theme object directly in your component's logic, you can use the `useTheme` hook from `@mui/material/styles`.

```jsx
import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;

  // ...
};
```

You can also use the `useTheme` hook from our custom `ThemeContext` to access the `toggleTheme` function.

```jsx
import { useTheme } from '@/context/ThemeContext';

const ThemeSwitcher = () => {
  const { mode, toggleTheme } = useTheme();

  return (
    <Button onClick={toggleTheme}>
      Switch to {mode === 'light' ? 'Dark' : 'Light'} Mode
    </Button>
  );
};
```

## Extending the Theme

To extend the theme, you should follow these steps:

1.  **Add New Design Tokens:** If you need to add a new color, font style, or other visual property, open `theme/designTokens.ts` and add it to both the `light` and `dark` theme configurations.
2.  **Use the New Token:** Once you've added the new token, you can use it in your components via the `sx` prop or the `useTheme` hook as described above.

By following this pattern, we can ensure that all new styles are theme-aware and contribute to a consistent and maintainable codebase.
