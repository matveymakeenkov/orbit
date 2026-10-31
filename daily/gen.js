// Генератор ежедневных головоломок: «Пробка» (rush hour) и «Рикошет» (ricochet robots).
// Для каждой головоломки решатель (BFS) находит минимальное число ходов — par.
// Usage: node gen.js START_DAY COUNT > puzzles.js
'use strict';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------------- Rush hour ----------------
// car: [horizontal(0/1), len, fixedLine, pos]; car 0 = red, horizontal, row 2. Solved when pos == 4.
const N = 6;
function rushOcc(cars, pos, skip) {
  const g = new Uint8Array(36);
  for (let i = 0; i < cars.length; i++) {
    if (i === skip) continue;
    const [h, len, line] = cars[i], p = pos[i];
    for (let k = 0; k < len; k++) g[h ? line * N + p + k : (p + k) * N + line] = 1;
  }
  return g;
}
function rushNeighbors(cars, pos, out) {
  out.length = 0;
  const g = rushOcc(cars, pos, -1);
  for (let i = 0; i < cars.length; i++) {
    const [h, len, line] = cars[i], p = pos[i];
    const cellAt = q => h ? line * N + q : q * N + line;
    for (let q = p - 1; q >= 0 && !g[cellAt(q)]; q--) { const np = pos.slice(); np[i] = q; out.push(np); }
    for (let q = p + len; q < N && !g[cellAt(q)]; q++) { const np = pos.slice(); np[i] = q - len + 1; out.push(np); }
  }
  return out;
}
const enc = pos => { let k = 0; for (let i = pos.length - 1; i >= 0; i--) k = k * 6 + pos[i]; return k; };

function genRushCandidate(rng) {
  for (;;) {
    const cars = [], pos = [];
    const g = new Uint8Array(36);
    const place = (h, len, line, p) => {
      for (let k = 0; k < len; k++) { const c = h ? line * N + p + k : (p + k) * N + line; if (g[c]) return false; }
      for (let k = 0; k < len; k++) g[h ? line * N + p + k : (p + k) * N + line] = 1;
      cars.push([h, len, line]); pos.push(p); return true;
    };
    place(1, 2, 2, Math.floor(rng() * 3));
    const want = 9 + Math.floor(rng() * 5);
    let tries = 0;
    while (cars.length < want && tries++ < 300) {
      const h = rng() < 0.5 ? 1 : 0, len = rng() < 0.28 ? 3 : 2;
      const line = Math.floor(rng() * N);
      if (h && line === 2) continue;
      place(h, len, line, Math.floor(rng() * (N - len + 1)));
    }
    if (cars.length >= 8) return {cars, pos};
  }
}

function analyzeRush(cars, pos0, cap = 250000) {
  const seen = new Map(); const states = [pos0]; seen.set(enc(pos0), 0);
  const nb = [];
  for (let i = 0; i < states.length; i++) {
    if (states.length > cap) return null;
    for (const s of rushNeighbors(cars, states[i], nb)) { const k = enc(s); if (!seen.has(k)) { seen.set(k, states.length); states.push(s); } }
  }
  const dist = new Int32Array(states.length).fill(-1); let q = [];
  states.forEach((s, i) => { if (s[0] === 4) { dist[i] = 0; q.push(i); } });
  if (!q.length) return null;
  let best = q[0];
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    if (dist[i] > dist[best]) best = i;
    for (const s of rushNeighbors(cars, states[i], nb)) { const j = seen.get(enc(s)); if (dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); } }
  }
  return {pos: states[best], par: dist[best], size: states.length};
}

function makeRushPuzzle(rng, lo, hi) {
  let best = null, bestScore = -1e9;
  for (let a = 0; a < 600; a++) {
    const {cars, pos} = genRushCandidate(rng);
    const r = analyzeRush(cars, pos);
    if (!r) continue;
    // score: inside [lo,hi] best; prefer higher par inside range
    const score = r.par >= lo && r.par <= hi ? 1000 + r.par : -Math.min(Math.abs(r.par - lo), Math.abs(r.par - hi));
    if (score > bestScore) { bestScore = score; best = {cars, pos: r.pos, par: r.par}; }
    if (score >= 1000 && a > 40) break;
  }
  return {t: 'rush', par: best.par, cars: best.cars.map((c, i) => [c[0], c[1], c[2], best.pos[i]])};
}

// ---------------- Ricochet robots ----------------
// 8x8, walls bitmask N1 E2 S4 W8, centre 2x2 blocked. 4 robots, robot 0 must stop on target.
const M = 8, DN = 1, DE = 2, DS = 4, DW = 8;
const STEP = [[-1, 0, DN], [0, 1, DE], [1, 0, DS], [0, -1, DW]];
const OPP = {1: 4, 2: 8, 4: 1, 8: 2};
const CENTER = [27, 28, 35, 36];

