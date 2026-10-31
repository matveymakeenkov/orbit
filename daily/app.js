(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const F = window.FIGURES, ST = window.STATS;

// ---------- day math (Moscow time for everyone) ----------
const MSK = 3 * 3600e3, DAY = 864e5;
const today = () => Math.floor((Date.now() + MSK) / DAY);
const weekday = d => (d + 3) % 7;
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const LEVEL = ['Разминка', 'Лёгкая', 'Средняя', 'Средняя+', 'Сложная', 'Сложная+', 'Босс недели'];
const P = window.DAILY_PUZZLES || {start: 0, list: []};
let D = today();
const puzzleOf = d => P.list[d - P.start] || null;
const pts = (par, moves, d) => Math.round(100 * par / moves) * (weekday(d) === 6 ? 2 : 1);
function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; }
const fmtTime = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const dstr = d => { const t = new Date(d * DAY); return String(t.getUTCDate()).padStart(2, '0') + '.' + String(t.getUTCMonth() + 1).padStart(2, '0'); };
const RCOL = {common: '#9aa4c7', rare: '#4da3ff', epic: '#c86bff', legendary: '#ffc23d'};
const RADJ = {common: 'обычная', rare: 'редкая', epic: 'эпическая', legendary: 'легендарная'};
const TIERCOL = {bronze: '#d08a4f', silver: '#c9d1ec', gold: '#ffd23d'};
const TIERNAME = {bronze: 'бронза', silver: 'серебро', gold: 'золото'};
const CHEST_NAME = {welcome: 'Стартовый сундук', common: 'Обычный сундук', rare: 'Редкий сундук', legendary: 'Легендарный сундук'};

function toast(html, ms = 2600) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
  $('toasts').appendChild(t); setTimeout(() => t.remove(), ms);
}

// ---------- Supabase ----------
const CFG = window.DAILY_CONFIG || {};
let sb = null;
if (CFG.supabaseUrl && CFG.supabaseKey && window.supabase) sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
else $('offline').style.display = '';

const RU_ERR = [
  [/invalid login/i, 'Неверная почта или пароль'],
  [/already registered|already exists/i, 'Эта почта уже зарегистрирована — войдите'],
  [/at least 6|password should/i, 'Пароль должен быть не короче 6 символов'],
  [/email not confirmed/i, 'Почта не подтверждена — проверьте письмо'],
  [/rate limit|too many/i, 'Слишком много попыток, подождите минуту'],
  [/invalid.*email|email.*invalid/i, 'Проверьте адрес почты'],
  [/duplicate key.*username|profiles_username/i, 'Этот никнейм уже занят'],
  [/already opened/i, 'Этот сундук уже открыт'],
  [/not eligible/i, 'Этот сундук пока не заработан'],
  [/fetch|network/i, 'Нет связи с сервером'],
];
const ruErr = e => { const m = (e && (e.message || e.error_description)) || String(e); for (const [r, t] of RU_ERR) if (r.test(m)) return t; return m; };

// ---------- state ----------
const S = {user: null, profile: null, profiles: [], results: [], inv: [], chests: [], calc: null, summary: null, view: 'home', loaded: false};
const meCalc = () => S.calc && S.user ? S.calc.players.get(S.user.id) : null;
const myInv = () => S.user ? S.inv.filter(r => r.user_id === S.user.id) : [];
const invCount = id => { const r = myInv().find(x => x.item_id === id); return r ? r.count : 0; };
const profileOf = id => S.profiles.find(p => p.id === id);

async function fetchAll(table, cols) {
  let out = [], from = 0;
  for (;;) {
    const {data, error} = await sb.from(table).select(cols).range(from, from + 999);
    if (error) throw error;
    out = out.concat(data); if (data.length < 1000) break; from += 1000;
  }
  return out;
}
async function loadAll() {
  if (!sb || !S.user || !S.profile) return;
  try {
    const [profiles, results, inv, chests, sum] = await Promise.all([
      fetchAll('profiles', 'id,username,showcase,cosmetics'),
      fetchAll('results', 'user_id,day,moves,par,points,duration_ms,undos,created_at'),
      fetchAll('inventory', 'user_id,item_id,count,first_at'),
      fetchAll('chests', 'user_id,kind,period,tier,items,opened_at'),
      sb.rpc('today_summary'),
    ]);
    Object.assign(S, {profiles, results, inv, chests, summary: sum.data || null, loaded: true});
    S.profile = profiles.find(p => p.id === S.user.id) || S.profile;
    D = today();
    S.calc = ST.compute(results, profiles, D);
  } catch (e) { toast('Не удалось загрузить данные: ' + esc(ruErr(e))); }
}

// ---------- auth ----------
async function loadProfile() {
  if (!sb || !S.user) { S.profile = null; return; }
  const {data} = await sb.from('profiles').select('id,username,showcase,cosmetics').eq('id', S.user.id).maybeSingle();
  S.profile = data || null;
  if (!S.profile) {
    const wanted = (S.user.user_metadata && S.user.user_metadata.username) || '';
    if (wanted) {
      const {data: p, error} = await sb.from('profiles').insert({id: S.user.id, username: wanted}).select('id,username,showcase,cosmetics').single();
      if (!error) S.profile = p;
    }
  }
  if (!S.profile) openNick();
}
async function onAuth(session) {
  S.user = session ? session.user : null;
  S.calc = null; S.loaded = false;
  await loadProfile();
  if (S.profile) { await submitPending(); await loadAll(); }
  renderAll();
}
if (sb) {
  sb.auth.getSession().then(({data}) => onAuth(data.session));
  sb.auth.onAuthStateChange((ev, session) => {
    // вызывать Supabase прямо в этом колбэке нельзя — может зависнуть
    if (ev === 'SIGNED_IN' && (!S.user || S.user.id !== session.user.id)) setTimeout(() => onAuth(session), 0);
    if (ev === 'SIGNED_OUT') setTimeout(() => onAuth(null), 0);
  });
}

let signUp = false;
function openAuth(up) { setMode(!!up); $('aErr').textContent = ''; $('mAuth').classList.add('on'); }
function setMode(up) {
  signUp = up;
  $('aIn').classList.toggle('on', !up); $('aUp').classList.toggle('on', up);
  $('aNick').style.display = up ? '' : 'none'; $('aNick').required = up;
  $('aGo').textContent = up ? 'Создать аккаунт' : 'Войти';
  $('aPass').autocomplete = up ? 'new-password' : 'current-password';
}
$('aIn').onclick = () => setMode(false); $('aUp').onclick = () => setMode(true);
$('aClose').onclick = () => $('mAuth').classList.remove('on');
$('fAuth').onsubmit = async e => {
  e.preventDefault();
  const email = $('aEmail').value.trim(), password = $('aPass').value, nick = $('aNick').value.trim();
  $('aErr').textContent = ''; $('aGo').disabled = true;
  try {
    if (signUp) {
      if (nick.length < 2) throw new Error('Никнейм — от 2 символов');
      const {data, error} = await sb.auth.signUp({email, password, options: {data: {username: nick}}});
      if (error) throw error;
      if (!data.session) { $('aErr').style.color = 'var(--good)'; $('aErr').textContent = 'Готово! Подтвердите почту по ссылке из письма, затем войдите.'; return; }
    } else {
      const {error} = await sb.auth.signInWithPassword({email, password});
      if (error) throw error;
    }
    $('mAuth').classList.remove('on');
  } catch (err) { $('aErr').style.color = ''; $('aErr').textContent = ruErr(err); }
  finally { $('aGo').disabled = false; }
};
function openNick() { $('nErr').textContent = ''; $('nNick').value = S.profile ? S.profile.username : ''; $('mNick').classList.add('on'); }
$('fNick').onsubmit = async e => {
  e.preventDefault();
  const username = $('nNick').value.trim();
  const q = S.profile
    ? sb.from('profiles').update({username}).eq('id', S.user.id)
    : sb.from('profiles').insert({id: S.user.id, username});
  const {error} = await q.select('id,username,showcase,cosmetics').single().then(r => { if (!r.error) S.profile = r.data; return r; });
  if (error) { $('nErr').textContent = ruErr(error); return; }
  $('mNick').classList.remove('on');
  await submitPending(); await loadAll(); renderAll();
};

