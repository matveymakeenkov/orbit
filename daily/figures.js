// Коллекционные фигурки «Ежедневного вызова»: 4 серии × 6, рисуются SVG-кодом.
// window.FIGURES = {SERIES, RARITY, ITEMS, svg(id, {level, size}), byId}
(() => {
'use strict';
const O = '#1b1d2e';           // outline
const SW = 3.2;                // outline width
let uid = 0;

const RARITY = {
  common:    {name: 'Обычная',     color: '#9aa4c7', glow: '#8b95b8', ped: ['#4a5172', '#323853'], rank: 0},
  rare:      {name: 'Редкая',      color: '#4da3ff', glow: '#4da3ff', ped: ['#2f6fd6', '#1d4796'], rank: 1},
  epic:      {name: 'Эпическая',   color: '#c86bff', glow: '#b45cff', ped: ['#8c3fe0', '#5b2299'], rank: 2},
  legendary: {name: 'Легендарная', color: '#ffc23d', glow: '#ffb020', ped: ['#f2a20c', '#a8620a'], rank: 3},
};

const SERIES = [
  {id: 'garage',  name: 'Гараж',       emoji: '🚗', desc: 'Машинки, которые наконец выехали из пробки'},
  {id: 'robots',  name: 'Мастерская',  emoji: '🤖', desc: 'Роботы, уставшие кататься до упора'},
  {id: 'dinos',   name: 'Пазлозавры',  emoji: '🦖', desc: 'Древние жители головоломок'},
  {id: 'space',   name: 'Космодром',   emoji: '🚀', desc: 'Всё, что улетело дальше стены'},
];

// ---------- helpers ----------
const eye = (x, y, r = 7, look = 1.5) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${O}" stroke-width="${SW * .8}"/>` +
  `<circle cx="${x + look}" cy="${y + .5}" r="${r * .52}" fill="${O}"/>` +
  `<circle cx="${x + look + r * .22}" cy="${y - r * .2}" r="${r * .18}" fill="#fff"/>`;
const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#ff7b9c" opacity=".55"/>`;
const smile = (x, y, w = 10) => `<path d="M${x - w / 2} ${y} Q${x} ${y + w * .6} ${x + w / 2} ${y}" fill="none" stroke="${O}" stroke-width="${SW * .8}" stroke-linecap="round"/>`;
const wheel = (x, y, r = 13, hub = '#d6dbf5') =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#2a2d40" stroke="${O}" stroke-width="${SW}"/>` +
  `<circle cx="${x}" cy="${y}" r="${r * .45}" fill="${hub}" stroke="${O}" stroke-width="${SW * .6}"/>`;
const hl = (x, y, rx, ry, rot = -20, op = .45) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${x} ${y})"/>`;
const star = (cx, cy, r, fill) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`;
};
// linear gradient def
function lg(defs, a, b, vertical = true) {
  const id = 'g' + (++uid);
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`);
  return `url(#${id})`;
}
const GOLD = defs => lg(defs, '#fff1a8', '#e09a12');
const CHROME = defs => {
  const id = 'g' + (++uid);
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#b8c2dd"/><stop offset=".55" stop-color="#7d88a8"/><stop offset="1" stop-color="#dfe5f7"/></linearGradient>`);
  return `url(#${id})`;
};

