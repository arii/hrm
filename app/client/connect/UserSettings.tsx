import React from 'react'
import { useConnectSettingsContext } from './context/ConnectSettingsContext'
import SettingsForm from '@/components/SettingsForm'

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
    unitSystem: unit,
    handleUnitChange: setUnit,
    hrZoneMethod,
    setHrZoneMethod,
    localMaxHrOverride: maxHrOverride,
    setLocalMaxHrOverride: setMaxHrOverride,
    handleMaxHrBlur: onMaxHrBlur,
    maxHrError,
    localRestingHr: restingHr,
    setLocalRestingHr: setRestingHr,
    handleRestingHrBlur: onRestingHrBlur,
    restingHrError,
    customZoneThresholds,
    handleThresholdChange,
  } = useConnectSettingsContext()

  return (
    <SettingsForm
      userName={userName}
      setUserName={setUserName}
      userAge={userAge || ''}
      setUserAge={setUserAge}
      onAgeBlur={onAgeBlur}
      ageError={ageError}
      unitSystem={unit}
      setUnit={setUnit}
      userHeight={userHeight}
      setUserHeight={setUserHeight}
      onHeightBlur={onHeightBlur}
      heightError={heightError}
      userWeight={userWeight}
      setUserWeight={setUserWeight}
      onWeightBlur={onWeightBlur}
      weightError={weightError}
      hrZoneMethod={hrZoneMethod}
      setHrZoneMethod={setHrZoneMethod}
      maxHrOverride={maxHrOverride}
      setMaxHrOverride={setMaxHrOverride}
      maxHrError={maxHrError}
      onMaxHrBlur={onMaxHrBlur}
      restingHr={restingHr}
      setRestingHr={setRestingHr}
      restingHrError={restingHrError}
      onRestingHrBlur={onRestingHrBlur}
      customZoneThresholds={customZoneThresholds}
      handleThresholdChange={handleThresholdChange}
    />
  )
}

export default UserSettings
