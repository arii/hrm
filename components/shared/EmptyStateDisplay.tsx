// components/shared/EmptyStateDisplay.tsx
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

interface EmptyStateDisplayProps {
  message: string;
  icon?: ReactNode;
}

const EmptyStateDisplay = ({ message, icon }: EmptyStateDisplayProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        textAlign: 'center',
        color: 'text.secondary',
        height: '100%',
        minHeight: 150,
      }}
    >
      {icon && (
        <Box sx={{ mb: 1, '& .MuiSvgIcon-root': { fontSize: '2.5rem' } }}>
          {icon}
        </Box>
      )}
      <Typography variant="body1">{message}</Typography>
    </Box>
  );
};

export default EmptyStateDisplay;
