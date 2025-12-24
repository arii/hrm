// File: app/settings/page.tsx
'use client'

import React from 'react'
import { useUserSettings } from '../../context/UserSettingsContext'
import { UnitSystem } from '../../utils/units'

const SettingsPage = () => {
  const { unitSystem, setUnitSystem } = useUserSettings()

  const handleUnitSystemChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setUnitSystem(event.target.value as UnitSystem)
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Settings</h1>
      <div>
        <label htmlFor="unitSystem">Unit System: </label>
        <select
          id="unitSystem"
          value={unitSystem}
          onChange={handleUnitSystemChange}
        >
          <option value="imperial">Imperial</option>
          <option value="metric">Metric</option>
        </select>
      </div>
    </div>
  )
}

export default SettingsPage
