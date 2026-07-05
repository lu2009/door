const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'frontend', 'js', 'local-request-interceptor.js'),
    'utf8',
  );

  let capturedFetchUrl = null;

  class RequestShim {
    constructor(url, init) {
      this.url = url;
      Object.assign(this, init);
    }
  }

  function XMLHttpRequestShim() {}
  XMLHttpRequestShim.prototype.open = function open(method, url) {
    this._method = method;
    this._url = url;
  };

  class WebSocketShim {
    constructor(url) {
      this.url = url;
    }
  }

  const storage = new Map();
  const sandbox = {
    URL,
    Request: RequestShim,
    XMLHttpRequest: XMLHttpRequestShim,
    WebSocket: WebSocketShim,
    indexedDB: null,
    console,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    sessionStorage: {
      clear: () => storage.clear(),
    },
    document: {
      querySelectorAll: () => [],
    },
  };

  const windowObject = {
    location: {
      origin: 'https://www.19901110.xyz:16666',
      protocol: 'https:',
      hostname: 'www.19901110.xyz',
      href: 'https://www.19901110.xyz:16666/',
      pathname: '/',
    },
    fetch: async (input) => {
      capturedFetchUrl = typeof input === 'string' ? input : input.url;
      return {
        status: 200,
        clone() {
          return this;
        },
        json() {
          return Promise.reject(new Error('not a login response'));
        },
      };
    },
    indexedDB: null,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    localStorage: sandbox.localStorage,
    sessionStorage: sandbox.sessionStorage,
    document: sandbox.document,
    XMLHttpRequest: XMLHttpRequestShim,
    WebSocket: WebSocketShim,
  };

  sandbox.window = windowObject;

  vm.runInNewContext(source, sandbox, { filename: 'local-request-interceptor.js' });

  await windowObject.fetch('http://localhost:17521/setTransitToken', { method: 'POST' });

  assert.equal(
    capturedFetchUrl,
    'https://www.19901110.xyz:17521/setTransitToken',
    'localhost print-service requests should be rewritten to the deployed print-service origin',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
