import { useReducer, useCallback } from 'react'
import { UserSettings } from '@/types/index'
import { MeasurementSystem, Gender } from '@/types/core'

type State = UserSettings
type Action =
  | { type: 'SET_FIELD'; field: keyof State; value: string | number }
  | { type: 'SET_GENDER'; value: Gender }
  | { type: 'SET_MEASUREMENT_SYSTEM'; value: MeasurementSystem }
  | { type: 'SET_SETTINGS'; settings: UserSettings }

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'SET_GENDER':
      return { ...state, gender: action.value }
    case 'SET_MEASUREMENT_SYSTEM':
      return { ...state, measurementSystem: action.value }
    case 'SET_SETTINGS':
      return action.settings
    default:
      return state
  }
}

export const useUserSettingsForm = (
  initialState: UserSettings,
  onSave: (settings: UserSettings) => void
) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const handleChange = useCallback(
    (
      field: keyof UserSettings,
      value: string | number | Gender | MeasurementSystem
    ) => {
      if (field === 'gender') {
        dispatch({ type: 'SET_GENDER', value: value as Gender })
      } else if (field === 'measurementSystem') {
        dispatch({
          type: 'SET_MEASUREMENT_SYSTEM',
          value: value as MeasurementSystem,
        })
      } else {
        dispatch({ type: 'SET_FIELD', field, value: value as string | number })
      }
    },
    []
  )

  const handleSave = useCallback(() => {
    onSave(state)
  }, [state, onSave])

  const setSettings = useCallback((settings: UserSettings) => {
    dispatch({ type: 'SET_SETTINGS', settings })
  }, [])

  return { state, handleChange, handleSave, setSettings }
}
