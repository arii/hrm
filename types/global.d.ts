// types/global.d.ts
export {};

declare global {
  interface Window {
    __TEST_READY__?: boolean;
    __TEST_WEBSOCKET_READY__?: boolean;
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}
