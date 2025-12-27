import { MeasurementSystem, Gender } from '../../../types'

export interface State {
  userName: string
  userAge: string
  userHeight: number
  userWeight: string
  gender: Gender
  unitSystem: MeasurementSystem
  isResetting: boolean
  ageError: string | null
  weightError: string | null
  heightError: string | null
  feet: string
  inches: string
}

export type Action =
  | { type: 'SET_USER_NAME'; payload: string }
  | { type: 'SET_USER_AGE'; payload: string }
  | { type: 'SET_USER_HEIGHT'; payload: number }
  | { type: 'SET_USER_WEIGHT'; payload: string }
  | { type: 'SET_GENDER'; payload: Gender }
  | { type: 'SET_UNIT_SYSTEM'; payload: MeasurementSystem }
  | { type: 'SET_IS_RESETTING'; payload: boolean }
  | { type: 'SET_AGE_ERROR'; payload: string | null }
  | { type: 'SET_WEIGHT_ERROR'; payload: string | null }
  | { type: 'SET_HEIGHT_ERROR'; payload: string | null }
  | { type: 'SET_FEET'; payload: string }
  | { type: 'SET_INCHES'; payload: string }

export const initialState: State = {
  userName: '',
  userAge: '',
  userHeight: 0,
  userWeight: '',
  gender: 'MALE',
  unitSystem: 'METRIC',
  isResetting: false,
  ageError: null,
  weightError: null,
  heightError: null,
  feet: '',
  inches: '',
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_USER_NAME':
      return { ...state, userName: action.payload }
    case 'SET_USER_AGE':
      return { ...state, userAge: action.payload }
    case 'SET_USER_HEIGHT':
      return { ...state, userHeight: action.payload }
    case 'SET_USER_WEIGHT':
      return { ...state, userWeight: action.payload }
    case 'SET_GENDER':
      return { ...state, gender: action.payload }
    case 'SET_UNIT_SYSTEM':
      return { ...state, unitSystem: action.payload }
    case 'SET_IS_RESETTING':
      return { ...state, isResetting: action.payload }
    case 'SET_AGE_ERROR':
      return { ...state, ageError: action.payload }
    case 'SET_WEIGHT_ERROR':
      return { ...state, weightError: action.payload }
    case 'SET_HEIGHT_ERROR':
      return { ...state, heightError: action.payload }
    case 'SET_FEET':
      return { ...state, feet: action.payload }
    case 'SET_INCHES':
      return { ...state, inches: action.payload }
    default:
      return state
  }
}
