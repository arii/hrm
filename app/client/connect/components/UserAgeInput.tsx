// app/client/connect/components/UserAgeInput.tsx
'use client'

import React from 'react'
import TextField from '@mui/material/TextField'

interface UserAgeInputProps {
  userAge: string
  setUserAge: (value: string) => void
  handleAgeBlur: () => void
  ageError: string | null
}

const UserAgeInput: React.FC<UserAgeInputProps> = ({
  userAge,
  setUserAge,
  handleAgeBlur,
  ageError,
}) => {
  return (
    <TextField
      fullWidth
      label="Your Age"
      placeholder="e.g., 30"
      type="number"
      value={userAge}
      onChange={(e) => {
        if (/^\d*$/.test(e.target.value)) {
          setUserAge(e.target.value)
        }
      }}
      onBlur={handleAgeBlur}
      error={!!ageError}
      helperText={ageError}
      inputProps={{ min: 1, max: 120 }}
    />
  )
}

export default UserAgeInput
