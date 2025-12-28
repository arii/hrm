// app/client/connect/components/UserNameInput.tsx
'use client'

import React from 'react'
import TextField from '@mui/material/TextField'

interface UserNameInputProps {
  userName: string
  setUserName: (value: string) => void
}

const UserNameInput: React.FC<UserNameInputProps> = ({
  userName,
  setUserName,
}) => {
  return (
    <TextField
      fullWidth
      label="Your Name"
      placeholder="e.g., Jane Doe"
      value={userName}
      onChange={(e) => setUserName(e.target.value)}
    />
  )
}

export default UserNameInput
