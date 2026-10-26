// A font bundled with the app, as Metro hands it to expo-font and Skia: an asset id.
declare module '*.ttf' {
  const source: number;
  export default source;
}
