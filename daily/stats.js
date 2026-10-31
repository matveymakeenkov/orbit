// Прогресс игроков: серия и заморозки, опыт и ранги, значки, медали, корона, сезоны.
// Всё считается из таблицы results, поэтому одинаково у всех и не подделывается.
(function (root) {
'use strict';

const MSK = 3 * 3600e3, DAY = 864e5;
const weekday = d => (d + 3) % 7;                 // Пн = 0
const weekStart = d => d - weekday(d);
const isRic = d => weekday(d) % 2 === 1;          // Вт, Чт, Сб
const dateOf = d => new Date(d * DAY);            // UTC-полночь дня (MSK-день)
const monthKey = d => { const t = dateOf(d); return t.getUTCFullYear() * 12 + t.getUTCMonth(); };
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const monthName = k => MONTHS[k % 12] + ' ' + Math.floor(k / 12);
const mskHour = iso => new Date(new Date(iso).getTime() + MSK).getUTCHours();

const RANKS = [
  {name: 'Новичок', xp: 0, color: '#e8eaff'},
  {name: 'Водитель', xp: 150, color: '#3ddc97'},
  {name: 'Механик', xp: 600, color: '#4da3ff'},
  {name: 'Инженер', xp: 1800, color: '#c86bff'},
  {name: 'Гроссмейстер', xp: 5000, color: '#ffc23d'},
  {name: 'Легенда', xp: 12000, color: 'rainbow'},
];

const TIERS = ['bronze', 'silver', 'gold'];
const TIER_XP = {bronze: 25, silver: 50, gold: 100};
const BADGES = [
  {id: 'perfect', icon: '⭐', name: 'Идеально', desc: 'Решить за минимальное число ходов', t: [1, 10, 50], unit: 'раз'},
  {id: 'streak', icon: '🔥', name: 'Серия', desc: 'Лучшая серия дней подряд', t: [7, 30, 100], unit: 'дн.'},
  {id: 'boss', icon: '🧠', name: 'Босс повержен', desc: 'Идеально решить воскресного босса', t: [1, 5, 20], unit: 'раз'},
  {id: 'lightning', icon: '⚡', name: 'Молния', desc: 'Идеально и быстрее всех за день', t: [1, 5, 20], unit: 'раз'},
  {id: 'sniper', icon: '🎯', name: 'Снайпер', desc: '«Рикошет» идеально несколько раз подряд', t: [3, 6, 10], unit: 'подряд'},
  {id: 'rushking', icon: '🚗', name: 'Король пробок', desc: '«Пробка» идеально несколько раз подряд', t: [3, 6, 10], unit: 'подряд'},
  {id: 'fullweek', icon: '📅', name: 'Полная неделя', desc: 'Решить все 7 задач недели', t: [1, 4, 12], unit: 'нед.'},
  {id: 'gold', icon: '🥇', name: 'Медалист', desc: 'Золото дня (от двух участников)', t: [5, 25, 100], unit: 'золотых'},
  {id: 'crown', icon: '👑', name: 'Коронация', desc: 'Выиграть неделю', t: [1, 5, 20], unit: 'нед.'},
];
const HIDDEN = [
  {id: 'owl', icon: '🌙', name: 'Сова', desc: 'Решить задачу между полуночью и четырьмя утра'},
  {id: 'turtle', icon: '🐢', name: 'Черепаха', desc: 'Самое долгое решение дня (от трёх участников)'},
  {id: 'revenge', icon: '🗡️', name: 'Реванш', desc: 'Вчера друг был выше, сегодня — ты'},
  {id: 'speedy', icon: '🪄', name: 'Без раздумий', desc: 'Идеальное решение меньше чем за минуту'},
  {id: 'pioneer', icon: '🧭', name: 'Первопроходец', desc: 'Первым решить задачу дня (от двух участников)'},
];

const COSMETICS = {
  frame: [
    {id: 'none', name: 'Без рамки', rank: 0},
    {id: 'blue', name: 'Синяя', rank: 2},
    {id: 'violet', name: 'Фиолетовая', rank: 3},
    {id: 'gold', name: 'Золотая', rank: 4},
    {id: 'rainbow', name: 'Радужная', rank: 5},
  ],
  cars: [
    {id: 'classic', name: 'Классика', rank: 0},
    {id: 'neon', name: 'Неон', rank: 1},
    {id: 'pastel', name: 'Пастель', rank: 3},
    {id: 'gold', name: 'Золото', rank: 4},
  ],
  robots: [
    {id: 'classic', name: 'Классика', rank: 0},
    {id: 'glossy', name: 'Глянец', rank: 2},
    {id: 'chrome', name: 'Хром', rank: 4},
  ],
  board: [
    {id: 'classic', name: 'Классика', rank: 0},
    {id: 'midnight', name: 'Полночь', rank: 1},
    {id: 'mint', name: 'Мята', rank: 2},
    {id: 'sunset', name: 'Закат', rank: 3},
    {id: 'galaxy', name: 'Галактика', rank: 5},
  ],
};

function rankOf(xp) {
  let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const next = RANKS[i + 1] || null;
  return {index: i, ...RANKS[i], next, progress: next ? (xp - RANKS[i].xp) / (next.xp - RANKS[i].xp) : 1};
}
const tierOf = (b, v) => { let t = null; b.t.forEach((x, i) => { if (v >= x) t = TIERS[i]; }); return t; };

// Серия с заморозками. Заморозка выдаётся за каждые 7 дней серии (не больше двух в запасе)
// и тратится сама за пропущенный день. Сегодня, пока не решено, серию не рвёт.
function streakInfo(daysSet, today) {
  const days = [...daysSet].sort((a, b) => a - b);
  const res = {current: 0, best: 0, freezes: 0, frozen: new Set(), atDay: new Map()};
  if (!days.length) return res;
  let streak = 0, freezes = 0, since = 0;
  for (let d = days[0]; d <= today; d++) {
    if (daysSet.has(d)) {
      streak++; since++;
      if (since === 7) { freezes = Math.min(2, freezes + 1); since = 0; }
      res.atDay.set(d, streak);
    } else if (d === today) {
      // ещё есть время
    } else if (freezes > 0) {
      freezes--; res.frozen.add(d);
    } else {
      streak = 0; since = 0;
    }
    res.best = Math.max(res.best, streak);
  }
  res.current = streak; res.freezes = freezes;
  return res;
}

// main: compute everything for all players
// results: [{user_id, day, moves, par, points, duration_ms, undos, created_at}]
function compute(results, profiles, today) {
  const players = new Map();
  for (const p of profiles) players.set(p.id, {id: p.id, profile: p, res: [], byDay: new Map()});
  for (const r of results) {
    if (!players.has(r.user_id)) continue;
    const pl = players.get(r.user_id); pl.res.push(r); pl.byDay.set(r.day, r);
  }
  // ---- per-day rankings ----
  const days = new Map();
  for (const r of results) { if (!days.has(r.day)) days.set(r.day, []); days.get(r.day).push(r); }
  const medals = new Map(); // user -> {gold, silver, bronze}
  const dayRank = new Map(); // `${day}:${user}` -> place
  const events = []; // feed
  const add = (u, k) => { if (!medals.has(u)) medals.set(u, {gold: 0, silver: 0, bronze: 0, lightning: 0, turtle: 0, pioneer: 0}); medals.get(u)[k]++; };
  for (const [d, list] of days) {
    list.sort((a, b) => a.moves - b.moves || a.duration_ms - b.duration_ms);
    list.forEach((r, i) => dayRank.set(d + ':' + r.user_id, i + 1));
    const settled = d < today; // сегодняшние медали предварительные — считаем только завершённые дни
    if (list.length >= 2 && settled) {
      add(list[0].user_id, 'gold'); if (list[1]) add(list[1].user_id, 'silver'); if (list[2]) add(list[2].user_id, 'bronze');
      const perf = list.filter(r => r.moves === r.par);
      if (perf.length) add(perf[0].user_id, 'lightning');
      const first = list.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
      add(first.user_id, 'pioneer');
    }
    if (list.length >= 3 && settled) add(list.slice().sort((a, b) => b.duration_ms - a.duration_ms)[0].user_id, 'turtle');
  }
  // ---- weeks: winners (crown) ----
  const weekPts = new Map(); // ws -> Map(user->pts)
  for (const r of results) {
    const ws = weekStart(r.day); if (!weekPts.has(ws)) weekPts.set(ws, new Map());
    const m = weekPts.get(ws); m.set(r.user_id, (m.get(r.user_id) || 0) + r.points);
  }
  const weekWinner = new Map();
  for (const [ws, m] of weekPts) {
    if (ws + 7 > today) continue;
    const arr = [...m].sort((a, b) => b[1] - a[1]);
    if (arr.length >= 2 && arr[0][1] > arr[1][1]) weekWinner.set(ws, arr[0][0]);
    else if (arr.length >= 2 && arr[0][1] === arr[1][1]) weekWinner.set(ws, null); // ничья — без короны
  }
  const crownHolder = weekWinner.get(weekStart(today) - 7) || null;
  // ---- seasons (months) ----
  const seasonPts = new Map();
  for (const r of results) {
    const k = monthKey(r.day); if (!seasonPts.has(k)) seasonPts.set(k, new Map());
    const m = seasonPts.get(k); m.set(r.user_id, (m.get(r.user_id) || 0) + r.points);
  }
  const curMonth = monthKey(today);
  const champions = new Map(); // user -> [monthKey]
  for (const [k, m] of seasonPts) {
    if (k >= curMonth) continue;
    const arr = [...m].sort((a, b) => b[1] - a[1]);
    if (arr.length >= 2 && arr[0][1] > arr[1][1]) { const u = arr[0][0]; if (!champions.has(u)) champions.set(u, []); champions.get(u).push(k); }
  }

  // ---- per player ----
  const out = new Map();
  for (const pl of players.values()) {
    const set = new Set(pl.res.map(r => r.day));
    const st = streakInfo(set, today);
    const sorted = pl.res.slice().sort((a, b) => a.day - b.day);
    const v = {perfect: 0, streak: st.best, boss: 0, lightning: 0, sniper: 0, rushking: 0, fullweek: 0, gold: 0, crown: 0};
    let xp = 0;
    let runRic = 0, runRush = 0, lastRic = null, lastRush = null;
    const hidden = new Set();
    for (const r of sorted) {
      const perfect = r.moves === r.par;
      if (perfect) v.perfect++;
      if (perfect && weekday(r.day) === 6) v.boss++;
      if (perfect && r.duration_ms > 0 && r.duration_ms < 60000) hidden.add('speedy');
      if (r.created_at && mskHour(r.created_at) < 4) hidden.add('owl');
      xp += 10 + Math.floor(r.points / 10) + Math.min(st.atDay.get(r.day) || 0, 10);
      // подряд идеальные: пропуск дня этого типа рвёт серию
      if (isRic(r.day)) {
        const prevRic = r.day - (weekday(r.day) === 1 ? 3 : 2);
        runRic = perfect ? (lastRic === prevRic ? runRic + 1 : 1) : 0; lastRic = perfect ? r.day : null;
        v.sniper = Math.max(v.sniper, runRic);
      } else {
        const wd = weekday(r.day), prevRush = r.day - (wd === 0 ? 1 : 2);
        runRush = perfect ? (lastRush === prevRush ? runRush + 1 : 1) : 0; lastRush = perfect ? r.day : null;
        v.rushking = Math.max(v.rushking, runRush);
      }
      // реванш
      const y = pl.byDay.get(r.day - 1);
      if (y && r.day - 1 < today) {
        for (const other of players.values()) {
          if (other.id === pl.id) continue;
          const oy = dayRank.get((r.day - 1) + ':' + other.id), my = dayRank.get((r.day - 1) + ':' + pl.id);
          const ot = dayRank.get(r.day + ':' + other.id), mt = dayRank.get(r.day + ':' + pl.id);
          if (oy && my && ot && mt && oy < my && mt < ot && r.day < today) hidden.add('revenge');
        }
      }
    }
    // полные недели
    const weeks = new Map();
    for (const d of set) weeks.set(weekStart(d), (weeks.get(weekStart(d)) || 0) + 1);
    for (const [, c] of weeks) if (c === 7) v.fullweek++;
    const m = medals.get(pl.id) || {gold: 0, silver: 0, bronze: 0, lightning: 0, turtle: 0, pioneer: 0};
    v.gold = m.gold; v.lightning = m.lightning;
    if (m.turtle) hidden.add('turtle');
    if (m.pioneer) hidden.add('pioneer');
    for (const [, u] of weekWinner) if (u === pl.id) v.crown++;
    // badges
    const badges = BADGES.map(b => ({...b, value: v[b.id], tier: tierOf(b, v[b.id]), next: b.t.find(x => x > v[b.id]) || null}));
    for (const b of badges) if (b.tier) for (let i = 0; i <= TIERS.indexOf(b.tier); i++) xp += TIER_XP[TIERS[i]];
    const hiddenList = HIDDEN.map(h => ({...h, got: hidden.has(h.id)}));
    xp += hidden.size * 50;
    const rank = rankOf(xp);
    const ws = weekStart(today);
    out.set(pl.id, {
      id: pl.id, profile: pl.profile, results: sorted, byDay: pl.byDay,
      streak: st.current, bestStreak: st.best, freezes: st.freezes, frozen: st.frozen,
      xp, rank, badges, hidden: hiddenList, medals: m, values: v,
      solvedToday: set.has(today),
      weekPoints: (weekPts.get(ws) && weekPts.get(ws).get(pl.id)) || 0,
      seasonPoints: (seasonPts.get(curMonth) && seasonPts.get(curMonth).get(pl.id)) || 0,
      champion: champions.get(pl.id) || [],
      crown: crownHolder === pl.id,
      solved: sorted.length,
    });
  }
  return {players: out, weekWinner, crownHolder, champions, seasonPts, curMonth, dayRank};
}

// Сундуки, которые игрок может открыть, но ещё не открыл
function availableChests(me, opened, today) {
  const has = (k, p) => opened.some(c => c.kind === k && c.period === p);
  const list = [];
  if (me && me.results.length && !has('welcome', 0)) list.push({kind: 'welcome', period: 0, tier: 'welcome'});
  if (me) {
    const cur = weekStart(today);
    for (let ws = cur - 7; ws >= cur - 7 * 8; ws -= 7) {
      const rs = me.results.filter(r => r.day >= ws && r.day <= ws + 6);
      const solved = rs.length, perfect = rs.filter(r => r.moves === r.par).length;
      const tier = solved === 7 && perfect >= 3 ? 'legendary' : solved === 7 ? 'rare' : solved >= 5 ? 'common' : null;
      if (tier && !has('weekly', ws)) list.push({kind: 'weekly', period: ws, tier});
    }
  }
  return list;
}
// прогноз сундука текущей недели
function weekChestForecast(me, today) {
  const ws = weekStart(today);
  const rs = me ? me.results.filter(r => r.day >= ws) : [];
  const solved = rs.length, perfect = rs.filter(r => r.moves === r.par).length;
  const left = 7 - weekday(today) - (me && me.solvedToday ? 1 : 0);
  return {solved, perfect, left, tier: solved === 7 && perfect >= 3 ? 'legendary' : solved === 7 ? 'rare' : solved >= 5 ? 'common' : null};
}

const API = {compute, streakInfo, rankOf, availableChests, weekChestForecast, RANKS, BADGES, HIDDEN, TIERS, COSMETICS,
  weekday, weekStart, monthKey, monthName, MONTHS_GEN, isRic};
if (typeof module !== 'undefined') module.exports = API; else root.STATS = API;
})(this);
