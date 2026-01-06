declare module '@markw65/fit-file-writer' {
  export class FitWriter {
    constructor()
    time(date: Date): number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeMessage(
      messageType: string,
      data: Record<string, any> // Using `any` here as the structure of messages can be dynamic and complex, especially for a generic FIT file writer.
    ): void
    finish(): DataView
  }
}