// ---------- local progress ----------
const progKey = d => 'daily-prog-' + d;
const getProg = d => LS.get(progKey(d), null);
const setProg = (d, p) => LS.set(progKey(d), p);
async function submitPending() {
  if (!sb || !S.user || !S.profile) return;
  for (const d of [D - 1, D]) {
    const p = getProg(d);
    if (!p || !p.done || p.sent) continue;
    const {error} = await sb.from('results').insert({user_id: S.user.id, day: d, moves: p.moves, par: p.par, duration_ms: p.ms, undos: p.undos || 0});
    if (!error || error.code === '23505') { p.sent = true; delete p.sendErr; setProg(d, p); }
    else { p.sendErr = ruErr(error); setProg(d, p); }
  }
}

// ---------- common bits ----------
function cosmeticOf(pid, kind) {
  const p = profileOf(pid) || (S.profile && S.profile.id === pid ? S.profile : null);
  const c = S.calc && S.calc.players.get(pid);
  const want = p && p.cosmetics && p.cosmetics[kind];
  const opt = ST.COSMETICS[kind].find(o => o.id === want);
  if (!opt || !c || c.rank.index < opt.rank) return ST.COSMETICS[kind][0].id;
  return opt.id;
}
function avatar(pid, size = 38) {
  const p = profileOf(pid) || {};
  const c = S.calc && S.calc.players.get(pid);
  const fig = (p.showcase || [])[0];
  const frame = cosmeticOf(pid, 'frame');
  const inner = fig && F.byId[fig] ? F.svg(fig, {size: size * 1.2}) : `<span style="font-size:${size * .45}px">${esc((p.username || '?')[0].toUpperCase())}</span>`;
  return `<div class="av f-${frame}" style="width:${size}px;height:${size}px"><div class="in">${inner}</div>${c && c.crown ? '<span class="crown">👑</span>' : ''}</div>`;
}
function nameHTML(pid) {
  const p = profileOf(pid) || {}, c = S.calc && S.calc.players.get(pid);
  const col = c ? c.rank.color : '#eef0ff';
  return col === 'rainbow' ? `<span class="rainbow-text">${esc(p.username)}</span>` : `<span style="color:${col}">${esc(p.username)}</span>`;
}
function chestSVG(tier, size = 220) {
  const C = {welcome: ['#4fe0cc', '#14796d', '#ffd23d', '#0b4a42'], common: ['#d9965a', '#7a4a22', '#dfe5f7', '#4a2c14'],
    rare: ['#5c9cff', '#1f4796', '#ffd23d', '#122a5c'], legendary: ['#ffe17a', '#c27a0a', '#ffffff', '#7a4a06']}[tier] || ['#d9965a', '#7a4a22', '#dfe5f7', '#4a2c14'];
  const id = 'ch' + Math.random().toString(36).slice(2, 8), O = '#1b1d2e';
  const gems = tier === 'legendary' ? `<circle cx="70" cy="132" r="7" fill="#ff4d6d" stroke="${O}" stroke-width="2.5"/><circle cx="150" cy="132" r="7" fill="#4da3ff" stroke="${O}" stroke-width="2.5"/>` : '';
  return `<svg viewBox="0 0 220 200" width="${size}" height="${size * 200 / 220}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C[0]}"/><stop offset="1" stop-color="${C[1]}"/></linearGradient>
    <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="${C[2]}"/><stop offset="1" stop-color="${C[3]}"/></linearGradient>
    <radialGradient id="${id}g"><stop offset="0" stop-color="#fff6c2"/><stop offset="1" stop-color="#fff6c2" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="110" cy="186" rx="86" ry="12" fill="rgba(0,0,0,.4)"/>
    <ellipse cx="110" cy="96" rx="70" ry="30" fill="url(#${id}g)" opacity=".9"/>
    <rect x="28" y="88" width="164" height="92" rx="12" fill="url(#${id}b)" stroke="${O}" stroke-width="4"/>
    <path d="M28 112 L192 112" stroke="${O}" stroke-width="3" opacity=".35"/><path d="M28 140 L192 140" stroke="${O}" stroke-width="3" opacity=".25"/>
    <rect x="50" y="88" width="16" height="92" fill="url(#${id}t)" stroke="${O}" stroke-width="3"/><rect x="154" y="88" width="16" height="92" fill="url(#${id}t)" stroke="${O}" stroke-width="3"/>
    ${gems}
    <g class="lid">
      <path d="M24 92 L24 66 Q24 30 110 28 Q196 30 196 66 L196 92 Z" fill="url(#${id}b)" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M48 90 L48 50 Q50 36 58 33 L66 33 L66 90 Z M154 90 L154 33 L162 33 Q170 36 172 50 L172 90 Z" fill="url(#${id}t)" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="20" y="84" width="180" height="12" rx="5" fill="url(#${id}t)" stroke="${O}" stroke-width="3.5"/>
      <ellipse cx="88" cy="46" rx="26" ry="6" fill="#fff" opacity=".35" transform="rotate(-8 88 46)"/>
    </g>
    <rect x="94" y="94" width="32" height="38" rx="7" fill="url(#${id}t)" stroke="${O}" stroke-width="3.5"/>
    <circle cx="110" cy="109" r="5" fill="${O}"/><rect x="108" y="110" width="4" height="12" rx="2" fill="${O}"/>
  </svg>`;
}

// ---------- navigation ----------
document.querySelectorAll('#tabbar button').forEach(b => b.onclick = () => go(b.dataset.v));
let profileTarget = null;
function go(view, arg) {
  if (view === 'profile') profileTarget = arg || null;
  S.view = view;
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.v === view && !(view === 'profile' && profileTarget && S.user && profileTarget !== S.user.id)));
  $('vHome').style.display = view === 'home' ? '' : 'none';
  $('vCollection').style.display = view === 'collection' ? '' : 'none';
  $('vProfile').style.display = view === 'profile' ? '' : 'none';
  window.scrollTo(0, 0);
  renderAll();
}
function renderAll() {
  renderAcct();
  if (S.view === 'home') { renderHero(); renderChestSlot(); renderBoard(); renderFeed(); }
  if (S.view === 'collection') renderCollection();
  if (S.view === 'profile') renderProfile();
  const chests = S.calc ? ST.availableChests(meCalc(), S.chests.filter(c => c.user_id === S.user.id), D) : [];
  const btn = document.querySelector('#tabbar button[data-v="collection"]');
  btn.querySelector('.dot') && btn.querySelector('.dot').remove();
  if (chests.length) btn.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
}
function renderAcct() {
  const a = $('acct');
  if (!sb) { a.innerHTML = ''; return; }
  if (S.user && S.profile) {
    const c = meCalc();
    a.innerHTML = `${c ? `<span class="chip">🔥 ${c.streak}</span>` : ''}<button id="meBtn" style="display:flex">${avatar(S.user.id, 34)}</button>`;
    $('meBtn').onclick = () => go('profile');
  } else if (S.user) a.innerHTML = `<button class="ghost" id="logout">Выйти</button>`;
  else a.innerHTML = `<button class="ghost" id="login">Войти</button>`;
  const lo = $('logout'), li = $('login');
  if (lo) lo.onclick = () => sb.auth.signOut();
  if (li) li.onclick = () => openAuth(false);
}

