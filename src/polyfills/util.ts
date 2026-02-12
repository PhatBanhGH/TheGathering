// @ts-nocheck
// @ts-ignore
import * as inheritsModule from './inherits';
// @ts-ignore
import * as deprecateModule from './util_deprecate';
const inherits = (inheritsModule as any).default || inheritsModule;
const deprecate = (deprecateModule as any).default || deprecateModule;

export { inherits, deprecate };

export function format(fmt) {
  return fmt;
}

export const TextDecoder = globalThis.TextDecoder;
export const TextEncoder = globalThis.TextEncoder;

export default {
  inherits,
  deprecate,
  format,
  TextDecoder,
  TextEncoder
};
