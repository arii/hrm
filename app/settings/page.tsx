// File: app/settings/page.tsx
'use client';

import React from 'react';
import { useUserSettings } from '../../context/UserSettingsContext';
import {
  Container,
  Typography,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Box,
  Paper,
} from '@mui/material';
import { UnitSystem } from '../../utils/units';

const SettingsPage = () => {
  const {
    unitSystem,
    setUnitSystem,
    userName,
    setUserName,
    userAge,
    setUserAge,
    userWeight,
    setUserWeight,
  } = useUserSettings();

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="unit-system-label">Unit System</InputLabel>
            <Select
              labelId="unit-system-label"
              id="unit-system-select"
              value={unitSystem}
              label="Unit System"
              onChange={(e) => setUnitSystem(e.target.value as UnitSystem)}
            >
              <MenuItem value="metric">Metric</MenuItem>
              <MenuItem value="imperial">Imperial</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Age"
            type="number"
            value={userAge}
            onChange={(e) => setUserAge(parseInt(e.target.value, 10))}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label={`Weight (${unitSystem === 'metric' ? 'kg' : 'lbs'})`}
            type="number"
            value={userWeight}
            onChange={(e) => setUserWeight(parseInt(e.target.value, 10))}
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