// ---------- figures (drawn in a 200×170 box, ground at y≈165) ----------
const DRAW = {
  // ===== ГАРАЖ =====
  beetle(d) {
    const b = lg(d, '#7be08a', '#2fa54a');
    return `${wheel(62, 150)}${wheel(138, 150)}
      <path d="M30 148 Q28 110 60 92 Q100 64 140 92 Q172 110 170 148 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M68 96 Q100 74 132 96 L128 112 L72 112 Z" fill="#bfe9ff" stroke="${O}" stroke-width="${SW * .8}"/>
      ${hl(80, 100, 16, 5)}${eye(82, 128, 8)}${eye(118, 128, 8)}${smile(100, 140, 12)}${blush(70, 140)}${blush(130, 140)}`;
  },
  pickup(d) {
    const b = lg(d, '#ffb169', '#e8652a');
    return `${wheel(56, 150)}${wheel(146, 150)}
      <path d="M22 146 L22 116 Q22 108 30 108 L86 108 L96 78 Q98 72 106 72 L140 72 Q150 72 154 82 L168 108 Q178 110 178 120 L178 146 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M104 82 L138 82 Q144 82 147 88 L156 106 L100 106 Z" fill="#bfe9ff" stroke="${O}" stroke-width="${SW * .8}"/>
      <rect x="30" y="98" width="52" height="12" rx="3" fill="#a0522d" stroke="${O}" stroke-width="${SW * .7}"/>
      <rect x="36" y="88" width="16" height="12" rx="2" fill="#ffd166" stroke="${O}" stroke-width="2"/><rect x="56" y="92" width="18" height="8" rx="2" fill="#8bd3ff" stroke="${O}" stroke-width="2"/>
      ${eye(122, 126, 7)}${eye(150, 126, 7)}${smile(137, 137, 10)}${hl(118, 88, 10, 4)}`;
  },
  taxi(d) {
    const b = lg(d, '#ffe066', '#f2b705');
    let checks = ''; for (let i = 0; i < 8; i++) checks += `<rect x="${36 + i * 16}" y="122" width="8" height="7" fill="${O}"/><rect x="${44 + i * 16}" y="129" width="8" height="7" fill="${O}"/>`;
    return `${wheel(58, 150)}${wheel(142, 150)}
      <rect x="84" y="56" width="32" height="14" rx="4" fill="#fff6d1" stroke="${O}" stroke-width="${SW * .8}"/><text x="100" y="67" font-size="10" font-weight="800" text-anchor="middle" fill="${O}" font-family="Arial">TAXI</text>
      <path d="M24 148 L24 118 Q24 108 36 106 L56 104 L70 76 Q74 70 82 70 L120 70 Q128 70 132 76 L146 104 L166 106 Q176 108 176 118 L176 148 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M76 80 L98 80 L98 102 L64 102 Z M104 80 L124 80 L136 102 L104 102 Z" fill="#bfe9ff" stroke="${O}" stroke-width="${SW * .7}" stroke-linejoin="round"/>
      <clipPath id="tc${uid}"><rect x="28" y="120" width="146" height="18"/></clipPath><g clip-path="url(#tc${uid})">${checks}</g>
      ${eye(48, 115, 6)}${eye(152, 115, 6)}${hl(80, 88, 8, 4)}`;
  },
  police(d) {
    const b = lg(d, '#ffffff', '#cfd6ee');
    return `${wheel(58, 150)}${wheel(142, 150)}
      <rect x="80" y="58" width="40" height="12" rx="5" fill="${O}"/>
      <rect x="82" y="56" width="17" height="11" rx="4" fill="#ff4d6d"><animate attributeName="opacity" values="1;.3;1" dur=".8s" repeatCount="indefinite"/></rect>
      <rect x="101" y="56" width="17" height="11" rx="4" fill="#3d8bff"><animate attributeName="opacity" values=".3;1;.3" dur=".8s" repeatCount="indefinite"/></rect>
      <path d="M24 148 L24 118 Q24 108 36 106 L56 104 L70 76 Q74 70 82 70 L120 70 Q128 70 132 76 L146 104 L166 106 Q176 108 176 118 L176 148 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M24 120 L176 120 L176 138 L24 138 Z" fill="#2b5fd9"/>
      <path d="M24 148 L24 118 Q24 108 36 106 L56 104 L70 76 Q74 70 82 70 L120 70 Q128 70 132 76 L146 104 L166 106 Q176 108 176 118 L176 148 Z" fill="none" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M76 80 L98 80 L98 102 L64 102 Z M104 80 L124 80 L136 102 L104 102 Z" fill="#bfe9ff" stroke="${O}" stroke-width="${SW * .7}" stroke-linejoin="round"/>
      ${star(100, 129, 8, '#ffd23d')}${eye(48, 112, 6)}${eye(152, 112, 6)}`;
  },
  f1(d) {
    const b = lg(d, '#ff6b81', '#c4122f', false);
    return `${wheel(48, 146, 16, '#ffd23d')}${wheel(150, 146, 16, '#ffd23d')}
      <path d="M150 96 L182 92 L184 110 L160 112 Z" fill="${O}"/><rect x="168" y="86" width="20" height="8" rx="2" fill="#ff4d6d" stroke="${O}" stroke-width="2"/>
      <path d="M14 136 L20 120 Q60 108 92 104 L104 92 Q112 86 122 88 L136 96 Q170 104 176 122 L176 136 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <circle cx="116" cy="96" r="10" fill="#ffd23d" stroke="${O}" stroke-width="${SW * .8}"/><rect x="108" y="94" width="16" height="5" rx="2" fill="#3a3f63"/>
      <text x="70" y="128" font-size="18" font-weight="900" fill="#fff" stroke="${O}" stroke-width="1.2" font-family="Arial">1</text>
      ${hl(60, 118, 20, 4, -8)}<path d="M8 128 L-4 128 M10 120 L-2 118" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  },
  limo(d) {
    const g = GOLD(d);
    return `${wheel(46, 150, 13, '#fff1a8')}${wheel(154, 150, 13, '#fff1a8')}
      <path d="M8 148 L8 118 Q8 106 22 104 L44 102 L58 80 Q62 74 70 74 L136 74 Q144 74 148 80 L160 102 L180 104 Q192 106 192 118 L192 148 Z" fill="${g}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M64 84 L96 84 L96 100 L54 100 Z M102 84 L134 84 L134 100 L102 100 Z M140 84 L146 84 L154 100 L140 100 Z" fill="#2a2d40" stroke="${O}" stroke-width="${SW * .6}" stroke-linejoin="round"/>
      <path d="M82 72 L86 56 L94 66 L100 50 L106 66 L114 56 L118 72 Z" fill="${g}" stroke="${O}" stroke-width="${SW * .8}" stroke-linejoin="round"/>
      <circle cx="100" cy="62" r="3" fill="#ff4d6d"/>
      <rect x="20" y="120" width="160" height="5" rx="2" fill="#fff" opacity=".6"/>
      ${eye(30, 114, 6)}${eye(170, 114, 6, -1.5)}${hl(70, 90, 14, 3, -5, .6)}`;
  },

  // ===== МАСТЕРСКАЯ =====
  bolt(d) {
    const b = lg(d, '#9fb2d9', '#5d6f99');
    return `<line x1="100" y1="44" x2="100" y2="24" stroke="${O}" stroke-width="${SW}"/><circle cx="100" cy="20" r="7" fill="#ff5a6e" stroke="${O}" stroke-width="${SW * .8}"/>
      <rect x="64" y="44" width="72" height="54" rx="12" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <rect x="74" y="56" width="52" height="28" rx="8" fill="#1e2a44" stroke="${O}" stroke-width="2"/>
      <circle cx="88" cy="70" r="6" fill="#5ce1e6"/><circle cx="112" cy="70" r="6" fill="#5ce1e6"/>
      <rect x="70" y="100" width="60" height="44" rx="10" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <circle cx="100" cy="120" r="8" fill="#ffd23d" stroke="${O}" stroke-width="2"/>
      <rect x="48" y="104" width="18" height="30" rx="8" fill="${b}" stroke="${O}" stroke-width="${SW}"/><rect x="134" y="104" width="18" height="30" rx="8" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <rect x="78" y="144" width="16" height="18" rx="4" fill="#5d6f99" stroke="${O}" stroke-width="${SW}"/><rect x="106" y="144" width="16" height="18" rx="4" fill="#5d6f99" stroke="${O}" stroke-width="${SW}"/>
      ${hl(80, 52, 10, 4)}`;
  },
  nut(d) {
    const b = lg(d, '#ffd36b', '#e39a1b');
    const hex = (cx, cy, r) => { let p = ''; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; p += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1); } return p + 'Z'; };
    return `<path d="${hex(100, 62, 38)}" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <circle cx="100" cy="62" r="20" fill="#2a2d40" stroke="${O}" stroke-width="${SW * .8}"/>
      ${eye(92, 60, 6)}${eye(110, 60, 6)}
      <ellipse cx="100" cy="128" rx="34" ry="30" fill="#7d8bb5" stroke="${O}" stroke-width="${SW}"/>
      <path d="M78 116 Q100 130 122 116" fill="none" stroke="${O}" stroke-width="2"/><path d="M76 130 Q100 144 124 130" fill="none" stroke="${O}" stroke-width="2"/>
      <path d="M68 120 Q48 110 44 92" fill="none" stroke="${O}" stroke-width="${SW * 2.2}" stroke-linecap="round"/><path d="M68 120 Q48 110 44 92" fill="none" stroke="#7d8bb5" stroke-width="${SW * 1.2}" stroke-linecap="round"/>
      <circle cx="44" cy="88" r="8" fill="#ffd36b" stroke="${O}" stroke-width="${SW * .8}"/>
      <rect x="84" y="152" width="12" height="12" rx="3" fill="#56618a" stroke="${O}" stroke-width="2.5"/><rect x="104" y="152" width="12" height="12" rx="3" fill="#56618a" stroke="${O}" stroke-width="2.5"/>
      ${hl(84, 42, 9, 4)}`;
  },
  vacuum(d) {
    const b = lg(d, '#7ff0c9', '#21b383');
    return `<ellipse cx="100" cy="150" rx="62" ry="12" fill="#2a2d40" stroke="${O}" stroke-width="${SW}"/>
      <path d="M40 146 Q40 70 100 64 Q160 70 160 146 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M58 112 L142 112" stroke="${O}" stroke-width="2.5"/>
      <path d="M62 82 Q100 58 138 82 L134 104 L66 104 Z" fill="#1e2a44" stroke="${O}" stroke-width="2.5"/>
      <rect x="78" y="86" width="14" height="10" rx="5" fill="#7ff0c9"><animate attributeName="height" values="10;2;10" dur="3s" repeatCount="indefinite"/></rect>
      <rect x="108" y="86" width="14" height="10" rx="5" fill="#7ff0c9"><animate attributeName="height" values="10;2;10" dur="3s" repeatCount="indefinite"/></rect>
      <circle cx="70" cy="128" r="5" fill="#ff5a6e" stroke="${O}" stroke-width="2"/><circle cx="86" cy="128" r="5" fill="#ffd23d" stroke="${O}" stroke-width="2"/>
      <rect x="110" y="122" width="30" height="12" rx="6" fill="#d6dbf5" stroke="${O}" stroke-width="2"/>
      ${hl(70, 78, 12, 5)}`;
  },
  magnet(d) {
    const b = lg(d, '#b7a6ff', '#6a4fe0');
    const arm = (x, flip) => `<path d="M${x} 108 Q${x + flip * 26} 108 ${x + flip * 26} 86" fill="none" stroke="${O}" stroke-width="${SW * 2.6}" stroke-linecap="round"/><path d="M${x} 108 Q${x + flip * 26} 108 ${x + flip * 26} 86" fill="none" stroke="#6a4fe0" stroke-width="${SW * 1.6}" stroke-linecap="round"/>
      <path d="M${x + flip * 16} 82 L${x + flip * 16} 60 Q${x + flip * 16} 48 ${x + flip * 28} 48 Q${x + flip * 40} 48 ${x + flip * 40} 60 L${x + flip * 40} 82" fill="none" stroke="${O}" stroke-width="15" /><path d="M${x + flip * 16} 82 L${x + flip * 16} 60 Q${x + flip * 16} 48 ${x + flip * 28} 48 Q${x + flip * 40} 48 ${x + flip * 40} 60 L${x + flip * 40} 82" fill="none" stroke="#ff4d6d" stroke-width="9"/>
      <rect x="${x + flip * 16 - 6}" y="74" width="12" height="10" fill="#e8ecff" stroke="${O}" stroke-width="2"/><rect x="${x + flip * 40 - 6}" y="74" width="12" height="10" fill="#e8ecff" stroke="${O}" stroke-width="2"/>`;
    return `${arm(70, -1)}${arm(130, 1)}
      <rect x="66" y="58" width="68" height="104" rx="22" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <rect x="76" y="70" width="48" height="30" rx="10" fill="#1e2a44" stroke="${O}" stroke-width="2"/>
      ${eye(90, 85, 6)}${eye(110, 85, 6)}
      <path d="M86 122 L96 112 L104 126 L114 116" fill="none" stroke="#ffd23d" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite"/></path>
      ${hl(80, 66, 9, 4)}`;
  },
  titan(d) {
    const b = lg(d, '#ff8a5c', '#c2410c'), m = CHROME(d);
    return `<rect x="56" y="140" width="34" height="24" rx="6" fill="${m}" stroke="${O}" stroke-width="${SW}"/><rect x="110" y="140" width="34" height="24" rx="6" fill="${m}" stroke="${O}" stroke-width="${SW}"/>
      <path d="M44 70 L156 70 L148 142 L52 142 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <rect x="20" y="72" width="30" height="58" rx="12" fill="${m}" stroke="${O}" stroke-width="${SW}"/><rect x="150" y="72" width="30" height="58" rx="12" fill="${m}" stroke="${O}" stroke-width="${SW}"/>
      <rect x="16" y="124" width="38" height="22" rx="8" fill="${b}" stroke="${O}" stroke-width="${SW}"/><rect x="146" y="124" width="38" height="22" rx="8" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <rect x="74" y="28" width="52" height="40" rx="10" fill="${m}" stroke="${O}" stroke-width="${SW}"/>
      <rect x="80" y="40" width="40" height="12" rx="6" fill="#1e2a44"/><rect x="84" y="43" width="32" height="6" rx="3" fill="#ff3b3b"><animate attributeName="x" values="84;90;84" dur="2s" repeatCount="indefinite"/></rect>
      <circle cx="100" cy="104" r="16" fill="#1e2a44" stroke="${O}" stroke-width="2.5"/><circle cx="100" cy="104" r="9" fill="#5ce1e6"><animate attributeName="r" values="9;11;9" dur="1.6s" repeatCount="indefinite"/></circle>
      ${hl(66, 80, 12, 4)}`;
  },
  chrome(d) {
    const m = CHROME(d), g = GOLD(d), cape = lg(d, '#ff4d6d', '#8f1239');
    return `<path d="M62 70 Q40 120 50 162 L150 162 Q160 120 138 70 Z" fill="${cape}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <rect x="70" y="70" width="60" height="70" rx="16" fill="${m}" stroke="${O}" stroke-width="${SW}"/>
      <rect x="78" y="140" width="16" height="22" rx="5" fill="${m}" stroke="${O}" stroke-width="${SW}"/><rect x="106" y="140" width="16" height="22" rx="5" fill="${m}" stroke="${O}" stroke-width="${SW}"/>
      <rect x="72" y="24" width="56" height="44" rx="14" fill="${m}" stroke="${O}" stroke-width="${SW}"/>
      <path d="M72 26 L78 6 L90 18 L100 0 L110 18 L122 6 L128 26 Z" fill="${g}" stroke="${O}" stroke-width="${SW * .8}" stroke-linejoin="round"/>
      <circle cx="100" cy="14" r="3.5" fill="#4da3ff" stroke="${O}" stroke-width="1.5"/>
      <rect x="80" y="36" width="40" height="20" rx="8" fill="#1e2a44"/>
      <circle cx="91" cy="46" r="5" fill="#ffd23d"/><circle cx="109" cy="46" r="5" fill="#ffd23d"/>
      <circle cx="100" cy="100" r="13" fill="${g}" stroke="${O}" stroke-width="2.5"/>${star(100, 100, 8, '#fff7d1')}
      <path d="M130 90 L156 70" stroke="${O}" stroke-width="${SW * 2.4}" stroke-linecap="round"/><path d="M130 90 L156 70" stroke="#b8c2dd" stroke-width="${SW * 1.4}" stroke-linecap="round"/>
      <line x1="158" y1="70" x2="158" y2="32" stroke="${O}" stroke-width="6" stroke-linecap="round"/><line x1="158" y1="70" x2="158" y2="32" stroke="#ffd23d" stroke-width="3" stroke-linecap="round"/>
      <circle cx="158" cy="28" r="8" fill="#4da3ff" stroke="${O}" stroke-width="${SW * .8}"/>
      ${hl(84, 32, 9, 4, -20, .7)}${hl(82, 80, 8, 4, -20, .7)}`;
  },

  // ===== ПАЗЛОЗАВРЫ =====
  cubo(d) {
    const b = lg(d, '#8be27a', '#3c9d3a');
    return `<path d="M128 120 Q170 120 176 96 Q160 110 132 104 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <rect x="44" y="60" width="96" height="88" rx="22" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <rect x="58" y="148" width="20" height="16" rx="6" fill="#3c9d3a" stroke="${O}" stroke-width="${SW}"/><rect x="106" y="148" width="20" height="16" rx="6" fill="#3c9d3a" stroke="${O}" stroke-width="${SW}"/>
      <path d="M64 60 L72 46 L80 60 M88 60 L96 44 L104 60 M112 60 L120 46 L128 60" fill="#ffd23d" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="62" y="104" width="60" height="34" rx="12" fill="#d8f5c8" stroke="${O}" stroke-width="2"/>
      ${eye(76, 86, 8)}${eye(108, 86, 8)}${smile(92, 112, 14)}${blush(64, 100)}${blush(120, 100)}`;
  },
  stepo(d) {
    const b = lg(d, '#7fc8ff', '#2f7fd6');
    return `<ellipse cx="96" cy="118" rx="58" ry="36" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <path d="M50 100 Q30 60 52 40 Q66 30 76 44 Q66 60 72 92 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M150 112 Q182 118 188 98 Q178 128 148 130 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      ${[0, 1, 2, 3].map(i => `<rect x="${70 + i * 20}" y="${84 - (i % 2) * 4}" width="14" height="14" rx="3" fill="#ffd23d" stroke="${O}" stroke-width="2" transform="rotate(45 ${77 + i * 20} ${91 - (i % 2) * 4})"/>`).join('')}
      <rect x="64" y="146" width="16" height="18" rx="6" fill="#2f7fd6" stroke="${O}" stroke-width="${SW}"/><rect x="112" y="146" width="16" height="18" rx="6" fill="#2f7fd6" stroke="${O}" stroke-width="${SW}"/>
      ${eye(58, 54, 7)}${blush(52, 66)}<path d="M64 66 Q70 70 74 64" fill="none" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>`;
  },
  horn(d) {
    const b = lg(d, '#ffa1c4', '#e04a86');
    return `<path d="M134 128 Q176 136 184 112 Q176 142 136 146 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <ellipse cx="100" cy="116" rx="48" ry="44" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <path d="M86 76 L100 30 L114 76 Z" fill="#fff1d6" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/><path d="M93 54 L107 50 M90 64 L110 60" stroke="${O}" stroke-width="2"/>
      <path d="M58 92 L44 78 L64 82 Z M142 92 L156 78 L136 82 Z" fill="#fff1d6" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="70" y="150" width="20" height="14" rx="6" fill="#e04a86" stroke="${O}" stroke-width="${SW}"/><rect x="110" y="150" width="20" height="14" rx="6" fill="#e04a86" stroke="${O}" stroke-width="${SW}"/>
      <path d="M58 118 L142 118" stroke="${O}" stroke-width="5"/><path d="M58 118 L142 118" stroke="#c7cdf5" stroke-width="2"/>
      ${eye(84, 100, 8)}${eye(116, 100, 8)}<path d="M88 132 Q100 126 112 132" fill="none" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/><path d="M95 130 L97 136 L100 130" fill="#fff" stroke="${O}" stroke-width="1.5"/>`;
  },
  deadend(d) {
    const b = lg(d, '#b8a3ff', '#6b4fd8');
    return `<path d="M40 150 Q20 120 48 96 L60 86 Q68 50 104 48 Q140 50 148 86 Q170 104 164 150 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M62 150 L62 118 L86 118 L86 150 M114 150 L114 118 L138 118 L138 150" fill="#4b3699" stroke="${O}" stroke-width="2.5"/>
      <rect x="70" y="58" width="60" height="10" rx="5" fill="#ffd23d" stroke="${O}" stroke-width="2"/>
      <path d="M70 58 L66 46 M86 58 L84 44 M100 58 L100 42 M114 58 L116 44 M130 58 L134 46" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
      <path d="M82 84 L94 88 M118 84 L106 88" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
      ${eye(88, 96, 6, 0)}${eye(112, 96, 6, 0)}<path d="M90 110 L110 110" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
      <rect x="44" y="150" width="112" height="14" rx="5" fill="#4b3699" stroke="${O}" stroke-width="${SW}"/>`;
  },
  spiky(d) {
    const b = lg(d, '#5df2d6', '#0ea38a');
    let spikes = '';
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8, x = 100 + Math.cos(a) * 52, y = 104 + Math.sin(a) * 52, x2 = 100 + Math.cos(a) * 76, y2 = 104 + Math.sin(a) * 76, a2 = a + .18, a3 = a - .18;
      spikes += `<path d="M${(100 + Math.cos(a2) * 48).toFixed(1)} ${(104 + Math.sin(a2) * 48).toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${(100 + Math.cos(a3) * 48).toFixed(1)} ${(104 + Math.sin(a3) * 48).toFixed(1)}Z" fill="${i % 2 ? '#ff5a6e' : '#ffd23d'}" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>`; void x; void y; }
    return `${spikes}<circle cx="100" cy="112" r="54" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <ellipse cx="100" cy="132" rx="34" ry="22" fill="#c9fff4" stroke="${O}" stroke-width="2"/>
      ${eye(80, 100, 10)}${eye(120, 100, 10)}
      <path d="M86 128 Q100 142 114 128" fill="#1b1d2e" stroke="${O}" stroke-width="2.5"/><path d="M92 131 L95 136 L98 132 M102 132 L105 136 L108 131" fill="#fff" stroke="none"/>
      <rect x="66" y="156" width="20" height="10" rx="5" fill="#0ea38a" stroke="${O}" stroke-width="${SW}"/><rect x="114" y="156" width="20" height="10" rx="5" fill="#0ea38a" stroke="${O}" stroke-width="${SW}"/>
      ${hl(76, 70, 12, 5)}`;
  },
  dragon(d) {
    const b = lg(d, '#ffcf5c', '#e0780b'), w = lg(d, '#ff7a9c', '#b8123f');
    return `<g><path d="M70 92 Q20 40 6 70 Q24 74 22 90 Q36 84 44 100 Q54 92 70 104 Z" fill="${w}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"><animateTransform attributeName="transform" type="rotate" values="0 70 96;-10 70 96;0 70 96" dur="1.6s" repeatCount="indefinite"/></path>
      <path d="M130 92 Q180 40 194 70 Q176 74 178 90 Q164 84 156 100 Q146 92 130 104 Z" fill="${w}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"><animateTransform attributeName="transform" type="rotate" values="0 130 96;10 130 96;0 130 96" dur="1.6s" repeatCount="indefinite"/></path></g>
      <ellipse cx="100" cy="124" rx="44" ry="40" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <ellipse cx="100" cy="134" rx="26" ry="24" fill="#fff1c7" stroke="${O}" stroke-width="2"/>
      <path d="M86 138 L114 138 M88 148 L112 148" stroke="#e0a347" stroke-width="2"/>
      <ellipse cx="100" cy="70" rx="36" ry="30" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <path d="M74 50 L64 26 L84 44 Z M126 50 L136 26 L116 44 Z" fill="#fff1d6" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
      ${eye(86, 66, 9)}${eye(114, 66, 9)}
      <ellipse cx="100" cy="86" rx="18" ry="9" fill="#ffe09a" stroke="${O}" stroke-width="2"/><circle cx="94" cy="86" r="2" fill="${O}"/><circle cx="106" cy="86" r="2" fill="${O}"/>
      <path d="M100 42 L106 30 L100 34 L94 30 Z" fill="#ff5a6e" stroke="${O}" stroke-width="2"/>
      <rect x="72" y="156" width="20" height="10" rx="5" fill="#e0780b" stroke="${O}" stroke-width="${SW}"/><rect x="108" y="156" width="20" height="10" rx="5" fill="#e0780b" stroke="${O}" stroke-width="${SW}"/>
      ${hl(82, 52, 10, 4, -20, .6)}`;
  },

  // ===== КОСМОДРОМ =====
  comet(d) {
    const t = lg(d, 'rgba(120,200,255,0)', '#7fd3ff', false);
    return `<path d="M20 40 Q80 70 112 92 L96 112 Q62 82 20 40 Z" fill="${t}" opacity=".9"/>
      <path d="M40 80 Q86 96 108 108" stroke="#c9ecff" stroke-width="5" stroke-linecap="round" opacity=".7"/>
      <circle cx="122" cy="112" r="34" fill="#9fdcff" stroke="${O}" stroke-width="${SW}"/>
      <circle cx="136" cy="96" r="6" fill="#6fb6e0" stroke="${O}" stroke-width="2"/><circle cx="104" cy="128" r="5" fill="#6fb6e0" stroke="${O}" stroke-width="2"/>
      ${eye(114, 110, 7)}${eye(134, 112, 7)}${smile(124, 124, 10)}${blush(108, 122)}${blush(142, 124)}
      ${star(40, 130, 6, '#fff3a8')}${star(170, 60, 5, '#fff3a8')}`;
  },
  rocket(d) {
    const b = lg(d, '#ffffff', '#c9d2ee', false);
    return `<path d="M88 140 Q100 176 112 140 Z" fill="#ffd23d" stroke="${O}" stroke-width="2.5"><animate attributeName="d" values="M88 140 Q100 176 112 140 Z;M88 140 Q100 166 112 140 Z;M88 140 Q100 176 112 140 Z" dur=".3s" repeatCount="indefinite"/></path>
      <path d="M70 124 L54 148 L80 140 Z M130 124 L146 148 L120 140 Z" fill="#ff5a6e" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M100 18 Q136 56 130 140 L70 140 Q64 56 100 18 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M86 34 Q100 16 114 34 Z" fill="#ff5a6e" stroke="${O}" stroke-width="2.5"/>
      <circle cx="100" cy="76" r="16" fill="#7fd3ff" stroke="${O}" stroke-width="${SW}"/>${eye(95, 76, 5)}${eye(106, 76, 5)}
      <rect x="76" y="114" width="48" height="8" rx="3" fill="#4da3ff" stroke="${O}" stroke-width="2"/>
      ${hl(84, 60, 6, 16, 0, .55)}`;
  },
  rover(d) {
    const b = lg(d, '#d9dfef', '#8a94b4');
    return `${wheel(52, 150, 12)}${wheel(100, 150, 12)}${wheel(148, 150, 12)}
      <rect x="34" y="108" width="132" height="34" rx="10" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <path d="M40 108 L160 108" stroke="#ffd23d" stroke-width="4"/>
      <rect x="60" y="70" width="44" height="38" rx="8" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      ${eye(74, 88, 7)}${eye(92, 88, 7)}
      <rect x="114" y="74" width="46" height="22" fill="#2d63c8" stroke="${O}" stroke-width="2.5"/><path d="M129 74 L129 96 M145 74 L145 96 M114 85 L160 85" stroke="#7fb2ff" stroke-width="1.5"/>
      <line x1="137" y1="96" x2="137" y2="108" stroke="${O}" stroke-width="3"/>
      <line x1="66" y1="70" x2="58" y2="44" stroke="${O}" stroke-width="3"/><path d="M48 46 Q58 30 70 42" fill="#fff" stroke="${O}" stroke-width="2.5"/>
      <circle cx="42" cy="40" r="2.5" fill="#ffd23d"><animate attributeName="opacity" values="0;1;0" dur="1.4s" repeatCount="indefinite"/></circle>`;
  },
  ufo(d) {
    const b = CHROME(d), g = lg(d, 'rgba(140,255,170,.75)', 'rgba(140,255,170,0)');
    return `<path d="M76 104 L48 168 L152 168 L124 104 Z" fill="${g}"><animate attributeName="opacity" values=".9;.4;.9" dur="1.8s" repeatCount="indefinite"/></path>
      <ellipse cx="100" cy="72" rx="34" ry="30" fill="#b6f7ff" stroke="${O}" stroke-width="${SW}" opacity=".95"/>
      <ellipse cx="100" cy="80" rx="18" ry="20" fill="#7ee08a" stroke="${O}" stroke-width="2.5"/>${eye(100, 74, 9, 0)}
      <path d="M92 58 L88 46 M108 58 L112 46" stroke="${O}" stroke-width="2.5"/><circle cx="88" cy="44" r="3.5" fill="#ff5a6e"/><circle cx="112" cy="44" r="3.5" fill="#ff5a6e"/>
      <ellipse cx="100" cy="98" rx="74" ry="20" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      ${[40, 70, 100, 130, 160].map((x, i) => `<circle cx="${x}" cy="${i === 0 || i === 4 ? 98 : 104}" r="5" fill="#ffd23d" stroke="${O}" stroke-width="1.5"><animate attributeName="fill" values="#ffd23d;#ff5a6e;#5ce1e6;#ffd23d" dur="1.5s" begin="${i * .2}s" repeatCount="indefinite"/></circle>`).join('')}
      ${hl(80, 60, 8, 12, 20, .5)}`;
  },
  planet(d) {
    const b = lg(d, '#ff9ad5', '#8b5cf6'), r = lg(d, '#fff1a8', '#ffb020', false);
    return `<g><animateTransform attributeName="transform" type="rotate" values="-8 100 96;8 100 96;-8 100 96" dur="5s" repeatCount="indefinite"/>
      <path d="M22 106 Q100 70 178 86" fill="none" stroke="${O}" stroke-width="16" stroke-linecap="round"/><path d="M22 106 Q100 70 178 86" fill="none" stroke="${r}" stroke-width="10" stroke-linecap="round"/>
      <circle cx="100" cy="96" r="50" fill="${b}" stroke="${O}" stroke-width="${SW}"/>
      <path d="M56 78 Q100 70 140 76 M52 104 Q100 112 148 100" stroke="#fff" stroke-width="5" opacity=".3" fill="none"/>
      ${eye(84, 96, 9)}${eye(116, 96, 9)}${smile(100, 116, 14)}${blush(72, 112)}${blush(128, 112)}
      <path d="M38 114 Q100 132 162 100" fill="none" stroke="${O}" stroke-width="16" stroke-linecap="round"/><path d="M38 114 Q100 132 162 100" fill="none" stroke="${r}" stroke-width="10" stroke-linecap="round"/></g>
      <circle cx="172" cy="40" r="10" fill="#9fdcff" stroke="${O}" stroke-width="2.5"><animateTransform attributeName="transform" type="rotate" values="0 100 96;360 100 96" dur="9s" repeatCount="indefinite"/></circle>`;
  },
  whale(d) {
    const b = lg(d, '#5b7cff', '#1e2b8f'), belly = lg(d, '#c9f0ff', '#7fd3ff');
    let stars = ''; [[70, 92], [96, 84], [122, 90], [84, 104], [140, 100]].forEach(([x, y], i) => stars += `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff"><animate attributeName="opacity" values=".2;1;.2" dur="${1.4 + i * .3}s" repeatCount="indefinite"/></circle>`);
    return `<path d="M150 104 Q186 70 194 90 Q186 104 194 124 Q180 128 150 116 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M16 112 Q20 60 92 62 Q156 64 160 112 Q150 150 88 150 Q22 150 16 112 Z" fill="${b}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M24 122 Q60 152 140 132 Q120 148 80 148 Q36 146 24 122 Z" fill="${belly}" stroke="${O}" stroke-width="2.5"/>
      ${stars}
      ${eye(46, 104, 9)}${blush(40, 120)}${smile(56, 124, 12)}
      <path d="M90 140 Q100 166 120 160 Q104 152 104 138 Z" fill="${b}" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
      <g><path d="M84 60 Q76 30 66 26 M84 60 Q90 28 100 20 M84 60 Q96 40 112 36" fill="none" stroke="#7fd3ff" stroke-width="4" stroke-linecap="round"><animate attributeName="opacity" values="1;.4;1" dur="1.2s" repeatCount="indefinite"/></path>
      ${star(66, 22, 6, '#fff3a8')}${star(100, 16, 7, '#fff3a8')}${star(114, 34, 5, '#fff3a8')}</g>
      ${hl(60, 74, 16, 5, -10, .4)}`;
  },
};

