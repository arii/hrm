// __mocks__/@markw65/fit-file-writer.js
export class FitWriter {
  constructor() {
    this.chunks = []
  }

  writeMessage(type, message) {
    this.chunks.push({ type, message })
  }

  finish() {
    return new Blob([JSON.stringify(this.chunks)], {
      type: 'application/json',
    })
  }

  time(date) {
    return date.getTime()
  }
}
