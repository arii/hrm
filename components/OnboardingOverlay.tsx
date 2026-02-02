// components/OnboardingOverlay.tsx
import { Alert, AlertTitle } from '@mui/material';
import { checkOnboardingRequirements } from '@/utils/browserSupport';

export const SupportAlert = () => {
  const { bluetooth } = checkOnboardingRequirements();

  if (!bluetooth) {
    return (
      <Alert severity="warning" variant="filled">
        <AlertTitle>Browser Incompatible</AlertTitle>
        To use the Heart Rate Monitor, please use Chrome, Edge, or Bluefy on iOS.
      </Alert>
    );
  }
  return null;
};
