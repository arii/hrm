declare module '@garmin/fitsdk' {
  export class Encoder {
    constructor(options?: unknown)
    writeMesg(mesg: unknown): void
    close(): Uint8Array
  }
}
