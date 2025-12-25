// File: app/settings/page.tsx
'use client';

import React from 'react';
import { useUserSettings } from '../../context/UserSettingsContext';
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

  const handleUnitSystemChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setUnitSystem(event.target.value as UnitSystem);
  };

  const handleUserNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(event.target.value);
  };

  const handleUserAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserAge(Number(event.target.value));
  };

  const handleUserWeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserWeight(Number(event.target.value));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Settings</h1>
      <div>
        <label htmlFor="unitSystem">Unit System: </label>
        <select id="unitSystem" value={unitSystem} onChange={handleUnitSystemChange}>
          <option value="imperial">Imperial</option>
          <option value="metric">Metric</option>
        </select>
      </div>
      <div>
        <label htmlFor="userName">Name: </label>
        <input id="userName" type="text" value={userName} onChange={handleUserNameChange} />
      </div>
      <div>
        <label htmlFor="userAge">Age: </label>
        <input id="userAge" type="number" value={userAge} onChange={handleUserAgeChange} />
      </div>
      <div>
        <label htmlFor="userWeight">Weight ({unitSystem === 'imperial' ? 'lbs' : 'kg'}): </label>
        <input id="userWeight" type="number" value={userWeight} onChange={handleUserWeightChange} />
      </div>
    </div>
  );
};

export default SettingsPage;
