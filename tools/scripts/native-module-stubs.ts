import { createRequire } from 'node:module';

// Module names that only load inside the React Native runtime: they use Flow syntax, `__DEV__` and
// native bindings that plain Node has none of.
const nativeModule =
  /^(react-native|@react-native|expo|@expo|@shopify|@sentry\/react-native|@bacons|react-native-.+|expo-.+)(\/|$)/;
// Files Metro bundles as assets (fonts, images, sounds): Node would read them as JavaScript.
const assetFile = /\.(ttf|otf|woff2?|png|jpe?g|gif|webp|svg|mp3|m4a|wav|caf|riv|json5)$/i;

interface LoaderHooks {
  _load: (request: string, ...rest: unknown[]) => unknown;
}

/** A value that is any property, any function and any constructor: enough to import a screen file. */
function stubValue(): unknown {
  const callable = function () {};
  // The interop that turns a CommonJS module into an ES one (`import X, { y } from ...`) copies the
  // module onto an object made from the module's prototype; this prototype answers every name.
  const names: object = new Proxy(
    {},
    { get: (_target, key) => (key === 'then' ? undefined : stub) },
  );
  const stub: unknown = new Proxy(callable, {
    // Not a promise, not a primitive, and not an ES module: a default import then gets the stub
    // itself rather than a missing `default`.
    get: (_callable, key) =>
      key === 'then' || key === '__esModule' || key === Symbol.toPrimitive ? undefined : stub,
    getPrototypeOf: () => names,
    apply: () => stub,
    construct: () => stub as object,
  });
  return stub;
}

/**
 * Lets a script in Node read the screen registry, whose files import app code that needs the React
 * Native runtime. The script only reads each entry's name and variants, so the screens themselves
 * (loaded lazily, never here) are not run. Call before loading any registry file.
 */
export function stubNativeModules(): void {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  const loader = createRequire(import.meta.url)('node:module') as LoaderHooks;
  const load = loader._load;
  loader._load = (request, ...rest) =>
    nativeModule.test(request) || assetFile.test(request) ? stubValue() : load(request, ...rest);
}
