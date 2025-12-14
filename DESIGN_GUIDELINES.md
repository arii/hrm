# Design Guidelines

This document outlines the design system, UI/UX improvements, and overall visual philosophy of the HRM application.

## Design System

**Date**: November 9, 2025
**Status**: ✅ Phase 1 Complete - Foundation Established

### 1. Comprehensive MUI Theme (`lib/theme.ts`)

A complete design system has been established to address all identified UI consistency issues.

#### **Color Palette**

- **Primary (Red #F44336)**: High-energy color matching Peak HR zone, used for primary actions.
- **Secondary (Blue #2196F3)**: Calm color matching Warm-up zone, used for secondary actions.
- **Success (Green #4CAF50)**: Matches Fat Burn zone.
- **Warning (Yellow #FFEB3B)**: Matches Cardio zone.
- **Background**: Light grey (#F5F5F5) for main areas, white for cards.
- **Text**: Dark grey (#212121) primary, medium grey (#757575) secondary.

#### **Typography Scale**

A clear hierarchy from h1 (4rem/64px) down to caption (0.75rem/12px) has been established.

#### **Spacing System**

- **8px grid**: All spacing uses multiples of 8px (`theme.spacing(1) = 8px`).
- **Consistent padding**: Cards use 16-24px, buttons use 10-12px vertical.
- **Responsive spacing**: `xs` devices use less padding than `md`/`lg`.

#### **Shape & Borders**

- **Border radius**: 8px for buttons, 12px for cards/papers.
- **Consistent application**: All interactive elements follow the same rounding.

#### **Shadows**

A 5-level system from subtle (elevation 1) to prominent (elevation 5) is used.

#### **Accessibility**

- **Touch targets**: Minimum 48px height/width for all interactive elements.
- **Contrast**: WCAG AA compliant text contrast ratios.
- **Focus indicators**: Clear, consistent focus states.

#### **Component Overrides**

Pre-configured MUI components are used for consistency.

### 2. Global Theme Integration

The theme has been integrated globally in `components/ThemeRegistry/ThemeRegistry.tsx`, and all components now automatically use the theme values.

## UI/UX Improvements

**Last Updated**: December 2024
**Status**: ✅ Major Improvements Completed

### Mobile-First Control Panel

The control panel has been optimized for mobile with larger touch targets, better spacing, and a simplified layout.

### Dashboard Visual Hierarchy

The dashboard layout has been improved with consistent proportions, rotated side labels for the timer, and a fixed height for the Google Doc viewer.

### Accessibility (WCAG 2.1 AA Compliance)

Some ARIA labels and improved color contrast have been implemented. Further work is in progress to improve keyboard navigation and screen reader support.

## Usage Guide for Developers

### Accessing Theme Values

```tsx
import { useTheme } from '@mui/material/styles'

// In component
const theme = useTheme()
const spacing = theme.spacing(2) // 16px
const primaryColor = theme.palette.primary.main // #F44336
```

### Using Theme in `sx` Prop

```tsx
// Spacing
<Box sx={{ p: 2, mt: 3 }} /> // padding: 16px, marginTop: 24px

// Colors
<Box sx={{ backgroundColor: 'primary.main', color: 'common.white' }} />

// Responsive
<Box sx={{ py: { xs: 2, md: 4 } }} /> // 16px mobile, 32px desktop

// Shadows
<Card sx={{ boxShadow: 3 }} /> // elevation 3 shadow

// Typography
<Typography variant="h1" /> // Uses theme h1 styles
```
