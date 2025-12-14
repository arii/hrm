// jest.setup.cjs
const { TextEncoder, TextDecoder } = require('util');
const { ReadableStream } = require('node:stream/web');
const { MessagePort } = require('node:worker_threads');


global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.ReadableStream = ReadableStream;
global.MessagePort = MessagePort;

const {
  Request,
  Response,
  Headers,
  fetch,
} = require('undici');

global.Request = Request;
global.Response = Response;
global.Headers = Headers;
global.fetch = fetch;
