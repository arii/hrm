export class Encoder {
  writeMesg = jest.fn()
  close = jest.fn(() => new Uint8Array([]))
}

export class Stream {
  static MemoryStream = class {
    bytes = new Uint8Array([])
  }
}
