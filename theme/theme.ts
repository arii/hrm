// theme/theme.ts
import { createTheme } from '@mui/material/styles';
import { designTokens } from './designTokens';

export const lightTheme = createTheme(designTokens.light);
export const darkTheme = createTheme(designTokens.dark);
