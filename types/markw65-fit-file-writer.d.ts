declare module '@markw65/fit-file-writer' {
  export class FitWriter {
    constructor();
    time(date: Date): number;
    writeMessage(
      messageType: string,
      data: Record<string, any> // Using `any` here as the structure of messages can be dynamic and complex
    ): void;
    finish(): DataView;
  }
}