// ---------- home ----------
function renderHero() {
  D = today();
  const pz = puzzleOf(D), wd = weekday(D);
  if (!pz) { $('hero').innerHTML = `<span class="tag">Вызов</span><h2>Головоломки закончились</h2><div class="muted">Нужно сгенерировать новый набор.</div>`; return; }
  const name = pz.t === 'rush' ? 'Пробка' : 'Рикошет';
  const desc = pz.t === 'rush'
    ? 'Двигайте машинки вдоль их направления и выведите красную к зелёному выезду справа.'
    : 'Роботы катятся до упора — до стены или другого робота. Остановите красного робота на мишени.';
  const p = getProg(D) || {}, done = p.done, c = meCalc();
  const nextIn = (D + 1) * DAY - MSK - Date.now();
  const h = Math.floor(nextIn / 3600e3), m = Math.floor(nextIn % 3600e3 / 60e3);
  const chips = [];
  if (c) chips.push(`<span class="chip">🔥 ${c.streak} ${plural(c.streak, 'день', 'дня', 'дней')}</span>`, `<span class="chip">🧊 ${c.freezes}</span>`);
  if (wd === 6) chips.push(`<span class="chip x2">×2 очки</span>`);
  if (c && !c.solvedToday && c.streak > 0) chips.push(`<span class="chip" style="color:#ffb84d">не дайте серии сгореть</span>`);
  $('hero').innerHTML = `
    <span class="tag">№${D - P.start + 1} · ${WD_FULL[wd]} · ${LEVEL[wd]}</span>
    <h2>${pz.t === 'rush' ? '🚗' : '🤖'} ${name}</h2>
    <div class="muted">${desc}</div>
    ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
    <div class="dots">${WD.map((_, i) => `<i class="${i <= wd ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row" style="margin-bottom:14px">
      <div class="stat"><div class="v">${pz.par}</div><div class="l">лучшее возможное</div></div>
      <div class="stat"><div class="v">${done ? p.moves : (p.moves || '—')}</div><div class="l">${done ? 'ваши ходы' : p.moves ? 'ходов сделано' : 'вы ещё не играли'}</div></div>
    </div>
    ${done
      ? `<div class="muted">Решено: <b style="color:var(--text)">${pts(pz.par, p.moves, D)} очков</b>. Следующая через ${h} ч ${m} мин.</div>
         ${sb && !S.user ? '<div style="margin-top:10px"><button class="btn wide" id="heroLogin">Войти и отправить результат</button></div>' : ''}
         ${p.sendErr ? `<div class="err" style="margin-top:8px">Не отправилось: ${esc(p.sendErr)}</div>` : ''}`
      : `<button class="btn wide" id="play">${p.moves ? 'Продолжить' : 'Играть'}</button>`}`;
  const pl = $('play'); if (pl) pl.onclick = startGame;
  const hl = $('heroLogin'); if (hl) hl.onclick = () => openAuth(false);
}

function renderChestSlot() {
  const el = $('chestSlot');
  const c = meCalc();
  if (!c) { el.innerHTML = ''; return; }
  const av = ST.availableChests(c, S.chests.filter(x => x.user_id === S.user.id), D);
  if (av.length) {
    const t = av[0];
    el.innerHTML = `<div class="chestban" id="chestBan"><div class="ic">${chestSVG(t.tier, 64)}</div><div style="flex:1"><b>${CHEST_NAME[t.tier]} ждёт!</b><div class="muted" style="color:#e9dcff">${t.kind === 'welcome' ? 'Подарок за первое решение' : 'Награда за неделю ' + dstr(t.period) + '–' + dstr(t.period + 6)}${av.length > 1 ? ` · и ещё ${av.length - 1}` : ''}</div></div><span style="font-size:22px">›</span></div>`;
    $('chestBan').onclick = () => openChest(t);
    return;
  }
  if (!c.results.length) {
    el.innerHTML = `<div class="chestban" id="chestBan"><div class="ic">${chestSVG('welcome', 64)}</div><div style="flex:1"><b>Решите первую задачу</b><div class="muted" style="color:#e9dcff">и получите стартовый сундук с двумя фигурками — одна точно редкая или лучше</div></div></div>`;
    $('chestBan').onclick = startGame;
    return;
  }
  const f = ST.weekChestForecast(c, D);
  const goal = f.solved >= 7 ? 7 : f.solved >= 5 ? 7 : 5;
  const label = f.tier ? `Сейчас: ${CHEST_NAME[f.tier].toLowerCase()}` : `До сундука: ${5 - f.solved} ${plural(5 - f.solved, 'день', 'дня', 'дней')}`;
  const reach = f.solved + f.left >= 5;
  el.innerHTML = `<div class="card" style="display:flex;gap:12px;align-items:center;padding:12px 14px"><div style="opacity:.9;flex:none">${chestSVG(f.tier || 'common', 52)}</div>
    <div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:6px"><span>Сундук недели</span><span class="muted small">${f.solved}/7</span></div>
    <div class="prog"><i style="width:${Math.min(100, f.solved / goal * 100)}%"></i></div>
    <div class="muted small" style="margin-top:5px">${reach ? label + ' · откроется в понедельник' : 'На этой неделе уже не успеть — следующая ваша!'}</div></div></div>`;
}

let tab = 'today';
document.querySelectorAll('#vHome .tabs button').forEach(b => b.onclick = () => {
  tab = b.dataset.t; document.querySelectorAll('#vHome .tabs button').forEach(x => x.classList.toggle('on', x === b)); renderBoard();
});
function row(pid, place, mid, val, extraCls = '') {
  const c = S.calc.players.get(pid);
  return `<div class="lr ${pid === S.user.id ? 'me' : ''} ${extraCls}" data-pid="${pid}"><div class="pl">${place}</div>${avatar(pid, 38)}
    <div class="nm"><b>${nameHTML(pid)}</b><span>${mid || (c.rank.name + (c.streak ? ' · 🔥 ' + c.streak : ''))}</span></div><div class="val">${val}</div></div>`;
}
function bindRows(el) { el.querySelectorAll('.lr').forEach(r => r.onclick = () => go('profile', r.dataset.pid)); }
function renderBoard() {
  const el = $('board');
  if (!sb) { el.innerHTML = `<div class="empty">Лидерборд появится после подключения онлайна.</div>`; return; }
  if (!S.user) { el.innerHTML = `<div class="empty">Войдите, чтобы соревноваться с друзьями, собирать фигурки и копить серию.<br><br><button class="btn" id="bLogin">Войти</button></div>`; $('bLogin').onclick = () => openAuth(false); return; }
  if (!S.calc) { el.innerHTML = `<div class="empty">Загрузка…</div>`; return; }
  const me = meCalc();
  const medal = i => ['🥇', '🥈', '🥉'][i] || (i + 1);
  if (tab === 'today') {
    if (!me.solvedToday) {
      const s = S.summary || {solved: 0};
      el.innerHTML = `<div class="empty">${s.solved ? `Сегодня уже решили: <b style="color:var(--text)">${s.solved}</b><br>Лучший результат — <b style="color:var(--text)">${s.best} ${plural(s.best, 'ход', 'хода', 'ходов')}</b>` : 'Сегодня ещё никто не решил. Будьте первым!'}<br><br>🔒 Имена откроются, когда решите сами</div>`;
      return;
    }
    const list = S.results.filter(r => r.day === D).sort((a, b) => a.moves - b.moves || a.duration_ms - b.duration_ms);
    el.innerHTML = `<div class="lb">${list.map((r, i) => row(r.user_id, medal(i), null, `${r.moves} ${r.moves === r.par ? '⭐' : ''}<small>${fmtTime(r.duration_ms)}</small>`)).join('')}</div>`;
  } else if (tab === 'week') {
    const ws = ST.weekStart(D);
    const list = [...S.calc.players.values()].filter(p => p.weekPoints > 0).sort((a, b) => b.weekPoints - a.weekPoints);
    if (!list.length) { el.innerHTML = `<div class="empty">На этой неделе результатов пока нет.</div>`; return; }
    const cell = (p, d) => { const r = p.byDay.get(d); return r ? `<span style="background:hsl(${Math.min(120, Math.round(r.points / (weekday(d) === 6 ? 2 : 1) * 1.2))},75%,58%)">${r.moves === r.par ? '★' : ''}</span>` : '<span></span>'; };
    el.innerHTML = `<div class="lb">${list.map((p, i) => row(p.id, medal(i), `<div class="wk">${[0, 1, 2, 3, 4, 5, 6].map(k => cell(p, ws + k)).join('')}</div>`, p.weekPoints)).join('')}</div>
      <div class="muted small" style="margin-top:8px">Победитель недели получит 👑 на всю следующую неделю.</div>`;
  } else {
    const k = S.calc.curMonth;
    const list = [...S.calc.players.values()].filter(p => p.seasonPoints > 0).sort((a, b) => b.seasonPoints - a.seasonPoints);
    const t = new Date(D * DAY), last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(), left = last - t.getUTCDate();
    const champs = [];
    for (const [u, ks] of S.calc.champions) ks.forEach(m => champs.push([m, u]));
    champs.sort((a, b) => b[0] - a[0]);
    el.innerHTML = `<div class="muted small" style="margin-bottom:6px">Сезон: <b style="color:var(--text)">${ST.monthName(k)}</b> · до конца ${left} ${plural(left, 'день', 'дня', 'дней')}. Победитель получит 🏆 кубок в профиль.</div>
      ${list.length ? `<div class="lb">${list.map((p, i) => row(p.id, medal(i), null, p.seasonPoints)).join('')}</div>` : '<div class="empty">В этом сезоне ещё нет результатов.</div>'}
      ${champs.length ? `<div style="margin-top:12px;font-weight:600">Зал славы</div>${champs.slice(0, 6).map(([m, u]) => `<div class="muted" style="margin-top:4px">🏆 ${ST.monthName(m)} — ${nameHTML(u)}</div>`).join('')}` : ''}`;
  }
  bindRows(el);
}

function renderFeed() {
  const card = $('feedCard');
  if (!S.calc) { card.style.display = 'none'; return; }
  const ev = [];
  for (const c of S.chests) for (const it of c.items || []) {
    const f = F.byId[it]; if (!f || f.rarity === 'common') continue;
    ev.push({t: new Date(c.opened_at).getTime(), icon: `<div class="fi">${F.svg(it, {size: 50})}</div>`, html: `${nameHTML(c.user_id)} — <b style="color:${RCOL[f.rarity]}">${f.name}</b> из сундука<small>${RADJ[f.rarity]} фигурка</small>`});
  }
  for (const [ws, u] of S.calc.weekWinner) if (u) ev.push({t: (ws + 7) * DAY - MSK, icon: '<div class="fi">👑</div>', html: `${nameHTML(u)} выигрывает неделю<small>${dstr(ws)}–${dstr(ws + 6)}</small>`});
  for (const [u, ks] of S.calc.champions) for (const k of ks) ev.push({t: Date.UTC(Math.floor((k + 1) / 12), (k + 1) % 12, 1), icon: '<div class="fi">🏆</div>', html: `${nameHTML(u)} — чемпион сезона<small>${ST.monthName(k)}</small>`});
  for (const r of S.results) if (r.moves === r.par && weekday(r.day) === 6 && r.day < D) ev.push({t: new Date(r.created_at).getTime(), icon: '<div class="fi">🧠</div>', html: `${nameHTML(r.user_id)} идеально решает босса недели<small>${dstr(r.day)}</small>`});
  ev.sort((a, b) => b.t - a.t);
  if (!ev.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  $('feed').innerHTML = ev.slice(0, 10).map(e => `<div class="fe">${e.icon}<div>${e.html}</div></div>`).join('');
}

// ---------- profile ----------
function needLogin(el, text) {
  el.innerHTML = `<div class="card"><div class="empty">${text}<br><br>${sb ? '<button class="btn" id="vLogin">Войти</button>' : ''}</div></div>`;
  const b = $('vLogin'); if (b) b.onclick = () => openAuth(false);
}
function renderProfile() {
  const el = $('vProfile');
  if (!S.user || !S.profile) return needLogin(el, 'Войдите, чтобы видеть свой прогресс, значки и витрину.');
  if (!S.calc) { el.innerHTML = '<div class="empty">Загрузка…</div>'; return; }
  const pid = profileTarget || S.user.id, own = pid === S.user.id;
  const c = S.calc.players.get(pid), p = profileOf(pid);
  if (!c || !p) { el.innerHTML = '<div class="empty">Игрок не найден</div>'; return; }
  const r = c.rank;
  const barCol = r.color === 'rainbow' ? 'linear-gradient(90deg,#ff5a6e,#ffd23d,#3ddc97,#4da3ff,#c86bff)' : r.color;
  const show = (p.showcase || []).filter(id => F.byId[id]);
  const counts = id => { const x = S.inv.find(i => i.user_id === pid && i.item_id === id); return x ? x.count : 1; };
  const slots = [0, 1, 2, 3, 4].map(i => show[i]
    ? `<div class="slot" data-it="${show[i]}">${F.svg(show[i], {size: 90, level: F.levelOf(counts(show[i]))})}</div>`
    : `<div class="slot emp" ${own ? 'data-edit="1"' : ''}>${own ? '+' : ''}</div>`).join('');
  const owned = S.inv.filter(i => i.user_id === pid).length;
  const badgeCard = b => `<div class="badge ${b.tier || 'locked'}">${b.tier ? `<span class="bt" style="background:${TIERCOL[b.tier]}">${TIERNAME[b.tier]}</span>` : ''}<div class="bi">${b.icon}</div><div class="bn">${b.name}</div><div class="bp">${b.next ? `${b.value}/${b.next} ${b.unit}` : 'максимум!'}</div></div>`;
  const hiddenCard = h => h.got ? `<div class="badge gold"><span class="bt" style="background:#c86bff;color:#fff">тайный</span><div class="bi">${h.icon}</div><div class="bn">${h.name}</div><div class="bp">${h.desc}</div></div>`
    : `<div class="badge locked"><div class="bi">❔</div><div class="bn">???</div><div class="bp">тайный значок</div></div>`;
  const ws = ST.weekStart(D), start = ws - 28;
  const cal = [];
  for (let d = start; d < start + 35; d++) {
    const rr = c.byDay.get(d);
    if (rr) cal.push(`<span style="background:hsl(${Math.min(120, Math.round(rr.points / (weekday(d) === 6 ? 2 : 1) * 1.2))},70%,55%);color:#14162a" class="${d === D ? 'today' : ''}">${rr.moves === rr.par ? '★' : ''}</span>`);
    else if (c.frozen.has(d)) cal.push(`<span class="ice">🧊</span>`);
    else cal.push(`<span class="${d === D ? 'today' : ''}" style="${d > D ? 'opacity:.35' : ''}">${new Date(d * DAY).getUTCDate()}</span>`);
  }
  const m = c.medals;
  el.innerHTML = `
    ${!own ? `<button class="ghost" id="pBack" style="margin-bottom:10px">← Назад</button>` : ''}
    <div class="card">
      <div class="phead">${avatar(pid, 84)}
        <div style="flex:1;min-width:0"><div class="pname">${nameHTML(pid)}</div>
          <div class="muted" style="margin-top:3px">${r.name}${c.crown ? ' · 👑 чемпион недели' : ''}</div>
          <div class="xpbar"><i style="width:${Math.round(r.progress * 100)}%;background:${barCol}"></i></div>
          <div class="muted small">${c.xp} опыта${r.next ? ` · до «${r.next.name}» ещё ${r.next.xp - c.xp}` : ' · высший ранг'}</div>
        </div></div>
      ${c.champion.length ? `<div class="chips" style="margin:12px 0 0">${c.champion.map(k => `<span class="chip" style="background:linear-gradient(135deg,#7a5a12,#3a2a08)">🏆 ${ST.monthName(k)}</span>`).join('')}</div>` : ''}
      <div class="row" style="margin-top:14px;flex-wrap:wrap">
        <div class="stat"><div class="v">🔥 ${c.streak}</div><div class="l">серия · рекорд ${c.bestStreak}</div></div>
        <div class="stat"><div class="v">🧊 ${c.freezes}</div><div class="l">заморозки</div></div>
        <div class="stat"><div class="v">⭐ ${c.values.perfect}</div><div class="l">идеально из ${c.solved}</div></div>
      </div>
      <div class="row" style="margin-top:10px"><div class="stat"><div class="v" style="font-size:18px">🥇 ${m.gold} &nbsp;🥈 ${m.silver} &nbsp;🥉 ${m.bronze}</div><div class="l">медали дня</div></div></div>
      ${own ? `<div class="row" style="margin-top:12px"><button class="ghost" id="pCust" style="flex:1">🎨 Оформление</button><button class="ghost" id="pNick">✏️ Ник</button><button class="ghost" id="pOut">Выйти</button></div>` : ''}
    </div>
    <div class="card"><h3>Витрина <span class="muted small">${owned}/${F.ITEMS.length} в коллекции</span></h3>
      <div class="shelf" id="shelf">${slots}</div>
      ${own ? `<div class="row" style="margin-top:10px"><button class="ghost" id="pShow" style="flex:1">Изменить витрину</button><button class="ghost" id="pColl" style="flex:1">Коллекция</button></div>` : ''}
    </div>
    <div class="card"><h3>Значки</h3><div class="bgrid">${c.badges.map(badgeCard).join('')}</div>
      <h3 style="margin-top:16px">Тайные значки <span class="muted small">${c.hidden.filter(h => h.got).length}/${c.hidden.length}</span></h3><div class="bgrid">${c.hidden.map(hiddenCard).join('')}</div></div>
    <div class="card"><h3>Последние 5 недель</h3><div class="cal">${WD.map(w => `<span style="background:none">${w}</span>`).join('')}${cal.join('')}</div>
      <div class="muted small" style="margin-top:8px">★ — идеальное решение, 🧊 — день спасён заморозкой</div></div>`;
  const b = $('pBack'); if (b) b.onclick = () => go('home');
  el.querySelectorAll('.slot[data-it]').forEach(s => s.onclick = () => openItem(s.dataset.it, pid));
  el.querySelectorAll('.slot[data-edit]').forEach(s => s.onclick = openShowcase);
  if (own) {
    $('pCust').onclick = openCustomize; $('pNick').onclick = openNick; $('pOut').onclick = () => sb.auth.signOut();
    $('pShow').onclick = openShowcase; $('pColl').onclick = () => go('collection');
  }
}

// ---------- collection ----------
const seen = () => new Set(LS.get('daily-seen-items', []));
function renderCollection() {
  const el = $('vCollection');
  if (!S.user || !S.profile) return needLogin(el, 'Войдите, чтобы открывать сундуки и собирать фигурки.');
  if (!S.calc) { el.innerHTML = '<div class="empty">Загрузка…</div>'; return; }
  const me = meCalc(), seenSet = seen();
  const av = ST.availableChests(me, S.chests.filter(c => c.user_id === S.user.id), D);
  const total = F.ITEMS.length, have = F.ITEMS.filter(i => invCount(i.id)).length;
  const card = it => {
    const n = invCount(it.id);
    return `<div class="fcard r-${it.rarity} ${n ? '' : 'locked'}" data-it="${it.id}">${n && !seenSet.has(it.id) ? '<span class="new">NEW</span>' : ''}${n > 1 ? `<span class="cnt">×${n}</span>` : ''}
      ${F.svg(it.id, {size: 120, level: F.levelOf(n), locked: !n})}<div class="fn">${n ? it.name : '???'}</div></div>`;
  };
  el.innerHTML = `
    <div class="card"><h3>Сундуки</h3>
      ${av.length ? av.map((c, i) => `<div class="chestban" data-ch="${i}" style="margin-bottom:8px"><div class="ic">${chestSVG(c.tier, 64)}</div><div style="flex:1"><b>${CHEST_NAME[c.tier]}</b><div class="muted" style="color:#e9dcff">${c.kind === 'welcome' ? 'Подарок за первое решение' : 'За неделю ' + dstr(c.period) + '–' + dstr(c.period + 6)}</div></div><span class="btn" style="padding:8px 14px;font-size:14px">Открыть</span></div>`).join('')
        : `<div class="muted">Новых сундуков нет. Решите 5 задач за неделю — в понедельник получите обычный, 7 — редкий, 7 и 3 идеальных — легендарный.</div>`}
      <div class="muted small" style="margin-top:10px">Шансы: обычный — 70% обычная / 25% редкая / 4,5% эпическая / 0,5% легендарная · редкий сундук — 2 фигурки, легендарный — 3, одна из них минимум эпическая. Дубли повышают уровень фигурки: 2 копии — ур.2, 4 — серебро, 7 — золото.</div>
    </div>
    <div class="card"><h3>Коллекция <span class="muted small">${have}/${total}</span></h3>
      <div class="prog" style="margin-bottom:16px"><i style="width:${have / total * 100}%"></i></div>
      ${F.SERIES.map(s => { const items = F.ITEMS.filter(i => i.series === s.id), h = items.filter(i => invCount(i.id)).length;
        return `<div class="series"><h4><span>${s.emoji} ${s.name}</span><span class="muted small">${h}/${items.length}${h === items.length ? ' ✓' : ''}</span></h4><div class="muted small" style="margin-bottom:8px">${s.desc}</div><div class="fgrid">${items.map(card).join('')}</div></div>`; }).join('')}
    </div>`;
  el.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => openChest(av[+b.dataset.ch]));
  el.querySelectorAll('.fcard[data-it]').forEach(b => b.onclick = () => openItem(b.dataset.it, S.user.id));
}

function openSheet(html) { $('sheetBody').innerHTML = html; $('mSheet').classList.add('on'); }
function closeSheet() { $('mSheet').classList.remove('on'); }
$('mSheet').onclick = e => { if (e.target.id === 'mSheet') closeSheet(); };

function openItem(id, pid) {
  const it = F.byId[id]; if (!it) return;
  const own = pid === S.user.id;
  const n = (S.inv.find(i => i.user_id === pid && i.item_id === id) || {}).count || 0;
  if (own && n) { const s = seen(); s.add(id); LS.set('daily-seen-items', [...s]); }
  const lvl = F.levelOf(n), nxt = F.nextLevelAt(n);
  const owners = new Set(S.inv.filter(i => i.item_id === id).map(i => i.user_id)).size;
  const show = (S.profile.showcase || []);
  const onShelf = show.includes(id);
  const series = F.SERIES.find(s => s.id === it.series);
  openSheet(`<div class="center-t">
    <div style="margin:-6px auto 0;width:240px">${F.svg(id, {size: 240, level: lvl, locked: !n})}</div>
    <span class="rar" style="background:${RCOL[it.rarity]}">${F.RARITY[it.rarity].name}</span>
    <h3 style="margin:8px 0 4px">${n ? it.name : '???'}</h3>
    <div class="muted">${n ? it.desc : 'Эта фигурка ещё не найдена. Ищите её в сундуках!'}</div>
    <div class="muted small" style="margin-top:8px">${series.emoji} ${series.name} · есть у ${owners} ${plural(owners, 'игрока', 'игроков', 'игроков')}</div>
    ${n ? `<div style="margin:14px 0 6px;font-weight:600">Уровень ${lvl}${lvl === 4 ? ' · золото' : lvl === 3 ? ' · серебро' : ''} · ${n} ${plural(n, 'копия', 'копии', 'копий')}</div>
      ${nxt ? `<div class="prog"><i style="width:${n / nxt * 100}%"></i></div><div class="muted small" style="margin-top:4px">до следующего уровня ещё ${nxt - n} ${plural(nxt - n, 'копия', 'копии', 'копий')}</div>` : '<div class="muted small">Максимальный уровень!</div>'}` : ''}
    ${own && n ? `<button class="btn wide" id="shelfTog" style="margin-top:16px">${onShelf ? 'Убрать с витрины' : 'Поставить на витрину'}</button>` : ''}
    <div style="margin-top:12px"><button class="link" id="sClose">Закрыть</button></div></div>`);
  $('sClose').onclick = closeSheet;
  const t = $('shelfTog');
  if (t) t.onclick = async () => {
    let arr = show.slice();
    if (onShelf) arr = arr.filter(x => x !== id);
    else { if (arr.length >= 5) { toast('На витрине максимум 5 фигурок — уберите одну'); return; } arr.push(id); }
    if (await saveShowcase(arr)) { closeSheet(); renderAll(); }
  };
}
async function saveShowcase(arr) {
  const {error} = await sb.rpc('set_showcase', {p_items: arr});
  if (error) { toast('Не удалось сохранить: ' + esc(ruErr(error))); return false; }
  S.profile.showcase = arr; const p = profileOf(S.user.id); if (p) p.showcase = arr;
  toast('Витрина обновлена'); return true;
}
function openShowcase() {
  const ownedIds = F.ITEMS.filter(i => invCount(i.id)).map(i => i.id);
  if (!ownedIds.length) { toast('Пока нечего ставить — откройте первый сундук!'); return; }
  let sel = (S.profile.showcase || []).filter(id => ownedIds.includes(id));
  const draw = () => {
    openSheet(`<h3>Витрина</h3><div class="muted" style="margin-bottom:10px">Выберите до 5 фигурок. Первая станет вашим аватаром.</div>
      <div class="pick">${ownedIds.map(id => { const i = sel.indexOf(id); return `<div class="fcard r-${F.byId[id].rarity} ${i >= 0 ? 'sel' : ''}" data-id="${id}">${i >= 0 ? `<span class="new" style="background:var(--accent);color:#1b1205">${i + 1}</span>` : ''}${F.svg(id, {size: 80, level: F.levelOf(invCount(id))})}<div class="fn">${F.byId[id].name}</div></div>`; }).join('')}</div>
      <button class="btn wide" id="scSave" style="margin-top:14px">Сохранить</button><div class="center-t" style="margin-top:10px"><button class="link" id="sClose">Отмена</button></div>`);
    document.querySelectorAll('#sheetBody .fcard').forEach(c => c.onclick = () => {
      const id = c.dataset.id, i = sel.indexOf(id);
      if (i >= 0) sel.splice(i, 1); else if (sel.length < 5) sel.push(id); else toast('Максимум 5');
      draw();
    });
    $('scSave').onclick = async () => { if (await saveShowcase(sel)) { closeSheet(); renderAll(); } };
    $('sClose').onclick = closeSheet;
  };
  draw();
}
const CAR_PALETTES = {
  classic: ['#4da3ff', '#ffc93c', '#3ddc97', '#b98cff', '#ff9a4d', '#5ce1e6', '#f78fb3', '#a3e635', '#94a3b8', '#fbbf24', '#60a5fa', '#c084fc', '#34d399'],
  pastel: ['#a5d8ff', '#ffe3a3', '#b2f2bb', '#d0bfff', '#ffc9a8', '#99e9f2', '#fcc2d7', '#d8f5a2', '#ced4da', '#ffec99', '#bac8ff', '#eebefa', '#96f2d7'],
};
CAR_PALETTES.neon = CAR_PALETTES.classic; CAR_PALETTES.gold = CAR_PALETTES.classic;
const SWATCH = {
  frame: {none: '#2d3250', blue: '#4da3ff', violet: '#c86bff', gold: '#ffd23d', rainbow: 'conic-gradient(#ff5a6e,#ffd23d,#3ddc97,#4da3ff,#c86bff,#ff5a6e)'},
  cars: {classic: 'linear-gradient(135deg,#4da3ff,#ffc93c)', neon: 'linear-gradient(135deg,#12142a 40%,#5ce1e6)', pastel: 'linear-gradient(135deg,#a5d8ff,#fcc2d7)', gold: 'linear-gradient(135deg,#fff1a8,#e09a12)'},
  robots: {classic: '#ff5a6e', glossy: 'radial-gradient(circle at 35% 30%,#fff,#ff5a6e 50%)', chrome: 'linear-gradient(160deg,#fff,#7d88a8)'},
  board: {classic: '#23273f', midnight: '#0b0d1c', mint: '#1a4d46', sunset: '#4e2643', galaxy: 'radial-gradient(circle,#3b2d7a,#140f2e)'},
};
function openCustomize() {
  const me = meCalc(), cur = Object.assign({}, S.profile.cosmetics || {});
  const titles = {frame: 'Рамка аватара', cars: 'Машинки в «Пробке»', robots: 'Роботы в «Рикошете»', board: 'Тема поля'};
  const draw = () => {
    openSheet(`<h3>Оформление</h3><div class="muted" style="margin-bottom:14px">Новые варианты открываются с рангом. Ваш ранг: <b style="color:var(--text)">${me.rank.name}</b></div>
      ${Object.keys(ST.COSMETICS).map(k => `<div style="font-weight:600;margin-bottom:8px">${titles[k]}</div><div class="opts">${ST.COSMETICS[k].map(o => {
        const lock = me.rank.index < o.rank, on = (cur[k] || ST.COSMETICS[k][0].id) === o.id;
        return `<button class="opt ${on ? 'on' : ''} ${lock ? 'lock' : ''}" data-k="${k}" data-id="${o.id}" ${lock ? `data-lock="${ST.RANKS[o.rank].name}"` : ''}><span class="sw" style="background:${SWATCH[k][o.id]}"></span>${o.name}${lock ? ' 🔒' : ''}</button>`; }).join('')}</div>`).join('')}
      <button class="btn wide" id="cuSave">Сохранить</button><div class="center-t" style="margin-top:10px"><button class="link" id="sClose">Отмена</button></div>`);
    document.querySelectorAll('#sheetBody .opt').forEach(b => b.onclick = () => {
      if (b.dataset.lock) { toast(`Откроется на ранге «${b.dataset.lock}»`); return; }
      cur[b.dataset.k] = b.dataset.id; draw();
    });
    $('cuSave').onclick = async () => {
      const {error} = await sb.from('profiles').update({cosmetics: cur}).eq('id', S.user.id);
      if (error) { toast('Не удалось сохранить: ' + esc(ruErr(error))); return; }
      S.profile.cosmetics = cur; const p = profileOf(S.user.id); if (p) p.cosmetics = cur;
      closeSheet(); toast('Сохранено'); renderAll();
    };
    $('sClose').onclick = closeSheet;
  };
  draw();
}

// ---------- chest opening ----------
const GLOW = {welcome: '#14504a', common: '#3a2f55', rare: '#16306b', legendary: '#6b4a0a'};
let confettiStop = null;
function confetti(colors, n = 140) {
  const cv = $('confetti'), ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight;
  const ps = Array.from({length: n}, () => ({x: W / 2 + (Math.random() - .5) * 60, y: H * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, s: 5 + Math.random() * 6, c: colors[Math.floor(Math.random() * colors.length)]}));
  let alive = true; confettiStop = () => { alive = false; ctx.clearRect(0, 0, W, H); };
  const t0 = performance.now();
  (function f(t) {
    if (!alive) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
    if (t - t0 < 3500) requestAnimationFrame(f); else ctx.clearRect(0, 0, W, H);
  })(t0);
}
function openChest(ch) {
  const m = $('mChest');
  m.className = 'on'; m.style.setProperty('--cglow', GLOW[ch.tier] || GLOW.common);
  $('cTitle').textContent = CHEST_NAME[ch.tier];
  $('cSub').textContent = 'Нажмите, чтобы открыть';
  $('cBox').innerHTML = chestSVG(ch.tier, 220); $('cBox').className = 'cbox idle'; $('cBox').style.display = '';
  $('cReveal').className = 'reveal'; $('cSum').className = 'summary'; $('cTap').textContent = '';
  let busy = false;
  $('cBox').onclick = async () => {
    if (busy) return; busy = true;
    $('cBox').className = 'cbox shake'; $('cSub').textContent = '…';
    const [res] = await Promise.all([sb.rpc('open_chest', {p_kind: ch.kind, p_period: ch.period}), new Promise(r => setTimeout(r, 1100))]);
    if (res.error) { $('cBox').className = 'cbox'; $('cSub').textContent = ruErr(res.error); $('cTap').textContent = 'Нажмите в любом месте, чтобы закрыть'; m.onclick = closeChest; return; }
    const items = res.data.items || [];
    const before = {}; for (const it of items) before[it] = before[it] === undefined ? invCount(it) : before[it];
    $('cFlash').classList.remove('go'); void $('cFlash').offsetWidth; $('cFlash').classList.add('go');
    m.classList.add('opened'); $('cBox').className = 'cbox';
    setTimeout(() => { $('cBox').style.display = 'none'; revealSeq(items, before); }, 650);
    S.chests.push({user_id: S.user.id, kind: ch.kind, period: ch.period, tier: res.data.tier, items, opened_at: new Date().toISOString()});
  };
}
function revealSeq(items, before) {
  const m = $('mChest'), counts = Object.assign({}, before);
  let i = 0;
  const show = () => {
    const id = items[i], it = F.byId[id];
    counts[id] = (counts[id] || 0) + 1;
    const n = counts[id], lvl = F.levelOf(n), isNew = n === 1;
    m.style.setProperty('--cglow', {common: '#2e3554', rare: '#123a7a', epic: '#4a1a7a', legendary: '#7a5208'}[it.rarity]);
    m.style.setProperty('--cglow2', RCOL[it.rarity]);
    $('cTitle').textContent = items.length > 1 ? `Фигурка ${i + 1} из ${items.length}` : 'Ваша фигурка';
    $('cSub').textContent = '';
    $('cFig').innerHTML = F.svg(id, {size: 260, level: lvl});
    $('cRl').textContent = F.RARITY[it.rarity].name; $('cRl').style.color = RCOL[it.rarity];
    $('cRn').innerHTML = esc(it.name) + (isNew ? '<span class="newtag">НОВАЯ!</span>' : '');
    $('cRs').textContent = isNew ? it.desc : `Копия! Уровень ${lvl}${F.nextLevelAt(n) ? ` · до следующего ${F.nextLevelAt(n) - n}` : ' · максимум'}`;
    const r = $('cReveal'); r.className = 'reveal'; void r.offsetWidth; r.className = 'reveal on';
    if (it.rarity === 'legendary') { confetti(['#ffd23d', '#fff1a8', '#ffb020', '#ffffff']); $('cFlash').classList.remove('go'); void $('cFlash').offsetWidth; $('cFlash').classList.add('go'); try { navigator.vibrate && navigator.vibrate([60, 40, 120]); } catch (e) {} }
    else if (it.rarity === 'epic') confetti(['#c86bff', '#f0d2ff', '#4da3ff'], 90);
    $('cTap').textContent = i + 1 < items.length ? 'Нажмите, чтобы продолжить' : 'Нажмите, чтобы увидеть итог';
  };
  show();
  m.onclick = () => {
    if (confettiStop) confettiStop();
    i++;
    if (i < items.length) { show(); return; }
    m.onclick = null;
    $('cReveal').className = 'reveal'; $('cTap').textContent = '';
    $('cTitle').textContent = 'Добыча'; $('cSub').textContent = '';
    m.style.setProperty('--cglow', '#2a2450');
    $('cSum').innerHTML = `<div class="fgrid" style="grid-template-columns:repeat(${Math.min(3, items.length)},1fr)">${items.map(id => `<div class="fcard r-${F.byId[id].rarity}">${F.svg(id, {size: 110, level: F.levelOf(counts[id])})}<div class="fn">${F.byId[id].name}</div></div>`).join('')}</div>
      <button class="btn wide" id="cColl">В коллекцию</button><div style="margin-top:12px"><button class="link" id="cShelf">Поставить на витрину</button></div>`;
    $('cSum').className = 'summary on';
    $('cColl').onclick = async () => { await closeChest(); go('collection'); };
    $('cShelf').onclick = async () => { await closeChest(); go('profile'); openShowcase(); };
  };
}
async function closeChest() {
  if (confettiStop) confettiStop();
  $('mChest').className = ''; $('mChest').onclick = null;
  await loadAll(); renderAll();
}

// ---------- game ----------
let G = null, timerInt = null;
function startGame() {
  D = today();
  const pz = puzzleOf(D); if (!pz) return;
  let prog = getProg(D);
  if (!prog) prog = {moves: 0, ms: 0, par: pz.par, state: null, hist: [], done: false, undos: 0};
  G = {d: D, pz, prog, t0: Date.now()};
  ['vHome', 'vCollection', 'vProfile'].forEach(v => $(v).style.display = 'none');
  $('vGame').style.display = 'block'; document.body.classList.add('ingame');
  window.scrollTo(0, 0);
  const meId = S.user && S.user.id;
  G.skin = {cars: meId ? cosmeticOf(meId, 'cars') : 'classic', robots: meId ? cosmeticOf(meId, 'robots') : 'classic', board: meId ? cosmeticOf(meId, 'board') : 'classic'};
  if (pz.t === 'rush') rushInit(); else ricInit();
  updCounter();
  clearInterval(timerInt);
  timerInt = setInterval(() => { $('timer').textContent = fmtTime(G.prog.ms + Date.now() - G.t0); }, 500);
}
function saveTime() { if (G) { G.prog.ms += Date.now() - G.t0; G.t0 = Date.now(); setProg(G.d, G.prog); } }
document.addEventListener('visibilitychange', () => { if (!G) return; if (document.hidden) saveTime(); else G.t0 = Date.now(); });
function leaveGame() {
  if (G) saveTime();
  clearInterval(timerInt); G = null;
  $('vGame').style.display = 'none'; document.body.classList.remove('ingame');
  go('home');
}
$('back').onclick = leaveGame;
function updCounter() {
  $('moves').textContent = G.prog.moves;
  $('parl').textContent = plural(G.prog.moves, 'ход', 'хода', 'ходов') + ' · лучшее ' + G.pz.par;
}
function commitMove(newState) {
  G.prog.hist.push(G.prog.state); G.prog.state = newState; G.prog.moves++;
  saveTime(); updCounter();
}
$('undo').onclick = () => {
  if (!G || !G.prog.hist.length || G.prog.done) return;
  G.prog.state = G.prog.hist.pop(); G.prog.undos = (G.prog.undos || 0) + 1; setProg(G.d, G.prog); G.render();
};
$('reset').onclick = () => {
  if (!G || !G.prog.hist.length || G.prog.done) return;
  G.prog.state = G.initial(); G.prog.hist = []; G.prog.undos = (G.prog.undos || 0) + 1; setProg(G.d, G.prog); G.render();
};
const boardClass = base => `board ${base} theme-${G.skin.board}`;

function snapshot() {
  const c = meCalc(); if (!c) return null;
  return {badges: Object.fromEntries(c.badges.map(b => [b.id, b.tier])), hidden: new Set(c.hidden.filter(h => h.got).map(h => h.id)), rank: c.rank.index,
    chests: ST.availableChests(c, S.chests.filter(x => x.user_id === S.user.id), D).length, streak: c.streak};
}
async function win() {
  saveTime(); clearInterval(timerInt);
  const p = G.prog; p.done = true; p.hist = []; setProg(G.d, p);
  const d = G.d, pz = G.pz, score = pts(pz.par, p.moves, d);
  $('wMoves').textContent = p.moves;
  $('wTag').textContent = p.moves === pz.par ? 'Идеально!' : 'Решено';
  $('wText').innerHTML = `${plural(p.moves, 'ход', 'хода', 'ходов')} за ${fmtTime(p.ms)} · лучшее возможное ${pz.par}<br><b style="color:var(--accent);font-size:20px">${score} очков</b>${weekday(d) === 6 ? ' <span class="chip x2">×2</span>' : ''}`;
  $('wNews').innerHTML = '';
  $('wSubmit').textContent = sb ? (S.user ? 'Отправляем результат…' : 'Войдите, чтобы результат попал в таблицу и пошёл в серию.') : '';
  $('wMain').textContent = sb && !S.user ? 'Войти' : 'К таблице';
  $('wMain').onclick = () => { $('mWin').classList.remove('on'); leaveGame(); if (sb && !S.user) openAuth(false); };
  $('mWin').classList.add('on');
  $('wShare').onclick = async () => {
    const c = meCalc();
    const txt = `Ежедневный вызов №${d - P.start + 1} ${pz.t === 'rush' ? '🚗 Пробка' : '🤖 Рикошет'}\n${p.moves} ${plural(p.moves, 'ход', 'хода', 'ходов')} (лучшее ${pz.par}) · ${score} очков${p.moves === pz.par ? ' ⭐' : ''}${c && c.streak ? `\n🔥 серия ${c.streak}` : ''}\n${location.href.split('#')[0]}`;
    try { await navigator.clipboard.writeText(txt); toast('Скопировано — отправьте друзьям!'); } catch (e) { toast('Не удалось скопировать'); }
  };
  if (sb && S.user && S.profile) {
    const before = snapshot();
    await submitPending();
    const pp = getProg(d);
    if (!pp.sent) { $('wSubmit').textContent = 'Не удалось отправить: ' + (pp.sendErr || ''); return; }
    await loadAll();
    $('wSubmit').textContent = 'Результат в таблице ✓';
    const after = snapshot(), c = meCalc(), news = [];
    if (c) news.push(`🔥 Серия: <b>${c.streak} ${plural(c.streak, 'день', 'дня', 'дней')}</b>${c.freezes ? ` · 🧊 ${c.freezes}` : ''}`);
    if (before && after) {
      for (const b of c.badges) if (b.tier && b.tier !== before.badges[b.id]) news.push(`${b.icon} Новый значок: <b>${b.name}</b> · ${TIERNAME[b.tier]}`);
      for (const h of c.hidden) if (h.got && !before.hidden.has(h.id)) news.push(`${h.icon} Тайный значок: <b>${h.name}</b>!`);
      if (after.rank > before.rank) news.push(`⬆️ Новый ранг: <b>${c.rank.name}</b> — загляните в «Оформление»`);
    }
    $('wNews').innerHTML = news.map((n, i) => `<div style="animation-delay:${i * .15}s">${n}</div>`).join('');
    const av = ST.availableChests(c, S.chests.filter(x => x.user_id === S.user.id), D);
    if (av.length) {
      $('wMain').textContent = '🎁 Открыть сундук';
      $('wMain').onclick = () => { $('mWin').classList.remove('on'); leaveGame(); openChest(av[0]); };
    }
  }
}
$('wClose').onclick = () => { $('mWin').classList.remove('on'); leaveGame(); };

// ---------- Rush hour ----------
function rushInit() {
  const cars = G.pz.cars;
  G.initial = () => cars.map(c => c[3]);
  if (!G.prog.state) G.prog.state = G.initial();
  $('pad').style.display = 'none';
  $('ghint').textContent = 'Тяните машинку пальцем вдоль её направления';
  const el = $('gb'); el.className = boardClass('rush') + ' skin-' + G.skin.cars; el.innerHTML = '';
  const pal = CAR_PALETTES[G.skin.cars] || CAR_PALETTES.classic;
  const size = Math.min(window.innerWidth - 32, 440), pad = 8, cs = (size - pad * 2) / 6, gap = 4;
  el.style.width = el.style.height = size + 'px';
  for (let i = 0; i < 36; i++) {
    const d = document.createElement('div'); d.className = 'cellbg';
    Object.assign(d.style, {left: pad + (i % 6) * cs + 2 + 'px', top: pad + Math.floor(i / 6) * cs + 2 + 'px', width: cs - 4 + 'px', height: cs - 4 + 'px'});
    el.appendChild(d);
  }
  const ex = document.createElement('div'); ex.className = 'exit';
  Object.assign(ex.style, {left: size - 4 + 'px', top: pad + 2 * cs + 6 + 'px', height: cs - 12 + 'px'}); el.appendChild(ex);
  const els = cars.map((c, i) => {
    const d = document.createElement('div'); d.className = 'car' + (i === 0 ? ' red' : '');
    const col = i === 0 ? '#ff5a6e' : pal[(i - 1) % pal.length];
    d.style.setProperty('--c', col);
    d.style.background = i === 0 ? (G.skin.cars === 'gold' ? 'linear-gradient(135deg,#ff8a8a,#d4143a 60%,#8f0a24)' : 'linear-gradient(135deg,#ff6b6b,#e0344c)') : col;
    el.appendChild(d); return d;
  });
  const place = (i, p) => {
    const [h, len, line] = cars[i];
    const x = h ? p : line, y = h ? line : p;
    Object.assign(els[i].style, {left: pad + x * cs + gap / 2 + 'px', top: pad + y * cs + gap / 2 + 'px', width: (h ? len : 1) * cs - gap + 'px', height: (h ? 1 : len) * cs - gap + 'px'});
  };
  G.render = () => G.prog.state.forEach((p, i) => place(i, p));
  G.render();
  const occ = (st, skip) => {
    const g = new Uint8Array(36);
    st.forEach((p, i) => { if (i === skip) return; const [h, len, line] = cars[i]; for (let k = 0; k < len; k++) g[h ? line * 6 + p + k : (p + k) * 6 + line] = 1; });
    return g;
  };
  els.forEach((d, i) => {
    d.addEventListener('pointerdown', e => {
      if (!G || G.prog.done) return;
      e.preventDefault();
      const [h, len, line] = cars[i], st = G.prog.state, p0 = st[i], g = occ(st, i);
      const at = q => h ? line * 6 + q : q * 6 + line;
      let lo = p0, hi = p0;
      while (lo - 1 >= 0 && !g[at(lo - 1)]) lo--;
      while (hi + len < 6 && !g[at(hi + len)]) hi++;
      const s0 = h ? e.clientX : e.clientY;
      let cur = p0;
      d.setPointerCapture(e.pointerId); d.style.zIndex = 2;
      const move = ev => {
        cur = Math.max(lo, Math.min(hi, p0 + ((h ? ev.clientX : ev.clientY) - s0) / cs));
        const x = h ? cur : line, y = h ? line : cur;
        d.style.left = pad + x * cs + gap / 2 + 'px'; d.style.top = pad + y * cs + gap / 2 + 'px';
      };
      const up = () => {
        d.removeEventListener('pointermove', move); d.removeEventListener('pointerup', up); d.removeEventListener('pointercancel', up);
        d.style.zIndex = '';
        const np = Math.round(cur);
        if (np !== p0) { const ns = st.slice(); ns[i] = np; commitMove(ns); }
        G.render();
        if (G.prog.state[0] === 4) { els[0].style.transition = 'left .35s ease-in'; els[0].style.left = size + 'px'; setTimeout(win, 380); }
      };
      d.addEventListener('pointermove', move); d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up);
    });
  });
}

// ---------- Ricochet ----------
const ROBOT_COLORS = ['#ff5a6e', '#4da3ff', '#3ddc97', '#ffc93c'];
const STEP = [[-1, 0, 1], [0, 1, 2], [1, 0, 4], [0, -1, 8]];
function ricInit() {
  const pz = G.pz, w = Array.from(pz.walls, ch => parseInt(ch, 16));
  G.initial = () => pz.robots.slice();
  if (!G.prog.state) G.prog.state = G.initial();
  $('pad').style.display = '';
  $('ghint').textContent = 'Проведите по роботу в нужную сторону — или выберите его и жмите стрелки';
  const el = $('gb'); el.className = boardClass('ric') + ' rskin-' + G.skin.robots; el.innerHTML = '';
  const size = Math.min(window.innerWidth - 32, 440), cs = size / 8, wt = Math.max(4, cs * .09);
  el.style.width = el.style.height = size + 'px';
  const CENTER = [27, 28, 35, 36];
  for (let i = 0; i < 64; i++) {
    if (CENTER.includes(i)) continue;
    const d = document.createElement('div'); d.className = 'c';
    Object.assign(d.style, {left: (i % 8) * cs + 1.5 + 'px', top: Math.floor(i / 8) * cs + 1.5 + 'px', width: cs - 3 + 'px', height: cs - 3 + 'px'});
    el.appendChild(d);
  }
  const cb = document.createElement('div'); cb.className = 'center';
  Object.assign(cb.style, {left: 3 * cs + 'px', top: 3 * cs + 'px', width: 2 * cs + 'px', height: 2 * cs + 'px'}); el.appendChild(cb);
  const tg = document.createElement('div'); tg.className = 'target';
  Object.assign(tg.style, {left: (pz.target % 8) * cs + cs * .18 + 'px', top: Math.floor(pz.target / 8) * cs + cs * .18 + 'px', width: cs * .64 + 'px', height: cs * .64 + 'px', border: `3px dashed ${ROBOT_COLORS[0]}`, background: 'rgba(255,90,110,.15)'});
  el.appendChild(tg);
  for (let i = 0; i < 64; i++) {
    const r = Math.floor(i / 8), c = i % 8;
    if ((w[i] & 2) && c < 7) { const d = document.createElement('div'); d.className = 'wall'; Object.assign(d.style, {left: (c + 1) * cs - wt / 2 + 'px', top: r * cs - wt / 2 + 'px', width: wt + 'px', height: cs + wt + 'px'}); el.appendChild(d); }
    if ((w[i] & 4) && r < 7) { const d = document.createElement('div'); d.className = 'wall'; Object.assign(d.style, {left: c * cs - wt / 2 + 'px', top: (r + 1) * cs - wt / 2 + 'px', width: cs + wt + 'px', height: wt + 'px'}); el.appendChild(d); }
  }
  let sel = 0;
  const robs = ROBOT_COLORS.map(col => {
    const d = document.createElement('div'); d.className = 'robot'; d.style.backgroundColor = col;
    d.style.width = d.style.height = cs * .72 + 'px';
    el.appendChild(d); return d;
  });
  G.render = () => G.prog.state.forEach((cell, i) => {
    robs[i].style.left = (cell % 8) * cs + cs * .14 + 'px'; robs[i].style.top = Math.floor(cell / 8) * cs + cs * .14 + 'px';
    robs[i].classList.toggle('sel', i === sel);
  });
  G.render();
  const slide = (st, i, d) => {
    let c = st[i]; const [dr, dc, bit] = STEP[d];
    for (;;) { if (w[c] & bit) break; const n = c + dr * 8 + dc; if (st.includes(n)) break; c = n; }
    return c;
  };
  let busy = false;
  const doMove = (i, d) => {
    if (busy || !G || G.prog.done) return;
    const st = G.prog.state, nc = slide(st, i, d);
    sel = i;
    if (nc === st[i]) { G.render(); return; }
    const ns = st.slice(); ns[i] = nc; commitMove(ns); G.render();
    if (i === 0 && nc === pz.target) { busy = true; setTimeout(() => { busy = false; win(); }, 300); }
  };
  let sw = null;
  el.onpointerdown = e => {
    const rect = el.getBoundingClientRect();
    const cell = Math.floor((e.clientY - rect.top) / cs) * 8 + Math.floor((e.clientX - rect.left) / cs);
    const hit = G.prog.state.indexOf(cell);
    sw = {x: e.clientX, y: e.clientY, robot: hit >= 0 ? hit : sel};
    if (hit >= 0) { sel = hit; G.render(); }
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  };
  el.onpointerup = e => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) doMove(sw.robot, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    sw = null;
  };
  el.onpointercancel = () => sw = null;
  document.querySelectorAll('#pad button').forEach(b => b.onclick = () => doMove(sel, +b.dataset.d));
  G.keys = e => { const k = {ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3}[e.key]; if (k != null) { e.preventDefault(); doMove(sel, k); } if ('1234'.includes(e.key)) { sel = +e.key - 1; G.render(); } };
}
addEventListener('keydown', e => { if (G && G.keys) G.keys(e); });

// ---------- boot ----------
renderAll();
setInterval(() => { if (!G && today() !== D) { D = today(); loadAll().then(renderAll); } }, 30000);
})();
