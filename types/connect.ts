import { MeasurementSystem, Gender } from './core'
import { HeartRateZone } from '../lib/shared/hr-zones'

export interface UserProfileData {
  userName: string
  userAge: string
  userAgeNum: number
  userHeight: { cm: string; feet: string; inches: string }
  userHeightCm: number
  userWeight: string
  userWeightKg: number
  gender: Gender
  unitSystem: MeasurementSystem
}

export interface UserProfileHandlers {
  setUserName: (name: string) => void
  setUserAge: (age: string) => void
  onAgeBlur: () => void
  setUserHeight: (
    height: Partial<{ cm: string; feet: string; inches: string }>
  ) => void
  onHeightBlur: () => void
  setUserWeight: (weight: string) => void
  onWeightBlur: () => void
  setGender: (gender: Gender) => void
  onUnitChange: (unit: MeasurementSystem) => void
}

export interface UserProfileErrors {
  ageError: string | null
  heightError: string | null
  weightError: string | null
}

export interface UserProfileState {
  data: UserProfileData
  handlers: UserProfileHandlers
  errors: UserProfileErrors
}

export interface HrZoneData {
  percentage: number
  zone: HeartRateZone
}
