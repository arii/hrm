declare module '@markw65/fit-file-writer' {
  export class FitWriter {
    constructor()
    time(date: Date): number
    writeMessage(
      messageType: string,
      data: Record<string, unknown> // Using `unknown` for stricter type safety.
    ): void
    finish(): DataView
  }
}