const ITEMS = [
  // garage
  {id: 'beetle', series: 'garage', rarity: 'common', name: 'Жучок', desc: 'Самая дружелюбная машинка на парковке.'},
  {id: 'pickup', series: 'garage', rarity: 'common', name: 'Пикап', desc: 'Везёт кубики туда, где их не хватает.'},
  {id: 'taxi', series: 'garage', rarity: 'rare', name: 'Шашечки', desc: 'Знает все объезды. Почти все.'},
  {id: 'police', series: 'garage', rarity: 'rare', name: 'Патруль', desc: 'Следит, чтобы никто не ходил по диагонали.'},
  {id: 'f1', series: 'garage', rarity: 'epic', name: 'Болид №1', desc: 'Решает пробку за 0 ходов. Ну, почти.'},
  {id: 'limo', series: 'garage', rarity: 'legendary', name: 'Золотая Пробка', desc: 'Говорят, её видели только на воскресных боссах.'},
  // robots
  {id: 'bolt', series: 'robots', rarity: 'common', name: 'Болтик', desc: 'Первый робот, который остановился на мишени.'},
  {id: 'nut', series: 'robots', rarity: 'common', name: 'Гайка', desc: 'Крутится, но не теряется.'},
  {id: 'vacuum', series: 'robots', rarity: 'rare', name: 'Пылесосик', desc: 'Убирает лишние ходы.'},
  {id: 'magnet', series: 'robots', rarity: 'rare', name: 'Магнитон', desc: 'Притягивает удачу и других роботов.'},
  {id: 'titan', series: 'robots', rarity: 'epic', name: 'Титан', desc: 'Сам становится стеной, если надо.'},
  {id: 'chrome', series: 'robots', rarity: 'legendary', name: 'Хром Великий', desc: 'Король рикошетов. Ни разу не нажимал «отменить».'},
  // dinos
  {id: 'cubo', series: 'dinos', rarity: 'common', name: 'Кубозавр', desc: 'Квадратный снаружи, добрый внутри.'},
  {id: 'stepo', series: 'dinos', rarity: 'common', name: 'Ходозавр', desc: 'Считает каждый шаг. Вслух.'},
  {id: 'horn', series: 'dinos', rarity: 'rare', name: 'Стенорог', desc: 'Пробивает стены. Жаль, это против правил.'},
  {id: 'deadend', series: 'dinos', rarity: 'rare', name: 'Тупикодон', desc: 'Живёт в тупиках и не жалуется.'},
  {id: 'spiky', series: 'dinos', rarity: 'epic', name: 'Рикошетрон', desc: 'Отскакивает от всего, даже от критики.'},
  {id: 'dragon', series: 'dinos', rarity: 'legendary', name: 'Великий Решатор', desc: 'Видит решение раньше, чем загрузится поле.'},
  // space
  {id: 'comet', series: 'space', rarity: 'common', name: 'Кометка', desc: 'Пролетает мимо всех стен.'},
  {id: 'rocket', series: 'space', rarity: 'common', name: 'Ракетка', desc: 'Стартует ровно в полночь по Москве.'},
  {id: 'rover', series: 'space', rarity: 'rare', name: 'Луноход', desc: 'Медленно, но точно к мишени.'},
  {id: 'ufo', series: 'space', rarity: 'rare', name: 'Тарелка', desc: 'Похищает лишние ходы.'},
  {id: 'planet', series: 'space', rarity: 'epic', name: 'Кольцевая', desc: 'Её кольца — идеальная траектория.'},
  {id: 'whale', series: 'space', rarity: 'legendary', name: 'Звёздный кит', desc: 'Плывёт сквозь воскресенья. Приносит удачу.'},
];
const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));

