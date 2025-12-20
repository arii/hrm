# Frontend Theming Architecture

This document outlines the architecture of the configurable and extendable theme system for the HRM application.

## 1. Overview

The theme system is built upon Material-UI's (MUI) theming capabilities and is designed to be modular, extensible, and easy to use. It supports both light and dark modes out of the box and can be easily extended with new themes.

## 2. Architecture

The theme is defined in the `lib/theme` directory and is broken down into the following modular files:

-   `lib/theme/index.ts`: The theme factory that assembles the theme object.
-   `lib/theme/lightPalette.ts`: The color palette for the light theme.
-   `lib/theme/darkPalette.ts`: The color palette for the dark theme.
-   `lib/theme/typography.ts`: The typography scale.
-   `lib/theme/components.ts`: Component-specific style overrides.
-   `lib/theme/shape.ts`: Border radius and shape definitions.
-   `lib/theme/shadows.ts`: Shadow definitions.
-   `lib/theme/spacing.ts`: The spacing system.
-   `lib/theme/transitions.ts`: Animation and transition definitions.
-   `lib/theme/zIndex.ts`: Z-index definitions.
-   `lib/theme/breakpoints.ts`: Responsive breakpoints.

## 3. Usage

### Accessing Theme Values

To access theme values in your components, use the `useTheme` hook from `@mui/material/styles`:

```tsx
import { useTheme } from '@mui/material/styles'

const MyComponent = () => {
  const theme = useTheme()
  const primaryColor = theme.palette.primary.main
  // ...
}
```

### Using the `sx` Prop

The `sx` prop is the recommended way to apply styles to MUI components. It allows you to use theme tokens directly:

```tsx
import { Box } from '@mui/material'

const MyComponent = () => {
  return (
    <Box
      sx={{
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        p: 2, // 16px padding
      }}
    >
      Hello, World!
    </Box>
  )
}
```

## 4. Theme Switching

The theme can be switched between light and dark modes using the `useThemeMode` hook and the `ThemeSwitcher` component.

### `useThemeMode` Hook

The `useThemeMode` hook provides the current theme mode and a function to toggle the theme:

```tsx
import { useThemeMode } from '@/context/ThemeContext'

const MyComponent = () => {
  const { mode, toggleTheme } = useThemeMode()
  // ...
}
```

### `ThemeSwitcher` Component

The `ThemeSwitcher` component is a simple button that toggles the theme. It can be added to any component:

```tsx
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

const MyAppBar = () => {
  return (
    {/* ... */}
    <ThemeSwitcher />
    {/* ... */}
  )
}
```

## 5. Extending the Theme

### Adding a New Theme

To add a new theme, create a new palette file (e.g., `lib/theme/bluePalette.ts`) and then update the `createAppTheme` function in `lib/theme/index.ts` to accept the new theme mode.

### Modifying an Existing Theme

To modify an existing theme, simply edit the corresponding palette file or any of the other theme modules.

## 6. Best Practices

-   **Use the `sx` prop**: Always use the `sx` prop for styling to ensure that your components are theme-aware.
-   **Use theme tokens**: Avoid hardcoding values like colors, spacing, and font sizes. Instead, use the theme tokens provided by the theme object.
-   **Keep it consistent**: Follow the existing design patterns and conventions to maintain a consistent look and feel across the application.
