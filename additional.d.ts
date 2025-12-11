declare global {
  interface Window {
    __MOCK_WEB_SOCKET_DATA__?: any
    __TEST_WEBSOCKET_READY__?: boolean
  }
}

// This empty export is needed to treat this file as a module.
export {}