// levels by number of copies: 1 → ур.1, 2 → ур.2, 4 → ур.3 (серебро), 7 → ур.4 (золото)
const LEVELS = [1, 2, 4, 7];
const levelOf = count => LEVELS.filter(n => count >= n).length;
const nextLevelAt = count => LEVELS.find(n => n > count) || null;

function sparkles(n, color, seed) {
  let s = '', r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    const x = 20 + rnd() * 160, y = 10 + rnd() * 140, sz = 3 + rnd() * 5, dur = 1.2 + rnd() * 1.6, beg = rnd() * 2;
    s += `<path d="M${x} ${y - sz} L${x + sz * .3} ${y - sz * .3} L${x + sz} ${y} L${x + sz * .3} ${y + sz * .3} L${x} ${y + sz} L${x - sz * .3} ${y + sz * .3} L${x - sz} ${y} L${x - sz * .3} ${y - sz * .3}Z" fill="${color}" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="${dur.toFixed(2)}s" begin="${beg.toFixed(2)}s" repeatCount="indefinite"/></path>`;
  }
  return s;
}

function svg(id, opts = {}) {
  const it = byId[id]; if (!it) return '';
  const R = RARITY[it.rarity], level = opts.level || 1, locked = !!opts.locked;
  const d = [];
  const body = DRAW[id](d);
  const base = ++uid;
  let back = '', front = '', anim = '';
  if (!locked) {
    d.push(`<radialGradient id="aura${base}"><stop offset="0" stop-color="${R.glow}" stop-opacity="${it.rarity === 'common' ? .25 : .55}"/><stop offset="1" stop-color="${R.glow}" stop-opacity="0"/></radialGradient>`);
    back += `<circle cx="100" cy="100" r="96" fill="url(#aura${base})"/>`;
    if (it.rarity === 'legendary') {
      let rays = '';
      for (let i = 0; i < 12; i++) rays += `<path d="M100 100 L${100 + Math.cos(i * Math.PI / 6 - .1) * 130} ${100 + Math.sin(i * Math.PI / 6 - .1) * 130} L${100 + Math.cos(i * Math.PI / 6 + .1) * 130} ${100 + Math.sin(i * Math.PI / 6 + .1) * 130}Z" fill="#ffe58a" opacity=".22"/>`;
      back += `<g>${rays}<animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="18s" repeatCount="indefinite"/></g>`;
      front += sparkles(9, '#fff6c2', base);
      anim = `<animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.6s" repeatCount="indefinite"/>`;
    } else if (it.rarity === 'epic') {
      front += sparkles(6, '#f0d2ff', base);
      anim = `<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="3s" repeatCount="indefinite"/>`;
    } else if (it.rarity === 'rare') {
      front += sparkles(3, '#d3e8ff', base);
    }
    if (level >= 3) front += sparkles(level === 4 ? 8 : 4, level === 4 ? '#ffe58a' : '#ffffff', base + 7);
  }
  // pedestal
  const pg = 'ped' + base;
  d.push(`<linearGradient id="${pg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${locked ? '#3a3f5c' : R.ped[0]}"/><stop offset="1" stop-color="${locked ? '#24283d' : R.ped[1]}"/></linearGradient>`);
  const ring = level === 4 ? '#ffd23d' : level === 3 ? '#e6ebff' : 'rgba(255,255,255,.25)';
  const ped = `<ellipse cx="100" cy="196" rx="70" ry="14" fill="rgba(0,0,0,.35)"/>
    <path d="M38 178 L38 192 Q100 214 162 192 L162 178 Z" fill="url(#${pg})" stroke="${O}" stroke-width="${SW}"/>
    <ellipse cx="100" cy="178" rx="62" ry="13" fill="url(#${pg})" stroke="${O}" stroke-width="${SW}"/>
    <ellipse cx="100" cy="178" rx="50" ry="8" fill="none" stroke="${ring}" stroke-width="${level >= 3 ? 3 : 2}"/>
    ${!locked && level > 1 ? Array.from({length: level}, (_, i) => star(100 + (i - (level - 1) / 2) * 15, 196, 5.5, level === 4 ? '#ffd23d' : level === 3 ? '#e6ebff' : '#9fb0e8')).join('') : ''}`;
  const fig = `<g transform="translate(0 12)">${body}</g>`;
  const inner = locked
    ? `<g filter="url(#sil${base})" opacity=".85">${fig}</g><text x="100" y="105" font-size="44" font-weight="900" text-anchor="middle" fill="#8a90b8" font-family="Rubik, Arial">?</text>`
    : `<g>${fig}${anim}</g>`;
  if (locked) d.push(`<filter id="sil${base}"><feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.18  0 0 0 0 0.28  0 0 0 1 0"/></filter>`);
  const size = opts.size || 160;
  return `<svg viewBox="0 -6 200 222" width="${size}" height="${size * 1.11}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible"><defs>${d.join('')}</defs>${back}${ped}${inner}${front}</svg>`;
}

window.FIGURES = {SERIES, RARITY, ITEMS, byId, svg, levelOf, nextLevelAt, LEVELS};
})();
