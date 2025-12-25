// File: context/UserSettingsContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UnitSystem } from '../utils/units';
import { DEFAULT_USER_NAME, DEFAULT_USER_AGE } from '../utils/constants';

interface UserSettingsContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (unitSystem: UnitSystem) => void;
  userName: string;
  setUserName: (userName: string) => void;
  userAge: number;
  setUserAge: (userAge: number) => void;
  userWeight: number;
  setUserWeight: (userWeight: number) => void;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export const UserSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    if (typeof window !== 'undefined') {
      const storedUnitSystem = localStorage.getItem('unitSystem') as UnitSystem | null;
      if (storedUnitSystem) {
        return storedUnitSystem;
      }
    }
    return 'imperial';
  });
  const [userName, setUserName] = useState<string>(DEFAULT_USER_NAME);
  const [userAge, setUserAge] = useState<number>(DEFAULT_USER_AGE);
  const [userWeight, setUserWeight] = useState<number>(165);

  const handleSetUnitSystem = (newUnitSystem: UnitSystem) => {
    setUnitSystem(newUnitSystem);
    localStorage.setItem('unitSystem', newUnitSystem);
  };

  return (
    <UserSettingsContext.Provider
      value={{
        unitSystem,
        setUnitSystem: handleSetUnitSystem,
        userName,
        setUserName,
        userAge,
        setUserAge,
        userWeight,
        setUserWeight,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
};
