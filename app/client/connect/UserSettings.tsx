import React from 'react'
import { useConnectSettingsContext } from './context/ConnectSettingsContext'
import SettingsForm, {
  SettingsConfig,
  SettingsHandlers,
  SettingsErrors,
} from '@/components/SettingsForm'

const UserSettings: React.FC = () => {
  const {
    userName,
    setUserName,
    userAge,
    setUserAge,
    onAgeBlur,
    ageError,
    displayHeight: userHeight,
    handleHeightChange: setUserHeight,
    handleHeightBlur: onHeightBlur,
    heightError,
    displayWeight: userWeight,
    handleWeightChange: setUserWeight,
    handleWeightBlur: onWeightBlur,
    weightError,
    unitSystem,
    handleUnitChange: setUnit,
  } = useConnectSettingsContext()

  const config: SettingsConfig = {
    userName,
    userAge: userAge || '',
    unitSystem,
    userHeight,
    userWeight,
  }

  const handlers: SettingsHandlers = {
    setUserName,
    setUserAge,
    setUnit,
    setUserHeight,
    setUserWeight,
    onAgeBlur,
    onHeightBlur,
    onWeightBlur,
  }

  const errors: SettingsErrors = {
    age: ageError,
    height: heightError,
    weight: weightError,
  }

  return <SettingsForm config={config} handlers={handlers} errors={errors} />
}

export default UserSettings
