/**
 * The classroom props, copied verbatim from the Prop design board (design/phus-class/Prop.dc.html).
 * Moving parts carry the board's `pa-*` classes; props.ts turns them into layers. Re-copy from the
 * board when it changes; do not edit shapes here.
 */
// prettier-ignore
export const PROP_TEMPLATES = {
  cat: { width: 150, height: 104, label: 'A ginger cat', markup: `
    <rect class="pa-legB" x="47" y="62" width="12" height="32" rx="6" fill="#DA7F35"></rect>
    <rect class="pa-legA" x="95" y="62" width="12" height="32" rx="6" fill="#DA7F35"></rect>
    <path class="pa-tail" d="M36 60 C14 60 8 40 16 24 C19 18 27 20 25 27 C21 40 26 50 42 52 Z" fill="#DA7F35"></path>
    <path d="M30 58 C30 42 46 36 72 36 C96 36 114 42 114 58 C114 73 99 80 72 80 C44 80 30 73 30 58 Z" fill="#F4A259"></path>
    <path d="M96 38 C108 42 114 48 114 58 C114 73 99 80 80 80 C98 74 106 64 104 52 C103 46 100 41 96 38 Z" fill="#E68E44"></path>
    <ellipse cx="72" cy="72" rx="25" ry="6.5" fill="#FCD9B0"></ellipse>
    <path d="M54 38 Q57 45 54 50 M68 36.5 Q71 44 68 50 M82 37 Q85 44 82 49" stroke="#DA7F35" stroke-width="5" fill="none" stroke-linecap="round"></path>
    <rect class="pa-legA" x="55" y="64" width="13" height="32" rx="6.5" fill="#F4A259"></rect>
    <rect class="pa-legB" x="103" y="64" width="13" height="32" rx="6.5" fill="#F4A259"></rect>
    <g class="pa-head">
    <path d="M96 30 C94 18 95 10 98 6 C102 9 108 15 111 21 Z" fill="#F4A259" stroke="#F4A259" stroke-width="3" stroke-linejoin="round"></path>
    <path d="M99 24 C98 18 99 13 100 11 C103 14 105 17 106 21 Z" fill="#FF9E9E"></path>
    <path d="M124 21 C127 15 132 9 137 6 C139 11 139 19 137 30 Z" fill="#E68E44" stroke="#E68E44" stroke-width="3" stroke-linejoin="round"></path>
    <path d="M128 21 C130 17 133 13 135 12 C136 16 136 20 135 25 Z" fill="#FF9E9E"></path>
    <circle cx="117" cy="40" r="25" fill="#F4A259"></circle>
    <path d="M130 19 C138 25 142 33 142 40 C142 54 132 64 118 65 C132 58 138 46 134 32 C133 27 132 23 130 19 Z" fill="#E68E44"></path>
    <path d="M110 18 v7 M117 17 v8 M124 18 v7" stroke="#DA7F35" stroke-width="3.2" stroke-linecap="round"></path>
    <ellipse cx="121" cy="50" rx="12" ry="8.5" fill="#FCD9B0"></ellipse>
    <ellipse cx="108" cy="39" rx="4.4" ry="5.6" fill="#2A2A33"></ellipse><circle cx="109.6" cy="37" r="1.6" fill="#FFFFFF"></circle>
    <ellipse cx="128" cy="39" rx="4.4" ry="5.6" fill="#2A2A33"></ellipse><circle cx="129.6" cy="37" r="1.6" fill="#FFFFFF"></circle>
    <path d="M118 45.5 h6 l-3 3.6 z" fill="#E86A6A" stroke="#E86A6A" stroke-width="1.6" stroke-linejoin="round"></path>
    <path d="M121 49.5 q-2.6 3.4 -5.4 .4 M121 49.5 q2.6 3.4 5.4 .4" stroke="#2A2A33" stroke-width="1.7" fill="none" stroke-linecap="round"></path>
    <ellipse cx="103" cy="50" rx="4.5" ry="2.8" fill="#FF8F80" opacity="0.6"></ellipse>
    <ellipse cx="136" cy="49" rx="3.6" ry="2.6" fill="#FF8F80" opacity="0.6"></ellipse>
    </g>
    `,
  },
  plane: { width: 110, height: 64, label: 'A paper plane', markup: `
    <path d="M2 46 h20 M9 54 h13" stroke="#C6CDD5" stroke-width="3.2" stroke-linecap="round"></path>
    <path d="M24 36 L108 4 L50 40 Z" fill="#FFFFFF"></path>
    <path d="M50 40 L108 4 L60 62 Z" fill="#BCC6D1"></path>
    <path d="M50 40 L108 4 L55 49 Z" fill="#DCE3EA"></path>
    <path d="M40 31 L84 15 M50 31 L92 16" stroke="#C4BCEA" stroke-width="1.8" stroke-linecap="round"></path>
    <path d="M24 36 L108 4" stroke="#E8ECF1" stroke-width="1.2"></path>
    `,
  },
  candle: { width: 70, height: 120, label: 'A candle', markup: `
    <circle class="pa-glow" cx="35" cy="26" r="30" fill="#FFD86B" opacity="0.16"></circle><circle class="pa-glow" cx="35" cy="26" r="19" fill="#FFD86B" opacity="0.22"></circle>
    <path class="pa-flame" d="M35 6 C42 16 44 25 40 33 C38 37 32 37 30 33 C26 25 28 16 35 6 Z" fill="#FFAA33"></path>
    <path class="pa-flame" d="M35 17 C38 23 38.5 28 36.5 31 C35.5 33 33.5 32.5 33.2 30.5 C32.5 26.5 33.2 22 35 17 Z" fill="#FFF1B8"></path>
    <rect x="34" y="33" width="2.4" height="7" rx="1.2" fill="#4A3B30"></rect>
    <rect x="22" y="40" width="26" height="54" rx="5" fill="#FFF8EC"></rect>
    <rect x="37" y="40" width="11" height="54" fill="#EFE3CF"></rect>
    <path d="M22 45 C22 42 24 40 27 40 L33 40 L33 50 C33 53 28 53 28 50 L28 47 C28 46 22 47 22 45 Z" fill="#FFFFFF"></path>
    <ellipse cx="35" cy="98" rx="27" ry="8" fill="#B9852C"></ellipse>
    <ellipse cx="35" cy="95" rx="27" ry="7" fill="#E2B04A"></ellipse>
    <ellipse cx="35" cy="94" rx="15" ry="3.5" fill="#C9963A"></ellipse>
    <path d="M60 95 C70 95 70 106 60 104" stroke="#B9852C" stroke-width="4" fill="none" stroke-linecap="round"></path>
    `,
  },
  bouquet: { width: 130, height: 140, label: 'A bouquet of flowers', markup: `
    <ellipse cx="34" cy="56" rx="7" ry="15" fill="#5AAE6A" transform="rotate(-40 34 56)"></ellipse>
    <ellipse cx="98" cy="54" rx="7" ry="15" fill="#4C9A5C" transform="rotate(40 98 54)"></ellipse>
    <ellipse cx="66" cy="26" rx="6" ry="13" fill="#5AAE6A" transform="rotate(8 66 26)"></ellipse>
    <g fill="#E8322B"><circle cx="44" cy="44" r="9"></circle><circle cx="56" cy="40" r="9"></circle><circle cx="58" cy="53" r="9"></circle><circle cx="46" cy="58" r="9"></circle><circle cx="38" cy="50" r="8"></circle></g>
    <circle cx="49" cy="50" r="7" fill="#B8231D"></circle><path d="M46 50 a3 3 0 1 1 6 0" stroke="#E8322B" stroke-width="2" fill="none"></path>
    <g fill="#FF8FB0"><circle cx="82" cy="40" r="8.5"></circle><circle cx="93" cy="44" r="8.5"></circle><circle cx="91" cy="56" r="8.5"></circle><circle cx="79" cy="56" r="8.5"></circle><circle cx="76" cy="47" r="8"></circle></g>
    <circle cx="85" cy="49" r="6.5" fill="#E86A92"></circle>
    <g fill="#FFC93C"><circle cx="66" cy="28" r="8"></circle><circle cx="74" cy="34" r="8"></circle><circle cx="70" cy="43" r="8"></circle><circle cx="60" cy="42" r="8"></circle><circle cx="58" cy="33" r="7.5"></circle></g>
    <circle cx="66" cy="36" r="6" fill="#F29E1F"></circle>
    <g fill="#FFFFFF"><circle cx="30" cy="70" r="4.5"></circle><circle cx="36" cy="68" r="4.5"></circle><circle cx="33" cy="75" r="4.5"></circle></g><circle cx="33" cy="71" r="2.6" fill="#FFC93C"></circle>
    <g fill="#FFFFFF"><circle cx="100" cy="68" r="4.5"></circle><circle cx="106" cy="71" r="4.5"></circle><circle cx="101" cy="75" r="4.5"></circle></g><circle cx="102.5" cy="71.5" r="2.6" fill="#FFC93C"></circle>
    <path d="M24 70 C40 60 52 70 65 66 C78 70 90 60 106 70 L96 82 L34 82 Z" fill="#FFD1DC"></path>
    <path d="M30 76 L100 76 L72 136 L58 136 Z" fill="#EBCDA2"></path>
    <path d="M65 76 L100 76 L72 136 L65 136 Z" fill="#D9B483"></path>
    <path d="M50 100 C38 90 34 104 48 106 Z" fill="#E8322B"></path>
    <path d="M80 100 C92 90 96 104 82 106 Z" fill="#C9241E"></path>
    <rect x="58" y="97" width="14" height="11" rx="4" fill="#E8322B"></rect>
    <path d="M60 107 L54 122 M70 107 L76 122" stroke="#C9241E" stroke-width="4" stroke-linecap="round"></path>
    `,
  },
  banhchung: { width: 110, height: 96, label: 'A bánh chưng', markup: `
    <ellipse cx="55" cy="88" rx="44" ry="6" fill="#2A1E14" opacity="0.1"></ellipse>
    <path d="M14 34 L55 20 L96 34 L55 48 Z" fill="#72C47A"></path>
    <path d="M14 34 L55 48 L55 86 L14 72 Z" fill="#3E9A55"></path>
    <path d="M55 48 L96 34 L96 72 L55 86 Z" fill="#2E7E45"></path>
    <path d="M30 28.5 L71 42.5 M39 25.5 L80 39.5 M71 25.5 L30 39.5 M80 28.5 L39 42.5" stroke="#E0574E" stroke-width="3" stroke-linecap="round"></path>
    <path d="M30 39.5 L30 78 M39 42.5 L39 81 M71 42.5 L71 81 M80 39.5 L80 78" stroke="#C9473F" stroke-width="3" stroke-linecap="round"></path>
    <path d="M24 32 L48 24" stroke="#9AD99E" stroke-width="2" stroke-linecap="round" opacity="0.8"></path>
    `,
  },
  lantern: { width: 100, height: 140, label: 'A star lantern', markup: `
    <rect x="48" y="66" width="4.5" height="70" rx="2.2" fill="#8A5A36"></rect>
    <circle class="pa-glow" cx="50" cy="46" r="34" fill="#FFD86B" opacity="0.24"></circle>
    <path d="M50 6 L60 32.2 L88 33.6 L66.2 51.3 L73.5 78.4 L50 63 L26.5 78.4 L33.8 51.3 L12 33.6 L40 32.2 Z" fill="#E8322B" stroke="#E8322B" stroke-width="4" stroke-linejoin="round"></path>
    <path d="M50 46 L60 32.2 L88 33.6 L66.2 51.3 L73.5 78.4 L50 63 Z" fill="#C9241E"></path>
    <circle cx="50" cy="46" r="10" fill="#FFD86B"></circle>
    <circle cx="50" cy="46" r="5" fill="#FFF3C4"></circle>
    <path d="M26.5 78.4 L22 96 M73.5 78.4 L78 96" stroke="#FFC93C" stroke-width="3" stroke-linecap="round"></path>
    <circle cx="22" cy="98" r="3.5" fill="#FFC93C"></circle><circle cx="78" cy="98" r="3.5" fill="#FFC93C"></circle>
    `,
  },
  thermos: { width: 64, height: 114, label: "Thầy Phú's thermos", markup: `
    <path class="pa-steam" d="M26 8 C22 4 26 0 24 -4 M34 8 C30 4 34 0 32 -4" stroke="#E2DACB" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0"></path>
    <rect x="17" y="6" width="28" height="15" rx="5.5" fill="#F4EFE6"></rect>
    <rect x="33" y="6" width="12" height="15" rx="5" fill="#E2DACB"></rect>
    <rect x="13" y="19" width="36" height="6" rx="3" fill="#C9BFB2"></rect>
    <path d="M51 40 C62 46 62 66 51 72" stroke="#B8231D" stroke-width="5.5" fill="none" stroke-linecap="round"></path>
    <rect x="9" y="23" width="44" height="86" rx="13" fill="#E8322B"></rect>
    <path d="M33 23 L40 23 C47 23 53 29 53 36 L53 96 C53 103 47 109 40 109 L33 109 Z" fill="#CB2721"></path>
    <rect x="14" y="32" width="4" height="58" rx="2" fill="#FF7A6E" opacity="0.55"></rect>
    <g transform="translate(27 62)">
    <circle cx="0" cy="-9" r="5.5" fill="#FFE2B3"></circle><circle cx="8.5" cy="-3" r="5.5" fill="#FFE2B3"></circle><circle cx="5.5" cy="7" r="5.5" fill="#FFE2B3"></circle><circle cx="-5.5" cy="7" r="5.5" fill="#FFE2B3"></circle><circle cx="-8.5" cy="-3" r="5.5" fill="#FFE2B3"></circle>
    <circle cx="0" cy="0" r="4.5" fill="#FFC93C"></circle>
    </g>
    <path d="M12 86 C18 80 22 82 24 76 M38 84 C42 78 46 80 48 74" stroke="#5AAE6A" stroke-width="3" fill="none" stroke-linecap="round"></path>
    <rect x="9" y="100" width="44" height="9" rx="4.5" fill="#B8231D"></rect>
    `,
  },
  papers: { width: 110, height: 50, label: 'A stack of graded papers', markup: `
    <rect x="14" y="16" width="84" height="28" rx="2" fill="#DED5C6" transform="rotate(4 56 30)"></rect>
    <rect x="10" y="12" width="84" height="28" rx="2" fill="#EFE8DC" transform="rotate(-3 52 26)"></rect>
    <rect x="12" y="8" width="86" height="30" rx="2" fill="#FFFFFF" transform="rotate(1 55 23)"></rect>
    <path d="M20 15 H62 M20 21 H56 M20 27 H60 M20 33 H48" stroke="#D7D0EC" stroke-width="2" stroke-linecap="round"></path>
    <path d="M70 22 L76 28 L90 12" stroke="#D42A24" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
    <rect x="80" y="30" width="22" height="5" rx="2.5" fill="#D42A24" transform="rotate(-24 91 32)"></rect>
    <rect x="98" y="21" width="5" height="5" rx="1.5" fill="#FFC93C" transform="rotate(-24 100 24)"></rect>
    `,
  },
  drum: { width: 130, height: 130, label: 'The school drum', markup: `
    <path d="M34 92 L22 126 M96 92 L108 126 M65 96 L65 126" stroke="#6E4528" stroke-width="5" stroke-linecap="round"></path>
    <path d="M22 40 C22 34 108 34 108 40 L102 92 C102 100 28 100 28 92 Z" fill="#C8312A"></path>
    <path d="M74 36 C92 37 108 38 108 40 L102 92 C102 96 90 98 74 99 Z" fill="#A82520"></path>
    <path d="M24 52 C40 57 90 57 106 52 M27 82 C42 87 88 87 103 82" stroke="#8A5A36" stroke-width="5" fill="none"></path>
    <g fill="#FFD86B"><circle cx="34" cy="55" r="2.3"></circle><circle cx="50" cy="57" r="2.3"></circle><circle cx="65" cy="57.6" r="2.3"></circle><circle cx="80" cy="57" r="2.3"></circle><circle cx="96" cy="55" r="2.3"></circle></g>
    <ellipse cx="65" cy="40" rx="43" ry="11" fill="#F6E7C8"></ellipse>
    <ellipse cx="65" cy="40" rx="30" ry="7" fill="#EEDAB2"></ellipse>
    <path d="M30 10 L60 34 M100 10 L72 34" stroke="#8A5A36" stroke-width="5" stroke-linecap="round"></path>
    <circle cx="60" cy="34" r="5" fill="#E7C9A0"></circle><circle cx="72" cy="34" r="5" fill="#E7C9A0"></circle>
    `,
  },
  ruler: { width: 150, height: 30, label: 'A wooden ruler', markup: `
    <rect x="2" y="4" width="146" height="22" rx="4" fill="#F4C866"></rect>
    <rect x="2" y="18" width="146" height="8" rx="3" fill="#E0A732"></rect>
    <path d="M12 4 v8 M22 4 v5 M32 4 v8 M42 4 v5 M52 4 v8 M62 4 v5 M72 4 v8 M82 4 v5 M92 4 v8 M102 4 v5 M112 4 v8 M122 4 v5 M132 4 v8" stroke="#A9741F" stroke-width="1.6" stroke-linecap="round"></path>
    <circle cx="140" cy="14" r="2.6" fill="#E0A732"></circle>
    `,
  },
  bucket: { width: 90, height: 96, label: 'A bucket catching a leak', markup: `
    <circle class="pa-drip" cx="45" cy="6" r="4" fill="#7FB2E5"></circle>
    <path d="M14 34 C14 24 76 24 76 34" stroke="#8FA3B3" stroke-width="3.5" fill="none"></path>
    <path d="M10 38 L80 38 L72 90 C72 94 18 94 18 90 Z" fill="#8FA3B3"></path>
    <path d="M52 38 L80 38 L72 90 C72 92 64 93 56 93 Z" fill="#7B8FA0"></path>
    <ellipse cx="45" cy="38" rx="35" ry="8" fill="#A9BCCA"></ellipse>
    <ellipse cx="45" cy="40" rx="28" ry="5" fill="#7FB2E5"></ellipse>
    <ellipse cx="45" cy="40" rx="10" ry="1.8" fill="#BFDAF2"></ellipse>
    `,
  },
  icecream: { width: 70, height: 110, label: 'An ice cream cone', markup: `
    <path d="M14 46 L56 46 L37 106 C36 108 34 108 33 106 Z" fill="#E7B062"></path>
    <path d="M35 46 L56 46 L37 106 C36.5 107 35.5 107.5 35 107.5 Z" fill="#D49A4A"></path>
    <path d="M18 54 L48 84 M28 50 L52 74 M44 50 L22 72 M52 56 L30 84" stroke="#C48A3A" stroke-width="2" stroke-linecap="round" opacity="0.7"></path>
    <circle cx="35" cy="22" r="14" fill="#8A5A36"></circle>
    <circle cx="23" cy="38" r="14" fill="#FFB8C9"></circle>
    <circle cx="47" cy="38" r="14" fill="#A8E3C9"></circle>
    <path d="M10 44 C14 52 18 46 22 52 C26 46 30 54 34 48 C38 54 42 46 46 52 C50 46 54 52 60 44 L60 40 L10 40 Z" fill="#FFB8C9"></path>
    <circle cx="30" cy="16" r="3" fill="#FFFFFF" opacity="0.4"></circle>
    <circle cx="35" cy="8" r="4" fill="#E8322B"></circle>
    `,
  },
  coffee: { width: 64, height: 110, label: 'Iced milk coffee', markup: `
    <path d="M36 2 L30 50" stroke="#E8322B" stroke-width="4" stroke-linecap="round"></path>
    <path d="M8 22 L56 22 L50 104 C50 106 14 106 14 104 Z" fill="#E6F1F6"></path>
    <path d="M10 52 L54 52 L50 104 C50 106 14 106 14 104 Z" fill="#7A4628"></path>
    <path d="M10 52 L54 52 L53.2 62 L10.8 62 Z" fill="#D9A877"></path>
    <path d="M38 52 L54 52 L50 104 C50 105 44 105.6 38 105.8 Z" fill="#663A20"></path>
    <rect x="16" y="28" width="13" height="13" rx="3" fill="#FFFFFF" opacity="0.85" transform="rotate(-10 22 34)"></rect>
    <rect x="31" y="32" width="13" height="13" rx="3" fill="#FFFFFF" opacity="0.85" transform="rotate(12 37 38)"></rect>
    <rect x="21" y="42" width="12" height="12" rx="3" fill="#FFFFFF" opacity="0.6" transform="rotate(4 27 48)"></rect>
    <path d="M12 28 L15 96" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.7"></path>
    `,
  },
  cake: { width: 110, height: 100, label: 'A birthday cake with one candle', markup: `
    <path class="pa-flame" d="M55 4 C59 10 60 15 57 19 C56 21 54 21 53 19 C50 15 51 10 55 4 Z" fill="#FFAA33"></path>
    <rect x="52" y="20" width="6" height="20" rx="2" fill="#7FB2E5"></rect>
    <path d="M52 26 L58 23 M52 32 L58 29" stroke="#FFFFFF" stroke-width="1.6"></path>
    <ellipse cx="55" cy="90" rx="46" ry="7" fill="#E7DED2"></ellipse>
    <path d="M14 50 L96 50 L96 84 C96 92 14 92 14 84 Z" fill="#FFF3E2"></path>
    <path d="M68 50 L96 50 L96 84 C96 88 84 91 68 91.5 Z" fill="#F4E2C8"></path>
    <ellipse cx="55" cy="50" rx="41" ry="10" fill="#FFB8C9"></ellipse>
    <path d="M14 50 C14 58 20 62 22 56 C24 64 30 66 32 58 C35 66 42 64 44 58 C47 66 55 66 58 58 C61 66 68 64 70 58 C73 66 80 64 82 57 C86 64 96 60 96 50 Z" fill="#FFB8C9"></path>
    <g fill="#E8322B"><circle cx="32" cy="48" r="2.5"></circle><circle cx="78" cy="47" r="2.5"></circle><circle cx="55" cy="54" r="2.5"></circle></g>
    `,
  },
  balloons: { width: 100, height: 140, label: 'Balloons', markup: `
    <path d="M30 62 C34 90 46 100 50 136 M52 50 C50 86 52 100 50 136 M74 66 C68 92 54 104 50 136" stroke="#B0A69B" stroke-width="1.6" fill="none"></path>
    <ellipse cx="28" cy="40" rx="20" ry="24" fill="#E8322B"></ellipse><path d="M24 64 h8 l-4 5 z" fill="#C9241E"></path><ellipse cx="21" cy="30" rx="5" ry="8" fill="#FF7A6E" opacity="0.7"></ellipse>
    <ellipse cx="74" cy="44" rx="20" ry="24" fill="#4FB8F0"></ellipse><path d="M70 68 h8 l-4 5 z" fill="#2E9BD8"></path><ellipse cx="67" cy="34" rx="5" ry="8" fill="#9AD8F8" opacity="0.7"></ellipse>
    <ellipse cx="51" cy="26" rx="21" ry="25" fill="#FFC93C"></ellipse><path d="M47 51 h8 l-4 5 z" fill="#E9AE1C"></path><ellipse cx="44" cy="16" rx="5" ry="8" fill="#FFE28A" opacity="0.8"></ellipse>
    `,
  },
  butterfly: { width: 70, height: 56, label: 'A butterfly', markup: `
    <g class="pa-wingL"><path d="M34 26 C24 4 4 6 6 22 C7 30 20 32 34 28 Z" fill="#FFC93C"></path><path d="M34 30 C22 32 10 40 16 48 C22 54 30 44 34 32 Z" fill="#F29E1F"></path><circle cx="16" cy="18" r="3.5" fill="#FFFFFF"></circle></g>
    <g class="pa-wingR"><path d="M36 26 C46 4 66 6 64 22 C63 30 50 32 36 28 Z" fill="#FFC93C"></path><path d="M36 30 C48 32 60 40 54 48 C48 54 40 44 36 32 Z" fill="#F29E1F"></path><circle cx="54" cy="18" r="3.5" fill="#FFFFFF"></circle></g>
    <rect x="33" y="18" width="4" height="22" rx="2" fill="#3E3A44"></rect>
    <path d="M34 19 C32 12 28 10 26 8 M36 19 C38 12 42 10 44 8" stroke="#3E3A44" stroke-width="1.6" fill="none" stroke-linecap="round"></path>
    `,
  },
  armband: { width: 120, height: 50, label: 'A sao đỏ armband', markup: `
    <path d="M6 12 C40 6 80 6 114 12 L114 38 C80 44 40 44 6 38 Z" fill="#D42A24"></path>
    <path d="M6 32 C40 38 80 38 114 32 L114 38 C80 44 40 44 6 38 Z" fill="#B8231D"></path>
    <path d="M28 14 L30.9 20.6 L38 21 L32.5 25.4 L34.3 32.3 L28 28.4 L21.7 32.3 L23.5 25.4 L18 21 L25.1 20.6 Z" fill="#FFD86B"></path>
    <text x="46" y="29" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="12" letter-spacing="1.2" fill="#FFD86B">SAO ĐỎ</text>
    `,
  },
  peach: { width: 130, height: 100, label: 'A peach blossom branch', markup: `
    <path d="M6 92 C30 78 46 60 70 52 C88 46 104 30 124 22 M52 64 C56 50 54 38 60 26 M86 44 C92 52 104 56 116 54" stroke="#6E4528" stroke-width="4.5" fill="none" stroke-linecap="round"></path>
    <g fill="#FF9AB8"><circle cx="70" cy="44" r="5"></circle><circle cx="77" cy="49" r="5"></circle><circle cx="73" cy="56" r="5"></circle><circle cx="65" cy="54" r="5"></circle><circle cx="64" cy="47" r="5"></circle></g><circle cx="70" cy="50" r="2.6" fill="#E8457A"></circle>
    <g fill="#FFB8CC"><circle cx="58" cy="24" r="4.5"></circle><circle cx="64" cy="28" r="4.5"></circle><circle cx="61" cy="34" r="4.5"></circle><circle cx="54" cy="33" r="4.5"></circle><circle cx="53" cy="27" r="4.5"></circle></g><circle cx="58" cy="29.5" r="2.3" fill="#E8457A"></circle>
    <g fill="#FF9AB8"><circle cx="114" cy="48" r="4.5"></circle><circle cx="120" cy="52" r="4.5"></circle><circle cx="117" cy="58" r="4.5"></circle><circle cx="110" cy="57" r="4.5"></circle><circle cx="109" cy="51" r="4.5"></circle></g><circle cx="114" cy="53" r="2.3" fill="#E8457A"></circle>
    <circle cx="100" cy="34" r="3.5" fill="#FFB8CC"></circle><circle cx="34" cy="76" r="3.5" fill="#FFB8CC"></circle><circle cx="122" cy="20" r="3" fill="#FFB8CC"></circle>
    `,
  },
  clock: { width: 70, height: 70, label: 'The classroom clock', markup: `
    <circle cx="35" cy="35" r="32" fill="#3E3A44"></circle>
    <circle cx="35" cy="35" r="26" fill="#FFFFFF"></circle>
    <path d="M35 12 v5 M35 53 v5 M12 35 h5 M53 35 h5" stroke="#3E3A44" stroke-width="3" stroke-linecap="round"></path>
    <path d="M35 35 L26 23" stroke="#3E3A44" stroke-width="4" stroke-linecap="round"></path>
    <path d="M35 35 L35 15" stroke="#D42A24" stroke-width="2.6" stroke-linecap="round"></path>
    <circle cx="35" cy="35" r="3.5" fill="#3E3A44"></circle>
    `,
  },
} as const;
