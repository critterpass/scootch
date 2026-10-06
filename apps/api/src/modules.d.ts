// Files the Worker bundles as they are: a compiled WebAssembly module and raw bytes.
declare module '*.wasm' {
  const module: WebAssembly.Module;
  export default module;
}

declare module '*.bin' {
  const bytes: ArrayBuffer;
  export default bytes;
}
