// components/widgets/DashboardWidget.tsx
import React, { ReactNode } from 'react';
import { Typography, Box } from '@mui/material';
import StyledCard from '../shared/StyledCard';

interface DashboardWidgetProps {
  title: string;
  children: ReactNode;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ title, children }) => {
  return (
    <StyledCard>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      <Box>
        {children}
      </Box>
    </StyledCard>
  );
};

export default DashboardWidget;
