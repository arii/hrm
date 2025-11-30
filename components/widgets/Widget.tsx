
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface WidgetProps {
  title: string;
  children: React.ReactNode;
}

const Widget: React.FC<WidgetProps> = ({ title, children }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          {title}
        </Typography>
        <Box mt={2}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
};

export default Widget;
