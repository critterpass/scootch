// A picture bundled with the app, as Metro hands it to an `Image`.
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';

  const source: ImageSourcePropType;
  export default source;
}
