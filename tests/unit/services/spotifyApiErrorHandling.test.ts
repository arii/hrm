import { classifyPollError } from '../../../services/spotifyApiErrorHandling'

describe('classifyPollError', () => {
  it('classifies 429 as rate-limited', () => {
    expect(classifyPollError({ status: 429 })).toBe('rate-limited')
  })

  it('classifies 401 as unauthorized', () => {
    expect(classifyPollError({ status: 401 })).toBe('unauthorized')
  })

  it.each(['fetch failed', 'EAI_AGAIN', 'ENETUNREACH', 'ECONNREFUSED'])(
    'classifies network marker %s as network',
    (marker) => {
      expect(classifyPollError(new Error(`request ${marker} here`))).toBe(
        'network'
      )
    }
  )

  it('returns null for unrecognized errors', () => {
    expect(classifyPollError({ status: 500 })).toBeNull()
    expect(classifyPollError(new Error('boom'))).toBeNull()
    expect(classifyPollError(null)).toBeNull()
    expect(classifyPollError(undefined)).toBeNull()
  })
})
