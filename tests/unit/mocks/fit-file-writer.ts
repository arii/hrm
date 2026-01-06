// tests/unit/mocks/fit-file-writer.ts
export const FitWriter = jest.fn().mockImplementation(() => {
  return {
    time: jest.fn(),
    writeMessage: jest.fn(),
    finish: jest.fn(() => new DataView(new ArrayBuffer(1))),
  }
})
