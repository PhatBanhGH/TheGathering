// Polyfill for Node.js process.nextTick in browser
// Used by simple-peer and other Node.js modules

if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = {
    nextTick: (callback: (...args: any[]) => void, ...args: any[]) => {
      setTimeout(() => {
        callback(...args);
      }, 0);
    },
    env: {},
    version: '',
    versions: {},
    platform: 'browser',
    browser: true,
  };
}

export default globalThis.process;