function genRicBoard(rng) {
  const w = new Uint8Array(64);
  const add = (c, d) => {
    w[c] |= d; const r = c >> 3, k = c & 7;
    const [dr, dc] = d === DN ? [-1, 0] : d === DE ? [0, 1] : d === DS ? [1, 0] : [0, -1];
    const nr = r + dr, nc = k + dc;
    if (nr >= 0 && nr < M && nc >= 0 && nc < M) w[nr * M + nc] |= OPP[d];
  };
  for (let i = 0; i < M; i++) { add(i, DN); add(56 + i, DS); add(i * M, DW); add(i * M + 7, DE); }
  // centre block
  add(27, DN); add(28, DN); add(27, DW); add(35, DW); add(28, DE); add(36, DE); add(35, DS); add(36, DS);
  // L-shaped corners
  const nCorners = 9 + Math.floor(rng() * 4);
  const used = new Set(CENTER);
  let made = 0, guard = 0;
  while (made < nCorners && guard++ < 500) {
    const c = Math.floor(rng() * 64); const r = c >> 3, k = c & 7;
    if (used.has(c) || r === 0 && k === 0 || r === 0 && k === 7 || r === 7 && k === 0 || r === 7 && k === 7) continue;
    const pairs = [[DN, DE], [DE, DS], [DS, DW], [DW, DN]];
    const [a, b] = pairs[Math.floor(rng() * 4)];
    add(c, a); add(c, b); used.add(c); made++;
    for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const nr = r + dr, nc = k + dc; if (nr >= 0 && nr < M && nc >= 0 && nc < M) used.add(nr * M + nc); }
  }
  // edge walls (one per side)
  for (let s = 0; s < 4; s++) {
    const i = 1 + Math.floor(rng() * 6);
    if (s === 0) add(i, DE); else if (s === 1) add(56 + i, DE); else if (s === 2) add(i * M, DS); else add(i * M + 7, DS);
  }
  return w;
}

function ricSlide(w, rob, i, d) {
  let c = rob[i];
  const [dr, dc, bit] = STEP[d];
  for (;;) {
    if (w[c] & bit) break;
    const n = c + dr * M + dc;
    if (rob[0] === n || rob[1] === n || rob[2] === n || rob[3] === n) break;
    c = n;
  }
  return c;
}

const ricVisited = new Uint8Array(1 << 24);
function analyzeRic(w, rob0, maxDepth = 11, cap = 4000000) {
  ricVisited.fill(0);
  const key = r => r[0] | r[1] << 6 | r[2] << 12 | r[3] << 18;
  let frontier = [key(rob0)]; ricVisited[key(rob0)] = 1;
  const first = new Int16Array(64).fill(-1); first[rob0[0]] = 0;
  let total = 1;
  const rob = [0, 0, 0, 0];
  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next = [];
    for (const k of frontier) {
      for (let i = 0; i < 4; i++) {
        rob[0] = k & 63; rob[1] = k >> 6 & 63; rob[2] = k >> 12 & 63; rob[3] = k >> 18 & 63;
        for (let d = 0; d < 4; d++) {
          const nc = ricSlide(w, rob, i, d);
          if (nc === rob[i]) continue;
          const save = rob[i]; rob[i] = nc;
          const nk = key(rob);
          if (!ricVisited[nk]) { ricVisited[nk] = 1; next.push(nk); if (i === 0 && first[nc] < 0) first[nc] = depth; }
          rob[i] = save;
        }
      }
    }
    total += next.length; frontier = next;
    if (total > cap) break;
  }
  return first;
}

function makeRicPuzzle(rng, lo, hi) {
  let best = null, bestScore = -1e9;
  for (let a = 0; a < 40; a++) {
    const w = genRicBoard(rng);
    const free = []; for (let c = 0; c < 64; c++) if (!CENTER.includes(c)) free.push(c);
    const rob = [];
    while (rob.length < 4) { const c = free[Math.floor(rng() * free.length)]; if (!rob.includes(c)) rob.push(c); }
    const first = analyzeRic(w, rob, hi + 1);
    const cands = [];
    for (let c = 0; c < 64; c++) if (first[c] >= lo && first[c] <= hi) cands.push(c);
    if (cands.length) {
      const top = Math.max(...cands.map(c => first[c]));
      const tops = cands.filter(c => first[c] === top);
      const target = tops[Math.floor(rng() * tops.length)];
      const score = 1000 + top;
      if (score > bestScore) { bestScore = score; best = {w, rob, target, par: top}; }
      if (a > 6) break;
    } else {
      let mx = 0, mc = -1; for (let c = 0; c < 64; c++) if (first[c] > mx) { mx = first[c]; mc = c; }
      const score = mx - lo;
      if (mc >= 0 && score > bestScore) { bestScore = score; best = {w, rob, target: mc, par: mx}; }
    }
  }
  return {t: 'ric', par: best.par, walls: Array.from(best.w, x => x.toString(16)).join(''), robots: best.rob, target: best.target};
}

// ---------------- schedule ----------------
// weekday Mon=0..Sun=6
const SCHEDULE = [
  ['rush', 8, 11],   // Пн
  ['ric', 4, 5],     // Вт
  ['rush', 11, 14],  // Ср
  ['ric', 6, 7],     // Чт
  ['rush', 14, 18],  // Пт
  ['ric', 7, 9],     // Сб
  ['rush', 18, 26],  // Вс
];

const START = +process.argv[2], COUNT = +process.argv[3];
const list = [];
for (let i = 0; i < COUNT; i++) {
  const day = START + i, wd = (day + 3) % 7;
  const rng = mulberry32(day * 2654435761 >>> 0);
  const [t, lo, hi] = SCHEDULE[wd];
  const p = t === 'rush' ? makeRushPuzzle(rng, lo, hi) : makeRicPuzzle(rng, lo, hi);
  list.push(p);
  process.stderr.write(`${day} wd${wd} ${t} par=${p.par}\n`);
}
process.stdout.write('window.DAILY_PUZZLES=' + JSON.stringify({start: START, list}) + ';\n');
