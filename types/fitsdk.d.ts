declare module '@garmin/fitsdk' {
  export class Stream {
    constructor()
    getBuffer(): Uint8Array
    length: number
  }

  export class Encoder {
    constructor()
    writeMesg(mesg: any): void
    close(): Uint8Array
  }

  export const Profile: {
    MesgNum: Record<string, number>
    types: {
      file: Record<string, number>
      manufacturer: Record<string, number>
      sport: Record<string, number>
      [key: string]: any
    }
    messages: Record<number, any>
    [key: string]: any
  }
}
