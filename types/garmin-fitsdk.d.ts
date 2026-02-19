declare module '@garmin/fitsdk' {
  export class Encoder {
    constructor(options?: any);
    writeMesg(mesg: any): void;
    close(): Uint8Array;
  }
}
