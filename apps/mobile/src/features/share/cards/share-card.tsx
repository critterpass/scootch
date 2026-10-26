import type { ReactElement } from 'react';

import type { ShareFormat } from '../share-rules';

import { CertificateCard } from './certificate-card';
import type { CardProps } from './card-props';
import { DeskCard } from './desk-card';
import { NoteCard } from './note-card';
import { PaperCard } from './paper-card';

/** One card, drawn in card points (360 wide) from the top left. */
export function ShareCard({
  format,
  ...props
}: CardProps & { readonly format: ShareFormat }): ReactElement {
  switch (format) {
    case 'paper':
      return <PaperCard {...props} />;
    case 'certificate':
      return <CertificateCard {...props} />;
    case 'note':
      return <NoteCard {...props} />;
    case 'desk':
      return <DeskCard {...props} />;
  }
}

/** "Trần Minh Anh" carves "M.A", as on the board's desk; "Sam Lee" carves "S.L". */
export function initialsOf(name: string | null): string {
  if (name === null) return '11A';
  const words = name.trim().split(/\s+/u);
  // A Vietnamese full name puts the family name first: its last two words are the given name.
  const given = words.length > 2 ? words.slice(-2) : words;
  const letters = given.map((word) => word.charAt(0).toLocaleUpperCase()).join('.');
  return letters === '' ? '11A' : letters;
}
