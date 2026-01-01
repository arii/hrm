/**
 * @jest-environment node
 */
import * as geminiClient from '../../scripts/gemini-client'
const {
  generateContentWithFallback,
  getModelFallbacks,
  JsonProcessor,
  handleError,
} = geminiClient
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIError,
} from '@google/generative-ai'
import * as fs from 'fs/promises'

// Mock the entire @google/generative-ai library
jest.mock('@google/generative-ai', () => {
  const originalModule = jest.requireActual('@google/generative-ai')
  return {
    ...originalModule,
    GoogleGenerativeAI: jest.fn(),
  }
})
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
}))

const mockedGoogleGenerativeAI =
  GoogleGenerativeAI as jest.Mock<GoogleGenerativeAI>

describe('JsonProcessor', () => {
  const processor = new JsonProcessor()

  it('should parse a valid JSON string', () => {
    const jsonString = '{"key": "value", "number": 123}'
    const result = processor.process(jsonString)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ key: 'value', number: 123 })
  })

  it('should extract and parse a JSON block from markdown', () => {
    const markdownString =
      'Some text before\n```json\n{"key": "value"}\n```\nSome text after'
    const result = processor.process(markdownString)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ key: 'value' })
  })

  it('should return an error for invalid JSON', () => {
    const invalidJson = '{"key": "value",}'
    const result = processor.process(invalidJson)
    expect(result.success).toBe(false)
    expect(result.data.error).toBe('JSON Parse Error')
  })

  it('should return an error for a malformed JSON block in markdown', () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const markdownString = '```json\n{"key": "value",}\n```'
    const result = processor.process(markdownString)
    expect(result.success).toBe(false)
    expect(result.data.error).toBe('JSON Parse Error')
    consoleErrorSpy.mockRestore()
  })

  it('should return an error if no JSON is found', () => {
    const nonJsonString = 'This is just a regular string.'
    const result = processor.process(nonJsonString)
    expect(result.success).toBe(false)
    expect(result.data.error).toBe('JSON Parse Error')
  })
})

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
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-pro',
    ])
  })

  it('should return the correct list of models from a valid environment variable', () => {
    process.env.GEMINI_MODEL_FALLBACKS =
      'gemini-pro, gemini-pro-vision, gemini-ultra'
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual([
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-ultra',
    ])
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
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-pro',
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
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-pro',
    ])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: GEMINI_MODEL_FALLBACKS is empty or invalid. Using default fallbacks.'
    )
    consoleWarnSpy.mockRestore()
  })
})

describe('generateContentWithFallback', () => {
  let mockGenAI: GoogleGenerativeAI
  let shouldAllModelsFail = false

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    shouldAllModelsFail = false

    // Mock the generateContent method
    const mockGenerateContent = jest.fn()

    // Mock the getGenerativeModel method to return a model that has the mockGenerateContent method
    const mockGetGenerativeModel = jest.fn().mockImplementation((opts) => {
      if (opts.model === 'gemini-2.5-flash-lite' && !shouldAllModelsFail) {
        return { generateContent: mockGenerateContent }
      }
      // For failure cases, make all models return a retryable error.
      const errorMessage =
        opts.model === 'gemini-2.5-pro'
          ? '429 Rate Limited'
          : '404 Not Found'
      return {
        generateContent: jest.fn().mockRejectedValue(new Error(errorMessage)),
      }
    })

    // Mock the GoogleGenerativeAI constructor to return an object with the mocked methods
    mockedGoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }))

    // Create an instance of the mocked class
    mockGenAI = new mockedGoogleGenerativeAI()
  })

  it('should return content from the first successful model', async () => {
    // Arrange
    const mockSuccessfulResponse = { response: { text: () => 'Success!' } };
    (mockGenAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' }).generateContent as jest.Mock).mockResolvedValue(mockSuccessfulResponse);

    // Act
    const result = await generateContentWithFallback(mockGenAI, 'Test prompt');

    // Assert
    expect(result).toBe('Success!')
    expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' })
    expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash-lite' })
  })

  it('should throw a GoogleGenerativeAIError if all models fail', async () => {
    // Arrange
    shouldAllModelsFail = true

    // Act & Assert
    await expect(
      generateContentWithFallback(mockGenAI, 'Test prompt')
    ).rejects.toThrow(GoogleGenerativeAIError)
  })

  it('should include the last error message when all models fail', async () => {
    // Arrange
    shouldAllModelsFail = true;
    const lastError = new Error('429 Rate Limited'); // This will be the last error thrown.

    // Act & Assert
    await expect(generateContentWithFallback(mockGenAI, 'Test prompt')).rejects.toThrow(
      `All models failed. Last error: ${lastError.message}`
    );
  });
})

describe('handleError', () => {
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {})
  const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit() was called')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    processExitSpy.mockClear()
    ;(fs.writeFile as jest.Mock).mockClear()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  it('should write an error to the output file and exit with 0', async () => {
    // Arrange
    const error = new Error('Test error')
    const outputFile = 'error-output.json'

    // Act
    try {
      await handleError(error, outputFile)
    } catch (e) {
      // Expected to throw due to process.exit mock
    }

    // Assert
    expect(fs.writeFile).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should handle GoogleGenerativeAIError with "All models failed" message', async () => {
    // Arrange
    const lastError = new Error('The actual last error')
    const error = new GoogleGenerativeAIError(
      'All models failed: Something went wrong'
    )
    error.cause = lastError

    // Act
    try {
      await handleError(error, 'output.json')
    } catch (e) {
      // Expected to throw due to process.exit mock
    }

    // Assert
    expect(fs.writeFile).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should handle GoogleGenerativeAIError with "All models failed" message', async () => {
    // Arrange
    const lastError = new Error('The actual last error')
    const error = new GoogleGenerativeAIError(
      'All models failed: Something went wrong',
      lastError
    )

    // Act & Assert
    await expect(handleError(error, 'output.json')).rejects.toThrow(
      'process.exit() was called'
    )
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should call process.exit(1) when no outputFile is provided', async () => {
    const error = new Error('Test error')
    await expect(handleError(error, null)).rejects.toThrow(
      'process.exit() was called'
    )
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
