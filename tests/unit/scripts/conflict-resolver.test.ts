import { jest } from '@jest/globals'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as conflictResolver from '@/scripts/conflict-resolver'
import * as gitConflicts from '@/scripts/utils/git-conflicts'
import * as fs from 'fs/promises'

// Mock dependencies
jest.mock('@google/generative-ai')
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}))
jest.mock('@/scripts/utils/git-conflicts', () => ({
  getConflictDetails: jest.fn(),
}))

describe('Conflict Resolver Script', () => {
  let mockGenerateContent: jest.Mock
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Mock the AI model
    mockGenerateContent = jest.fn()
    const mockGetGenerativeModel = jest.fn(() => ({
      generateContent: mockGenerateContent,
    }))
    ;(GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }))

    // Spy on console outputs
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('resolveConflicts', () => {
    it('should process a single conflict file successfully', async () => {
      // Arrange
      const mockConflictDetails = {
        filePath: 'test.js',
        fileName: 'test.js',
        originalContent: '<<<<<<< HEAD\n// old code\n=======\n// new code\n>>>>>>> feature',
        conflictMarker: '<<<<<<< HEAD',
      }
      const mockResolvedContent = '// resolved code'
      ;(gitConflicts.getConflictDetails as jest.Mock).mockResolvedValue(
        mockConflictDetails
      )
      mockGenerateContent.mockResolvedValue({
        response: { text: () => mockResolvedContent },
      })
      ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)

      // Act
      await conflictResolver.resolveConflicts(['test.js'])

      // Assert
      expect(gitConflicts.getConflictDetails).toHaveBeenCalledWith('test.js')
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(mockConflictDetails.originalContent)
      )
      expect(fs.writeFile).toHaveBeenCalledWith('test.js', mockResolvedContent)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully resolved conflict in test.js')
      )
    })

    it('should handle cases where conflict details cannot be retrieved', async () => {
      // Arrange
      ;(gitConflicts.getConflictDetails as jest.Mock).mockResolvedValue(null)

      // Act
      await conflictResolver.resolveConflicts(['test.js'])

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Could not get conflict details for test.js, skipping.'
      )
      expect(mockGenerateContent).not.toHaveBeenCalled()
      expect(fs.writeFile).not.toHaveBeenCalled()
    })

    it('should handle AI model failure gracefully', async () => {
      // Arrange
      const mockConflictDetails = {
        filePath: 'test.js',
        fileName: 'test.js',
        originalContent: 'conflict content',
        conflictMarker: '<<<<<<< HEAD',
      }
      ;(gitConflicts.getConflictDetails as jest.Mock).mockResolvedValue(
        mockConflictDetails
      )
      mockGenerateContent.mockRejectedValue(new Error('AI model failed'))

      // Act
      await conflictResolver.resolveConflicts(['test.js'])

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to resolve conflict in test.js'),
        expect.any(Error)
      )
      expect(fs.writeFile).not.toHaveBeenCalled()
    })

    it('should handle file writing failure gracefully', async () => {
      // Arrange
      const mockConflictDetails = {
        filePath: 'test.js',
        fileName: 'test.js',
        originalContent: 'conflict content',
        conflictMarker: '<<<<<<< HEAD',
      }
      ;(gitConflicts.getConflictDetails as jest.Mock).mockResolvedValue(
        mockConflictDetails
      )
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'resolved content' },
      })
      ;(fs.writeFile as jest.Mock).mockRejectedValue(
        new Error('Failed to write file')
      )

      // Act
      await conflictResolver.resolveConflicts(['test.js'])

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write resolved file for test.js'),
        expect.any(Error)
      )
    })
  })

  describe('main execution', () => {
    it('should call resolveConflicts with file paths from command line arguments', async () => {
      // This is a simplified test for the main execution logic.
      // We are not testing the argument parsing itself, but that the main function
      // correctly passes the arguments to the core logic.
      const resolveConflictsSpy = jest
        .spyOn(conflictResolver, 'resolveConflicts')
        .mockResolvedValue()

      // To test the main function, we need to simulate command line arguments
      const originalArgv = process.argv
      process.argv = ['node', 'script.js', 'file1.js', 'file2.js']

      await conflictResolver.main()

      expect(resolveConflictsSpy).toHaveBeenCalledWith(['file1.js', 'file2.js'])

      // Clean up
      process.argv = originalArgv
      resolveConflictsSpy.mockRestore()
    })

    it('should log an error if no file paths are provided', async () => {
      const resolveConflictsSpy = jest
        .spyOn(conflictResolver, 'resolveConflicts')
        .mockResolvedValue()
      const originalArgv = process.argv
      process.argv = ['node', 'script.js'] // No files

      await conflictResolver.main()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'No conflict files provided. Usage: ts-node scripts/conflict-resolver.ts <file1> <file2> ...'
      )
      expect(resolveConflictsSpy).not.toHaveBeenCalled()

      process.argv = originalArgv
      resolveConflictsSpy.mockRestore()
    })
  })
})
