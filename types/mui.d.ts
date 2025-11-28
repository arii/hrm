
import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    hrPercentage: React.CSSProperties;
    hrLabel: React.CSSProperties;
    controlLabel: React.CSSProperties;
  }

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions {
    hrPercentage?: React.CSSProperties;
    hrLabel?: React.CSSProperties;
    controlLabel?: React.CSSProperties;
  }
}

// Update the Typography's variant mapping
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    hrPercentage: true;
    hrLabel: true;
    controlLabel: true;
  }
}
