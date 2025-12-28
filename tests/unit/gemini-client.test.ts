/**
 * @jest-environment node
 */
import { getModelFallbacks } from '../../scripts/gemini-client'

describe('getModelFallbacks', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return the default fallback list when the environment variable is not set', () => {
    delete process.env.GEMINI_MODEL_FALLBACKS
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual([
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
    ])
  })

  it('should return the correct list of models from a valid environment variable', () => {
    process.env.GEMINI_MODEL_FALLBACKS =
      'gemini-pro, gemini-pro-vision, gemini-ultra'
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual(['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'])
  })

  it('should filter out invalid model names and log a warning', () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    process.env.GEMINI_MODEL_FALLBACKS =
      'gemini-pro, not-gemini, gemini-ultra, also-not-gemini'
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual(['gemini-pro', 'gemini-ultra'])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: Invalid model name "not-gemini" in GEMINI_MODEL_FALLBACKS. It will be ignored.'
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: Invalid model name "also-not-gemini" in GEMINI_MODEL_FALLBACKS. It will be ignored.'
    )
    consoleWarnSpy.mockRestore()
  })

  it('should return the default list if the environment variable is an empty string', () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    process.env.GEMINI_MODEL_FALLBACKS = ''
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual([
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
    ])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: GEMINI_MODEL_FALLBACKS is empty or invalid. Using default fallbacks.'
    )
    consoleWarnSpy.mockRestore()
  })

  it('should return the default list if the environment variable contains only invalid models', () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    process.env.GEMINI_MODEL_FALLBACKS = 'invalid1, invalid2'
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual([
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
    ])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: GEMINI_MODEL_FALLBACKS is empty or invalid. Using default fallbacks.'
    )
    consoleWarnSpy.mockRestore()
  })
})
