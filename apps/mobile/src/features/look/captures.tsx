import { IconPickerPage } from './icon-picker-page';
import { mayShow } from './icons';

// The icon picker as the registry draws it, with nothing behind it. Used by the registry and by
// the tests.

const nothing = () => undefined;

/** The picker as the board draws it: following the attitude, with only Paper's finish worn. */
export function IconPickerCapture() {
  return (
    <IconPickerPage
      icon="cheeky"
      follows="attitude"
      iconOf={{ attitude: 'cheeky', finish: 'paper', pinned: 'cheeky' }}
      mayShow={(icon) => mayShow(icon, (finish) => finish === 'paper')}
      onFollow={nothing}
      onPick={nothing}
      onClose={nothing}
    />
  );
}

/** With Plus, and one icon kept: every finish is open and the pick wears the ring. */
export function IconPickerPinned() {
  return (
    <IconPickerPage
      icon="holo"
      follows="pinned"
      iconOf={{ attitude: 'cheeky', finish: 'holo', pinned: 'holo' }}
      mayShow={() => true}
      onFollow={nothing}
      onPick={nothing}
      onClose={nothing}
    />
  );
}
