// app/settings/page.tsx
'use client'

import { useState } from 'react'
import { Container, Typography, Paper, Stack, Button, Box } from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'
import ValidatedTextField from '@/components/shared/ValidatedTextField'
import { useSnackbar } from 'notistack'

const SettingsPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const { enqueueSnackbar } = useSnackbar()

  // Form state
  const [userName, setUserName] = useState(userSettings.userName ?? '')
  const [userAge, setUserAge] = useState(userSettings.userAge?.toString() ?? '')

  // Validation state
  const [isNameValid, setIsNameValid] = useState(true)
  const [isAgeValid, setIsAgeValid] = useState(true)

  const isFormValid = isNameValid && isAgeValid

  const handleSave = () => {
    if (!isFormValid) {
      enqueueSnackbar('Please correct the errors before saving.', {
        variant: 'error',
      })
      return
    }

    setUserSettings((prev) => ({
      ...prev,
      userName,
      userAge: userAge ? parseInt(userAge, 10) : null,
    }))

    enqueueSnackbar('Settings saved successfully!', { variant: 'success' })
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Settings
        </Typography>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Stack spacing={3}>
            <ValidatedTextField
              label="User Name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              validationRules={[
                { type: 'required' },
                { type: 'minLength', value: 2 },
              ]}
              onValidation={setIsNameValid}
              fullWidth
            />
            <ValidatedTextField
              label="User Age"
              value={userAge}
              onChange={(e) => setUserAge(e.target.value)}
              validationRules={[{ type: 'positiveInteger' }]}
              onValidation={setIsAgeValid}
              fullWidth
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={!isFormValid}
            >
              Save Settings
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  )
}

export default SettingsPage
