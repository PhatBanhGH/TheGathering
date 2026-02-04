// Polyfill for Node.js util module in browser
// Provides minimal implementations of util functions used by debug and other packages

const inspect = (obj: any, options?: any): string => {
  try {
    if (options && options.depth !== undefined) {
      return JSON.stringify(obj, null, options.depth > 0 ? 2 : 0);
    }
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

const debuglog = (_section: string) => {
  // Return a no-op function in browser
  // In Node.js, this would conditionally log based on NODE_DEBUG env var
  return () => {};
};

const format = (...args: any[]): string => {
  // Simple format implementation
  if (args.length === 0) return '';
  let str = String(args[0]);
  for (let i = 1; i < args.length; i++) {
    str = str.replace(/%[sdj%]/, String(args[i]));
  }
  return str;
};

const utilPolyfill: any = {
  inspect,
  debuglog,
  format,
  // Add other commonly used util functions as no-ops
  promisify: (fn: any) => fn,
  callbackify: (fn: any) => fn,
  inherits: () => {},
  isArray: Array.isArray,
  isBuffer: () => false,
  isDate: (val: any) => val instanceof Date,
  isError: (val: any) => val instanceof Error,
  isFunction: (val: any) => typeof val === 'function',
  isNull: (val: any) => val === null,
  isNullOrUndefined: (val: any) => val === null || val === undefined,
  isNumber: (val: any) => typeof val === 'number',
  isObject: (val: any) => typeof val === 'object' && val !== null,
  isPrimitive: (val: any) => val === null || (typeof val !== 'object' && typeof val !== 'function'),
  isRegExp: (val: any) => val instanceof RegExp,
  isString: (val: any) => typeof val === 'string',
  isSymbol: (val: any) => typeof val === 'symbol',
  isUndefined: (val: any) => val === undefined,
};

// Export as default for ES modules
export default utilPolyfill;

// Also export named exports for CommonJS compatibility
export { inspect, debuglog, format };

