import { parseConflicts } from '../../../../scripts/utils/git-conflicts'
import { readFile, stat } from 'fs/promises'
import { mocked } from 'jest-mock'

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
}))

const mockedReadFile = mocked(readFile)
const mockedStat = mocked(stat)

describe('parseConflicts', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should parse a standard conflict', async () => {
    const content = `prelude
<<<<<<< HEAD
current change
=======
incoming change
>>>>>>> some-branch
postlude`
    mockedReadFile.mockResolvedValue(content)
    mockedStat.mockResolvedValue({ size: content.length } as jest.Mocked<
      typeof stat
    >)

    const conflicts = await parseConflicts('file.ts')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({
      currentContent: 'current change\n',
      incomingContent: 'incoming change\n',
      currentLabel: 'HEAD',
      incomingLabel: 'some-branch',
    })
  })

  it('should parse a diff3 conflict', async () => {
    const content = `prelude
<<<<<<< HEAD
current change
||||||| base
original change
=======
incoming change
>>>>>>> some-branch
postlude`
    mockedReadFile.mockResolvedValue(content)
    mockedStat.mockResolvedValue({ size: content.length } as jest.Mocked<
      typeof stat
    >)

    const conflicts = await parseConflicts('file.ts')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({
      currentContent: 'current change\n',
      incomingContent: 'incoming change\n',
    })
  })

  it('should return an empty array for a file with no conflicts', async () => {
    const content = 'no conflicts here'
    mockedReadFile.mockResolvedValue(content)
    mockedStat.mockResolvedValue({ size: content.length } as jest.Mocked<
      typeof stat
    >)

    const conflicts = await parseConflicts('file.ts')
    expect(conflicts).toHaveLength(0)
  })

  it('should skip a file that is too large', async () => {
    mockedStat.mockResolvedValue({ size: 2 * 1024 * 1024 } as jest.Mocked<
      typeof stat
    >)

    const conflicts = await parseConflicts('large-file.ts')
    expect(conflicts).toHaveLength(0)
    expect(mockedReadFile).not.toHaveBeenCalled()
  })
})
