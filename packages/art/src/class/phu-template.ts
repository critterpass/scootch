/**
 * Thầy Phú, copied verbatim from the Phu design board (design/phus-class/Phu.dc.html). The
 * {{holes}} are the board's own: a pose fills them (see phu.ts). Re-copy from the board when it
 * changes; do not edit shapes here.
 */
export const PHU_SIZE = { width: 200, height: 220 } as const;

export const PHU_TEMPLATE = `
<defs>
<clipPath id="pfLL"><circle cx="72" cy="84" r="14"></circle></clipPath>
<clipPath id="pfLR"><circle cx="128" cy="84" r="14"></circle></clipPath>
<clipPath id="pfAL"><ellipse cx="72" cy="72" rx="10" ry="8.5"></ellipse></clipPath>
<clipPath id="pfAR"><ellipse cx="128" cy="72" rx="10" ry="8.5"></ellipse></clipPath>
<clipPath id="pfBL"><ellipse cx="72" cy="86" rx="10" ry="9"></ellipse></clipPath>
<clipPath id="pfBR"><ellipse cx="128" cy="86" rx="10" ry="9"></ellipse></clipPath>
</defs>
<g class="{{footL}}"><rect x="64" y="205" width="30" height="12" rx="6" fill="#2B2B33"></rect></g>
<g class="{{footR}}"><rect x="106" y="205" width="30" height="12" rx="6" fill="#2B2B33"></rect></g>
<g>
<path d="M58 126 Q60 114 78 112 L122 112 Q140 114 142 126 Q166 150 166 172 Q166 200 130 201 L70 201 Q34 200 34 172 Q34 150 58 126 Z" fill="#4FB8F0"></path>
<ellipse cx="84" cy="160" rx="26" ry="22" fill="#6CC6F5"></ellipse>
<path d="M122 112 Q140 114 142 126 Q166 150 166 172 Q166 200 130 201 L118 201 Q152 192 150 166 Q146 136 122 112 Z" fill="#2E9BD8"></path>
<path d="M39 188 Q100 205 161 188 Q160 200 130 201 L70 201 Q40 200 39 188 Z" fill="#2C3A63"></path>
<path d="M152 193 Q150 200 130 201 L120 201 Q144 198 152 193 Z" fill="#212C4C"></path>
<path d="M37 180 Q100 197 163 180 L162 189 Q100 206 38 189 Z" fill="#6B3F22"></path>
<rect x="93" y="188" width="14" height="9" rx="2.5" fill="#FFC93C"></rect>
<rect x="98.8" y="124" width="2.4" height="58" rx="1.2" fill="#2E9BD8"></rect>
<circle cx="100" cy="144" r="2.2" fill="#A9DDFB"></circle>
<circle cx="100" cy="164" r="2.2" fill="#A9DDFB"></circle>
<rect x="115" y="122" width="5" height="17" rx="2.5" fill="#E8322B"></rect>
<rect x="115" y="122" width="5" height="5" rx="2" fill="#FFC93C"></rect>
<rect x="110" y="132" width="19" height="15" rx="3.5" fill="#2E9BD8"></rect>
<path d="M60 116 Q40 118 34 140 L52 150 Q58 132 66 124 Z" fill="#4FB8F0"></path>
<path d="M140 116 Q160 118 166 140 L148 150 Q142 132 134 124 Z" fill="#2E9BD8"></path>
<path d="M84 111 L100 124 L89 131 Z" fill="#E6F5FE"></path>
<path d="M116 111 L100 124 L111 131 Z" fill="#CDEBFB"></path>
</g>
<g transform="{{headT}}">
<ellipse cx="38" cy="88" rx="9" ry="12" fill="#F9C49A"></ellipse>
<ellipse cx="38" cy="89" rx="4" ry="6" fill="#EFA678"></ellipse>
<ellipse cx="162" cy="88" rx="9" ry="12" fill="#EFA678"></ellipse>
<ellipse cx="162" cy="89" rx="4" ry="6" fill="#E3925F"></ellipse>
<path d="M100 22 C138 22 155 38 157 62 L163 96 C167 126 140 140 100 140 C60 140 33 126 37 96 L43 62 C45 38 62 22 100 22 Z" fill="#F9C49A"></path>
<path d="M147 40 C153 48 156 55 157 62 L163 96 C167 124 146 138 118 140 C143 128 153 110 151 86 C150 66 149 52 147 40 Z" fill="#EFA678"></path>
<g opacity="{{o.cheeks}}"><ellipse cx="48" cy="110" rx="15" ry="13" fill="#F9C49A"></ellipse><ellipse cx="152" cy="110" rx="15" ry="13" fill="#EFA678"></ellipse><ellipse cx="48" cy="110" rx="15" ry="13" fill="#FF5E4D" opacity="0.28"></ellipse><ellipse cx="152" cy="110" rx="15" ry="13" fill="#FF5E4D" opacity="0.28"></ellipse></g>
<path d="M100 22 C138 22 155 38 157 62 L163 96 C167 126 140 140 100 140 C60 140 33 126 37 96 L43 62 C45 38 62 22 100 22 Z" fill="#FF5E4D" opacity="{{o.red}}"></path>
<path d="M68 132 Q100 148 132 132 Q100 141 68 132 Z" fill="#EFA678"></path>
<ellipse cx="56" cy="108" rx="13" ry="9" fill="#FF8F80" opacity="{{o.blush}}"></ellipse>
<ellipse cx="144" cy="108" rx="12" ry="9" fill="#FF8F80" opacity="{{o.blush}}"></ellipse>
<ellipse cx="84" cy="50" rx="9" ry="3.5" fill="#FFDDBF"></ellipse>
<path d="M40 76 C38 56 44 46 52 42 L56 60 C50 62 46 68 46 80 Z" fill="#A7A9B4"></path>
<path d="M160 76 C162 56 156 46 148 42 L144 60 C150 62 154 68 154 80 Z" fill="#8C8E99"></path>
<path d="M48 54 C50 32 72 18 102 18 C132 18 152 32 154 54 C144 42 126 36 106 38 C84 40 64 44 48 54 Z" fill="#3E3A44"></path>
<path d="M70 32 C84 24 100 22 120 23 C102 26 86 30 74 36 Z" fill="#5A5562"></path>
<path d="M112 20 C110 6 124 0 130 8 C123 8 118 13 118 20 Z" fill="#3E3A44"></path>
<rect x="-14" y="-4.5" width="28" height="9" rx="4.5" fill="#3E3A44" transform="{{browL}}"></rect>
<rect x="-14" y="-4.5" width="28" height="9" rx="4.5" fill="#3E3A44" transform="{{browR}}"></rect>
<ellipse cx="100" cy="96" rx="10" ry="8" fill="#F4AE84"></ellipse>
<ellipse cx="96" cy="93" rx="3.5" ry="2.2" fill="#FFDDBF"></ellipse>
<g opacity="{{o.aboveFlat}}">
<g clip-path="url(#pfAL)"><ellipse cx="72" cy="72" rx="10" ry="8.5" fill="#FFFFFF"></ellipse><ellipse cx="72" cy="75" rx="4.5" ry="5.2" fill="#2A2A33"></ellipse><rect x="60" y="62" width="24" height="9" fill="#F9C49A"></rect><rect x="60" y="69.5" width="24" height="2.6" fill="#3E3A44"></rect></g>
<g clip-path="url(#pfAR)"><ellipse cx="128" cy="72" rx="10" ry="8.5" fill="#FFFFFF"></ellipse><ellipse cx="128" cy="75" rx="4.5" ry="5.2" fill="#2A2A33"></ellipse><rect x="116" y="62" width="24" height="9" fill="#EFA678"></rect><rect x="116" y="69.5" width="24" height="2.6" fill="#3E3A44"></rect></g>
</g>
<g opacity="{{o.aboveAngry}}">
<g clip-path="url(#pfAL)"><ellipse cx="72" cy="72" rx="10" ry="8.5" fill="#FFFFFF"></ellipse><ellipse cx="72" cy="76" rx="4.5" ry="5" fill="#2A2A33"></ellipse><path d="M60 62 L84 62 L84 75 L60 68 Z" fill="#F9C49A"></path><path d="M60 68 L84 75" stroke="#3E3A44" stroke-width="2.8"></path></g>
<g clip-path="url(#pfAR)"><ellipse cx="128" cy="72" rx="10" ry="8.5" fill="#FFFFFF"></ellipse><ellipse cx="128" cy="76" rx="4.5" ry="5" fill="#2A2A33"></ellipse><path d="M116 62 L140 62 L140 68 L116 75 Z" fill="#EFA678"></path><path d="M140 68 L116 75" stroke="#3E3A44" stroke-width="2.8"></path></g>
</g>
<g opacity="{{o.aboveDown}}">
<g clip-path="url(#pfAL)"><ellipse cx="72" cy="72" rx="10" ry="8.5" fill="#FFFFFF"></ellipse><ellipse cx="72" cy="78" rx="4" ry="4" fill="#2A2A33"></ellipse><rect x="60" y="62" width="24" height="12" fill="#F9C49A"></rect><rect x="60" y="72.5" width="24" height="2.6" fill="#3E3A44"></rect></g>
<g clip-path="url(#pfAR)"><ellipse cx="128" cy="72" rx="10" ry="8.5" fill="#FFFFFF"></ellipse><ellipse cx="128" cy="78" rx="4" ry="4" fill="#2A2A33"></ellipse><rect x="116" y="62" width="24" height="12" fill="#EFA678"></rect><rect x="116" y="72.5" width="24" height="2.6" fill="#3E3A44"></rect></g>
</g>
<g opacity="{{o.aboveClosed}}" fill="none" stroke="#2A2A33" stroke-width="3" stroke-linecap="round">
<path d="M63 73 Q72 78.5 81 73"></path><path d="M119 73 Q128 78.5 137 73"></path>
</g>
<g opacity="{{o.abovePeer}}">
<g clip-path="url(#pfAL)"><ellipse cx="72" cy="72" rx="10" ry="8.5" fill="#FFFFFF"></ellipse><ellipse cx="72" cy="73.5" rx="4.6" ry="5.4" fill="#2A2A33"></ellipse><circle cx="73.6" cy="71.4" r="1.5" fill="#FFFFFF"></circle><rect x="60" y="62" width="24" height="5.5" fill="#F9C49A"></rect><rect x="60" y="66.5" width="24" height="2.6" fill="#3E3A44"></rect></g>
<g clip-path="url(#pfAR)"><ellipse cx="128" cy="72" rx="10" ry="8.5" fill="#FFFFFF"></ellipse><ellipse cx="128" cy="73.5" rx="4.6" ry="5.4" fill="#2A2A33"></ellipse><circle cx="129.6" cy="71.4" r="1.5" fill="#FFFFFF"></circle></g>
</g>
<g opacity="{{o.bareSoft}}">
<g clip-path="url(#pfBL)"><ellipse cx="72" cy="86" rx="10" ry="9" fill="#FFFFFF"></ellipse><ellipse cx="72" cy="89" rx="5" ry="5.5" fill="#2A2A33"></ellipse><circle cx="74" cy="87" r="1.8" fill="#FFFFFF"></circle><path d="M60 76 L84 76 L84 79 L60 84 Z" fill="#F9C49A"></path><path d="M60 84 L84 79" stroke="#3E3A44" stroke-width="2.6"></path></g>
<g clip-path="url(#pfBR)"><ellipse cx="128" cy="86" rx="10" ry="9" fill="#FFFFFF"></ellipse><ellipse cx="128" cy="89" rx="5" ry="5.5" fill="#2A2A33"></ellipse><circle cx="130" cy="87" r="1.8" fill="#FFFFFF"></circle><path d="M116 76 L140 76 L140 84 L116 79 Z" fill="#EFA678"></path><path d="M140 84 L116 79" stroke="#3E3A44" stroke-width="2.6"></path></g>
</g>
<rect opacity="{{o.mouthCalm}}" x="94" y="119" width="12" height="4.5" rx="2.25" fill="#7B1E2A"></rect>
<rect opacity="{{o.mouthFlat}}" x="91" y="120" width="18" height="4" rx="2" fill="#7B1E2A"></rect>
<path opacity="{{o.mouthPout}}" d="M91 126 Q100 115 109 126 Q100 121 91 126 Z" fill="#7B1E2A"></path>
<g opacity="{{o.mouthSmile}}">
<path d="M86 113 L114 113 Q112 130 100 130 Q88 130 86 113 Z" fill="#7B1E2A"></path>
<path d="M92 125 Q100 119 108 125 Q105 130 100 130 Q95 130 92 125 Z" fill="#FF7A8A"></path>
</g>
<g opacity="{{o.mouthShout}}">
<path d="M80 112 L120 112 Q120 142 100 142 Q80 142 80 112 Z" fill="#7B1E2A"></path>
<rect x="83" y="112" width="34" height="6" rx="2" fill="#FFFFFF"></rect>
<ellipse cx="100" cy="135" rx="11" ry="6" fill="#FF7A8A"></ellipse>
</g>
<ellipse opacity="{{o.mouthO}}" cx="100" cy="130" rx="6" ry="7.5" fill="#7B1E2A"></ellipse>
<g opacity="{{o.mouthLaugh}}"><path d="M83 113 L117 113 Q116 139 100 139 Q84 139 83 113 Z" fill="#7B1E2A"></path><rect x="86" y="113" width="28" height="5" rx="2" fill="#FFFFFF"></rect><path d="M89 131 Q100 124 111 131 Q107 138 100 138 Q93 138 89 131 Z" fill="#FF7A8A"></path></g>
<path opacity="{{o.mouthWavy}}" d="M89 130 q5.5 -3.5 11 0 q5.5 3.5 11 0" fill="none" stroke="#7B1E2A" stroke-width="3" stroke-linecap="round"></path>
<path opacity="{{o.mouthSide}}" d="M99 131.5 Q106 128 114 129" fill="none" stroke="#7B1E2A" stroke-width="3.2" stroke-linecap="round"></path>
<path opacity="{{o.mouthFrown}}" d="M88 130 Q100 118 112 130" fill="none" stroke="#7B1E2A" stroke-width="4" stroke-linecap="round"></path>
<g opacity="{{o.mouthGrit}}"><rect x="84" y="117" width="32" height="15" rx="7" fill="#7B1E2A"></rect><rect x="86.5" y="119.5" width="27" height="10" rx="4.5" fill="#FFFFFF"></rect><path d="M93 119.5 v10 M100 119.5 v10 M107 119.5 v10 M86.5 124.5 h27" stroke="#D9D4CE" stroke-width="1.4"></path></g>
<path opacity="{{o.mouthTight}}" d="M93 127 q3.5 -3 7 0 q3.5 3 7 0" fill="none" stroke="#7B1E2A" stroke-width="3.2" stroke-linecap="round"></path>
<path d="M100 104 C92 98 74 98 68 110 C74 118 90 117 100 111 C110 117 126 118 132 110 C126 98 108 98 100 104 Z" fill="#3E3A44"></path>
<path d="M68 110 C74 118 90 117 100 111 C110 117 126 118 132 110 C124 114 110 113 100 107 C90 113 76 114 68 110 Z" fill="#2B2830"></path>
<g opacity="{{o.glassesDown}}" stroke-linecap="round">
<circle cx="72" cy="98" r="14" fill="#FFFFFF" fill-opacity="0.28" stroke="#2F2A2A" stroke-width="4"></circle>
<circle cx="128" cy="98" r="14" fill="#FFFFFF" fill-opacity="0.28" stroke="#2F2A2A" stroke-width="4"></circle>
<path d="M86 96 Q100 90 114 96" fill="none" stroke="#2F2A2A" stroke-width="4"></path>
<path d="M58 96 L40 84 M142 96 L160 84" stroke="#2F2A2A" stroke-width="4"></path>
<path d="M64 92 L69 88 M120 92 L125 88" stroke="#FFFFFF" stroke-width="3"></path>
</g>
<g opacity="{{o.glassesUp}}" stroke-linecap="round">
<g opacity="{{o.inOpen}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="72" cy="86" rx="6" ry="7.5" fill="#2A2A33"></ellipse><circle cx="74.5" cy="83" r="2.2" fill="#FFFFFF"></circle></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="128" cy="86" rx="6" ry="7.5" fill="#2A2A33"></ellipse><circle cx="130.5" cy="83" r="2.2" fill="#FFFFFF"></circle></g>
</g>
<g opacity="{{o.inAngry}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="72" cy="89" rx="5" ry="6" fill="#2A2A33"></ellipse><path d="M56 66 L90 66 L90 85 L56 76 Z" fill="#F9C49A"></path><path d="M56 76 L90 85" stroke="#3E3A44" stroke-width="3"></path></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="128" cy="89" rx="5" ry="6" fill="#2A2A33"></ellipse><path d="M110 66 L146 66 L146 76 L110 85 Z" fill="#EFA678"></path><path d="M146 76 L110 85" stroke="#3E3A44" stroke-width="3"></path></g>
</g>
<g opacity="{{o.inSqueeze}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#FBA98C"></circle><path d="M64 77 L80 84 L64 91" fill="none" stroke="#2A2A33" stroke-width="4.5" stroke-linejoin="round"></path></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#F59478"></circle><path d="M136 77 L120 84 L136 91" fill="none" stroke="#2A2A33" stroke-width="4.5" stroke-linejoin="round"></path></g>
</g>
<g opacity="{{o.inHappy}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#F9C49A"></circle><path d="M63 90 Q72 77 81 90" fill="none" stroke="#2A2A33" stroke-width="4.5"></path></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#EFA678"></circle><path d="M119 90 Q128 77 137 90" fill="none" stroke="#2A2A33" stroke-width="4.5"></path></g>
</g>
<g opacity="{{o.inGlint}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#FFFFFF"></circle><path d="M56 98 L80 66 L90 70 L64 102 Z" fill="#CFE6FF"></path><path d="M70 104 L92 76 L95 79 L73 107 Z" fill="#CFE6FF"></path></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#FFFFFF"></circle><path d="M112 98 L136 66 L146 70 L120 102 Z" fill="#CFE6FF"></path><path d="M126 104 L148 76 L151 79 L129 107 Z" fill="#CFE6FF"></path></g>
</g>
<g opacity="{{o.inSurprise}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#FFFFFF"></circle><circle cx="72" cy="84" r="3.6" fill="#2A2A33"></circle><circle cx="73.4" cy="82.6" r="1.1" fill="#FFFFFF"></circle></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#FFFFFF"></circle><circle cx="128" cy="84" r="3.6" fill="#2A2A33"></circle><circle cx="129.4" cy="82.6" r="1.1" fill="#FFFFFF"></circle></g>
</g>
<g opacity="{{o.inLook}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="76" cy="80" rx="5.5" ry="7" fill="#2A2A33"></ellipse><circle cx="78" cy="77" r="1.8" fill="#FFFFFF"></circle></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="132" cy="80" rx="5.5" ry="7" fill="#2A2A33"></ellipse><circle cx="134" cy="77" r="1.8" fill="#FFFFFF"></circle></g>
</g>
<g opacity="{{o.inSide}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="78" cy="86" rx="5.5" ry="7.2" fill="#2A2A33"></ellipse><circle cx="80" cy="83" r="1.8" fill="#FFFFFF"></circle></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="134" cy="86" rx="5.5" ry="7.2" fill="#2A2A33"></ellipse><circle cx="136" cy="83" r="1.8" fill="#FFFFFF"></circle></g>
</g>
<g opacity="{{o.inTeary}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="72" cy="85" rx="6.6" ry="8" fill="#2A2A33"></ellipse><circle cx="75" cy="81" r="2.6" fill="#FFFFFF"></circle><circle cx="69" cy="89" r="1.4" fill="#FFFFFF"></circle><path d="M58 93 Q72 101 86 93 L86 100 L58 100 Z" fill="#BFE3FA" opacity="0.9"></path></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#FFFFFF"></circle><ellipse cx="128" cy="85" rx="6.6" ry="8" fill="#2A2A33"></ellipse><circle cx="131" cy="81" r="2.6" fill="#FFFFFF"></circle><circle cx="125" cy="89" r="1.4" fill="#FFFFFF"></circle><path d="M114 93 Q128 101 142 93 L142 100 L114 100 Z" fill="#BFE3FA" opacity="0.9"></path></g>
</g>
<g opacity="{{o.inShut}}">
<g clip-path="url(#pfLL)"><circle cx="72" cy="84" r="14" fill="#F9C49A"></circle><path d="M63 84 Q72 91 81 84" fill="none" stroke="#2A2A33" stroke-width="4"></path></g>
<g clip-path="url(#pfLR)"><circle cx="128" cy="84" r="14" fill="#EFA678"></circle><path d="M119 84 Q128 91 137 84" fill="none" stroke="#2A2A33" stroke-width="4"></path></g>
</g>
<g opacity="{{o.glare}}"><path d="M63 77 L68 72 M119 77 L124 72" stroke="#FFFFFF" stroke-width="3"></path></g>
<circle cx="72" cy="84" r="16" fill="none" stroke="#2F2A2A" stroke-width="4.5"></circle>
<circle cx="128" cy="84" r="16" fill="none" stroke="#2F2A2A" stroke-width="4.5"></circle>
<path d="M88 81 Q100 74 112 81" fill="none" stroke="#2F2A2A" stroke-width="4.5"></path>
<path d="M56 82 L40 79 M144 82 L160 79" stroke="#2F2A2A" stroke-width="4.5"></path>
</g>
<g opacity="{{o.vein}}" fill="none" stroke="#E8322B" stroke-width="4.5" stroke-linecap="round">
<path d="M146 24 Q151 29 146 34"></path><path d="M162 24 Q157 29 162 34"></path>
<path d="M149 21 Q154 26 159 21"></path><path d="M149 37 Q154 32 159 37"></path>
</g>
<path opacity="{{o.tear}}" d="M62 101 C56.5 109 56.5 114 62 115 C67.5 114 67.5 109 62 101 Z" fill="#8FD0F5"></path>
<path opacity="{{o.sweat}}" d="M155 48 C149 57 149 62 155 63 C161 62 161 57 155 48 Z" fill="#A9DDF7"></path>
</g>
<g stroke-linecap="round">
<g opacity="{{o.armsRest}}">
<path d="M42 148 L32 170" fill="none" stroke="#F9C49A" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(30 174) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#F9C49A"></circle></g><path d="M158 148 L168 170" fill="none" stroke="#EFA678" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(170 174) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#EFA678"></circle></g>
</g>
<g opacity="{{o.armsTea}}">
<path d="M158 148 L168 170" stroke="#EFA678" stroke-width="14"></path>
<circle cx="170" cy="174" r="9" fill="#EFA678"></circle>
<path d="M58 124 Q54 118 58 112 M66 124 Q62 118 66 112" fill="none" stroke="#D9D4CE" stroke-width="3"></path>
<path d="M42 148 L54 154" stroke="#F9C49A" stroke-width="14"></path>
<rect x="52" y="130" width="22" height="20" rx="5" fill="#FFFFFF"></rect>
<rect x="52" y="130" width="22" height="5" rx="2.5" fill="#E8322B"></rect>
<path d="M74 136 Q82 140 74 146" fill="none" stroke="#FFFFFF" stroke-width="3.5"></path>
<circle cx="58" cy="152" r="9" fill="#F9C49A"></circle>
</g>
<g opacity="{{o.armsCrossed}}">
<path d="M165 171 L46 159" fill="none" stroke="#EFA678" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path><path d="M44 146 L35 170" fill="none" stroke="#F9C49A" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path><path opacity="0.25" d="M35 177 L150 166" fill="none" stroke="#D9865A" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path><path d="M35 172 L156 159" fill="none" stroke="#F9C49A" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"></path><path d="M156 146 L165 170" fill="none" stroke="#EFA678" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
</g>
<g opacity="{{o.armsRuler}}">
<path d="M42 148 L32 170" stroke="#F9C49A" stroke-width="14"></path>
<circle cx="30" cy="174" r="9" fill="#F9C49A"></circle>
<path d="M174 66 L187 192" stroke="#E0A030" stroke-width="11"></path>
<path d="M173 66 L185 192" stroke="#FFC94D" stroke-width="7"></path>
<path d="M177 92 L181 91.5 M180 116 L184 115.5 M182 140 L186 139.5 M185 164 L189 163.5" stroke="#E0A030" stroke-width="2"></path>
<path d="M158 148 L174 130" stroke="#EFA678" stroke-width="14"></path>
<circle cx="178" cy="126" r="9" fill="#EFA678"></circle>
<path d="M194 178 Q199 186 194 194" fill="none" stroke="#E8322B" stroke-width="3"></path>
</g>
<g opacity="{{o.armsFists}}">
<path d="M42 148 L30 124" stroke="#F9C49A" stroke-width="14"></path>
<circle cx="28" cy="119" r="10" fill="#F9C49A"></circle>
<path d="M158 148 L170 124" stroke="#EFA678" stroke-width="14"></path>
<circle cx="172" cy="119" r="10" fill="#EFA678"></circle>
<path d="M12 110 L6 106 M12 122 L4 123 M188 110 L194 106 M188 122 L196 123" stroke="#E8322B" stroke-width="3"></path>
</g>
<g opacity="{{o.armsGrading}}">
<g transform="rotate(-6 96 162)">
<rect x="70" y="142" width="52" height="40" rx="4" fill="#FFFFFF"></rect>
<rect x="76" y="150" width="30" height="3" rx="1.5" fill="#D7D0EC"></rect>
<rect x="76" y="158" width="24" height="3" rx="1.5" fill="#D7D0EC"></rect>
<rect x="76" y="166" width="28" height="3" rx="1.5" fill="#D7D0EC"></rect>
<path d="M100 170 L105 176 L116 162" fill="none" stroke="#E8322B" stroke-width="3.5" stroke-linejoin="round"></path>
</g>
<path d="M42 148 L64 168" stroke="#F9C49A" stroke-width="14"></path>
<circle cx="67" cy="171" r="9" fill="#F9C49A"></circle>
<path d="M126 164 L137 151" stroke="#E8322B" stroke-width="4.5"></path>
<path d="M158 148 L130 162" stroke="#EFA678" stroke-width="14"></path>
<circle cx="126" cy="165" r="9" fill="#EFA678"></circle>
</g>
<g opacity="{{o.armsThumb}}">
<path d="M42 148 L32 170" fill="none" stroke="#F9C49A" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(30 174) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#F9C49A"></circle></g><path d="M158 148 L170 134" fill="none" stroke="#EFA678" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(172 126) rotate(0) scale(1.2 1.2)"><rect x="-11" y="-9" width="21" height="19" rx="9" fill="#EFA678"></rect><ellipse cx="-4" cy="-13" rx="5" ry="8" fill="#EFA678" transform="rotate(-24 -4 -13)"></ellipse></g>
</g>
<g opacity="{{o.armsGlasses}}">
<path d="M158 148 L168 170" stroke="#EFA678" stroke-width="14"></path>
<circle cx="170" cy="174" r="9" fill="#EFA678"></circle>
<circle cx="86" cy="170" r="7" fill="#FFFFFF" fill-opacity="0.35" stroke="#2F2A2A" stroke-width="3"></circle>
<circle cx="102" cy="170" r="7" fill="#FFFFFF" fill-opacity="0.35" stroke="#2F2A2A" stroke-width="3"></circle>
<path d="M42 148 L68 160" stroke="#F9C49A" stroke-width="14"></path>
<circle cx="72" cy="163" r="9" fill="#F9C49A"></circle>
</g>
<g opacity="{{o.armsWave}}">
<path d="M42 148 L32 170" fill="none" stroke="#F9C49A" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(30 174) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#F9C49A"></circle></g><path d="M158 148 L168 132 L162 114" fill="none" stroke="#EFA678" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(161 112) rotate(8) scale(1.2 1.2)"><ellipse cx="0" cy="-13" rx="11" ry="13" fill="#EFA678"></ellipse><ellipse cx="9.5" cy="-9" rx="4.6" ry="7" fill="#EFA678" transform="rotate(38 9.5 -9)"></ellipse></g><path d="M180 80 q6 6 2 13 M186 70 q9 9 4 22" fill="none" stroke="#B0A69B" stroke-width="2.5" stroke-linecap="round"></path>
</g>
<g opacity="{{o.armsPoint}}">
<path d="M42 148 L32 170" stroke="#F9C49A" stroke-width="14"></path><circle cx="30" cy="174" r="9" fill="#F9C49A"></circle>
<path d="M182 128 L197 58" stroke="#8A5A36" stroke-width="4.5"></path><circle cx="197.5" cy="57" r="3.2" fill="#E8322B"></circle>
<path d="M158 148 L178 133" stroke="#EFA678" stroke-width="14"></path>
<circle cx="182" cy="129" r="9" fill="#EFA678"></circle>
</g>
<g opacity="{{o.armsThink}}">
<path d="M42 150 L116 166" fill="none" stroke="#F9C49A" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"></path><path d="M152 162 L122 146" fill="none" stroke="#EFA678" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(117 140) rotate(0) scale(1.05 1.05)"><circle cx="0" cy="0" r="9.6" fill="#EFA678"></circle></g>
</g>
<g opacity="{{o.armsPalm}}">
<path d="M158 148 L168 170" fill="none" stroke="#EFA678" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(170 174) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#EFA678"></circle></g><path d="M42 150 L18 116 L44 76" fill="none" stroke="#F9C49A" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g opacity="0.32" transform="translate(49 77.5) rotate(70) scale(1.45 1.45)"><ellipse cx="0" cy="-13" rx="11" ry="13" fill="#D9865A"></ellipse><ellipse cx="9.5" cy="-9" rx="4.6" ry="7" fill="#D9865A" transform="rotate(38 9.5 -9)"></ellipse></g><g transform="translate(47 74) rotate(70) scale(1.45 1.45)"><ellipse cx="0" cy="-13" rx="11" ry="13" fill="#FBCDA6"></ellipse><ellipse cx="9.5" cy="-9" rx="4.6" ry="7" fill="#FBCDA6" transform="rotate(38 9.5 -9)"></ellipse></g>
</g>
<g opacity="{{o.armsBelly}}">
<path d="M42 148 L62 171" stroke="#F9C49A" stroke-width="14"></path><circle cx="66" cy="175" r="9.5" fill="#F9C49A"></circle>
<path d="M158 148 L138 171" stroke="#EFA678" stroke-width="14"></path><circle cx="134" cy="175" r="9.5" fill="#EFA678"></circle>
<path d="M18 92 l-9 -5 M16 106 h-10 M182 92 l9 -5 M184 106 h10" stroke="#B0A69B" stroke-width="2.6"></path>
</g>
<g opacity="{{o.armsClap}}">
<path d="M42 148 L88 147" stroke="#F9C49A" stroke-width="14"></path>
<path d="M158 148 L112 146" stroke="#EFA678" stroke-width="14"></path>
<ellipse cx="94" cy="144" rx="8" ry="11" fill="#F9C49A" transform="rotate(14 94 144)"></ellipse>
<ellipse cx="106" cy="143" rx="8" ry="11" fill="#EFA678" transform="rotate(-14 106 143)"></ellipse>
<path d="M80 136 l-8 -5 M78 148 h-9 M120 134 l8 -5 M122 146 h9" stroke="#F2B33D" stroke-width="2.8"></path>
</g>
<g opacity="{{o.armsHips}}">
<path d="M44 146 L20 165 L42 180" fill="none" stroke="#F9C49A" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(46 181) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#F9C49A"></circle></g><path d="M156 146 L180 165 L158 180" fill="none" stroke="#EFA678" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(154 181) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#EFA678"></circle></g>
</g>
<g opacity="{{o.armsWatch}}">
<path d="M42 148 L56 172 L88 170" fill="none" stroke="#F9C49A" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(92 170) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#F9C49A"></circle></g><rect x="71" y="162" width="10" height="17" rx="3" fill="#2B2B33"></rect><circle cx="76" cy="170" r="7.5" fill="#FFFFFF" stroke="#FFC93C" stroke-width="2.6"></circle><path d="M76 170 v-4.2 M76 170 l3 1.6" stroke="#2A2A33" stroke-width="1.6" stroke-linecap="round"></path><path d="M158 148 L140 162 L98 158" fill="none" stroke="#EFA678" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(93 160) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#EFA678"></circle></g><path d="M62 158 l-6 -4 M64 168 h-8 M70 150 l-3 -6" fill="none" stroke="#E8322B" stroke-width="2.6" stroke-linecap="round"></path>
</g>
<g opacity="{{o.armsSnap}}">
<path d="M42 148 L82 162" stroke="#F9C49A" stroke-width="14"></path>
<path d="M158 148 L118 162" stroke="#EFA678" stroke-width="14"></path>
<rect x="84" y="157" width="26" height="10" rx="3" fill="#FFFFFF" transform="rotate(-42 86 162)"></rect><rect x="84" y="157" width="26" height="3.5" rx="1.75" fill="#E4DED6" transform="rotate(-42 86 162) translate(0 6.5)"></rect>
<rect x="90" y="157" width="26" height="10" rx="3" fill="#FFFFFF" transform="rotate(42 114 162)"></rect><rect x="90" y="157" width="26" height="3.5" rx="1.75" fill="#E4DED6" transform="rotate(42 114 162) translate(0 6.5)"></rect>
<circle cx="86" cy="162" r="10" fill="#F9C49A"></circle>
<circle cx="114" cy="162" r="10" fill="#EFA678"></circle>
<rect x="94" y="140" width="5" height="4" rx="1" fill="#FFFFFF" transform="rotate(24 96 142)"></rect>
<rect x="104" y="138" width="4" height="3.5" rx="1" fill="#FFFFFF" transform="rotate(-18 106 140)"></rect>
<circle cx="90" cy="142" r="2.6" fill="#F1ECE4"></circle><circle cx="111" cy="144" r="2.2" fill="#F1ECE4"></circle>
<path d="M80 146 l-7 -5 M120 146 l7 -5 M78 156 h-8 M122 156 h8" stroke="#FFC93C" stroke-width="2.8"></path>
</g>
<g opacity="{{o.armsSlip}}">
<path d="M158 148 L168 170" stroke="#EFA678" stroke-width="14"></path><circle cx="170" cy="174" r="9" fill="#EFA678"></circle>
<g transform="rotate(-9 70 146)">
<rect x="48" y="128" width="46" height="34" rx="3" fill="#FFF4D6"></rect>
<rect x="48" y="128" width="46" height="6" rx="2" fill="#F6C5BE"></rect>
<rect x="54" y="140" width="28" height="2.6" rx="1.3" fill="#C9BFB2"></rect>
<rect x="54" y="146" width="34" height="2.6" rx="1.3" fill="#C9BFB2"></rect>
<rect x="54" y="152" width="20" height="2.6" rx="1.3" fill="#C9BFB2"></rect>
</g>
<path d="M42 148 L52 160" stroke="#F9C49A" stroke-width="14"></path>
<circle cx="54" cy="160" r="9" fill="#F9C49A"></circle>
</g>
<g opacity="{{o.armsCount}}">
<path d="M42 148 L32 170" fill="none" stroke="#F9C49A" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(30 174) rotate(0) scale(1 1)"><circle cx="0" cy="0" r="9.6" fill="#F9C49A"></circle></g><path d="M158 148 L178 132 L176 112" fill="none" stroke="#EFA678" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"></path><g transform="translate(176 112) rotate(6) scale(1.25 1.25)"><ellipse cx="0" cy="-13" rx="11" ry="13" fill="#EFA678"></ellipse><ellipse cx="9.5" cy="-9" rx="4.6" ry="7" fill="#EFA678" transform="rotate(38 9.5 -9)"></ellipse></g><path d="M150 46 l2.5 13 M159 43 l2.5 13 M168 40 l2.5 13" fill="none" stroke="#E8322B" stroke-width="3.2" stroke-linecap="round"></path>
</g>
</g>
<g opacity="{{o.steam}}">
<g fill="#E4DED6"><circle cx="26" cy="46" r="11"></circle><circle cx="16" cy="34" r="7"></circle><circle cx="22" cy="24" r="4.5"></circle><circle cx="176" cy="46" r="11"></circle><circle cx="186" cy="34" r="7"></circle><circle cx="180" cy="24" r="4.5"></circle></g>
<g fill="#FFFFFF"><circle cx="24" cy="44" r="11"></circle><circle cx="14" cy="32" r="7"></circle><circle cx="20" cy="22" r="4.5"></circle><circle cx="174" cy="44" r="11"></circle><circle cx="184" cy="32" r="7"></circle><circle cx="178" cy="22" r="4.5"></circle></g>
</g>
<g opacity="{{o.sparkle}}" fill="#FFC23D">
<path d="M180 26 Q182 35 191 37 Q182 39 180 48 Q178 39 169 37 Q178 35 180 26 Z"></path>
<path d="M20 50 Q21.5 56 27.5 57.5 Q21.5 59 20 65 Q18.5 59 12.5 57.5 Q18.5 56 20 50 Z"></path>
<circle cx="190" cy="62" r="3"></circle>
</g>
<g opacity="{{o.exclaim}}" fill="#E8322B"><rect x="168" y="10" width="8" height="22" rx="4" transform="rotate(14 172 21)"></rect><circle cx="167" cy="40" r="4.6"></circle><rect x="150" y="18" width="6" height="14" rx="3" transform="rotate(-6 153 25)"></rect><circle cx="152" cy="38" r="3.4"></circle></g>
<g opacity="{{o.zzz}}" fill="none" stroke="#8A7F74" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M146 50 h9 l-9 9 h9"></path><path d="M158 32 h11 l-11 11 h11"></path><path d="M172 12 h14 l-14 14 h14"></path></g>
`;
