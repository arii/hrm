import { reducer, initialState } from '../../../../../app/client/connect/reducer'

describe('ConnectView Reducer', () => {
  it('should return the initial state', () => {
    expect(reducer(initialState, {} as any)).toEqual(initialState)
  })

  it('should handle SET_USER_NAME', () => {
    const action = { type: 'SET_USER_NAME', payload: 'Test User' }
    const newState = reducer(initialState, action)
    expect(newState.userName).toEqual('Test User')
  })

  it('should handle SET_USER_AGE', () => {
    const action = { type: 'SET_USER_AGE', payload: '30' }
    const newState = reducer(initialState, action)
    expect(newState.userAge).toEqual('30')
  })

  it('should handle SET_USER_HEIGHT', () => {
    const action = { type: 'SET_USER_HEIGHT', payload: 175 }
    const newState = reducer(initialState, action)
    expect(newState.userHeight).toEqual(175)
  })

  it('should handle SET_USER_WEIGHT', () => {
    const action = { type: 'SET_USER_WEIGHT', payload: '70' }
    const newState = reducer(initialState, action)
    expect(newState.userWeight).toEqual('70')
  })

  it('should handle SET_GENDER', () => {
    const action = { type: 'SET_GENDER', payload: 'FEMALE' }
    const newState = reducer(initialState, action)
    expect(newState.gender).toEqual('FEMALE')
  })

  it('should handle SET_UNIT_SYSTEM', () => {
    const action = { type: 'SET_UNIT_SYSTEM', payload: 'IMPERIAL' }
    const newState = reducer(initialState, action)
    expect(newState.unitSystem).toEqual('IMPERIAL')
  })

  it('should handle SET_IS_RESETTING', () => {
    const action = { type: 'SET_IS_RESETTING', payload: true }
    const newState = reducer(initialState, action)
    expect(newState.isResetting).toEqual(true)
  })

  it('should handle SET_AGE_ERROR', () => {
    const action = { type: 'SET_AGE_ERROR', payload: 'Invalid age' }
    const newState = reducer(initialState, action)
    expect(newState.ageError).toEqual('Invalid age')
  })

  it('should handle SET_WEIGHT_ERROR', () => {
    const action = { type: 'SET_WEIGHT_ERROR', payload: 'Invalid weight' }
    const newState = reducer(initialState, action)
    expect(newState.weightError).toEqual('Invalid weight')
  })

  it('should handle SET_HEIGHT_ERROR', () => {
    const action = { type: 'SET_HEIGHT_ERROR', payload: 'Invalid height' }
    const newState = reducer(initialState, action)
    expect(newState.heightError).toEqual('Invalid height')
  })

  it('should handle SET_FEET', () => {
    const action = { type: 'SET_FEET', payload: '5' }
    const newState = reducer(initialState, action)
    expect(newState.feet).toEqual('5')
  })

  it('should handle SET_INCHES', () => {
    const action = { type: 'SET_INCHES', payload: '9' }
    const newState = reducer(initialState, action)
    expect(newState.inches).toEqual('9')
  })
})
