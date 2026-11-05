/* キコのQCぼうけん */
(() => {
'use strict';

// ---------- 設定 ----------
const KH_API = 'https://script.google.com/macros/s/AKfycbyNjses9QwU8f575Ua9wLQ-Io2WirPL1S7JeZxGMR5IBaDmWynmoPgIwM6bN5ZLl5Fp8g/exec';
const KH_LOGIN_PAGE = 'https://script.google.com/macros/s/AKfycbwGFSEDqGuH_FKt_GU6cnn_cy3TdvQwr2Kin4J1wGF1c0FYyZk1-yV2L_78apqwod-t-w/exec?link=1&back=qc';
const STORE = 'kiko-qc-v1';
const TRAIN_START = '2026-12-02'; // 訓練が始まる日
// マップのステージ：大きい章は分ける（1章→4・4・3節、3章と4章→4・3節）。ほかの章はそのまま
const SPLIT = { 1: [4, 4, 3], 3: [4, 3], 4: [4, 3] };
const STAGE_IDS = [1, 2, 3, 4, 5, 6, 7, 8].flatMap(c => SPLIT[c] ? SPLIT[c].map((_, i) => c + 'abc'[i]) : [String(c)]);
const stageSort = a => [...new Set(a)].sort((x, y) => STAGE_IDS.indexOf(x) - STAGE_IDS.indexOf(y));
// 前の版のボス記録（章の番号）を、ステージの記録に置きかえる
const migrateBoss = b => stageSort((b || []).flatMap(x => typeof x === 'number' ? (SPLIT[x] ? SPLIT[x].map((_, i) => x + 'abc'[i]) : [String(x)]) : [x]));
const DEFAULT_EXAM = '2026-12-19';
const CALC_CHAPTERS = [2, 5, 6, 7, 8];
const KANA = 'アイウエ';

let DATA, SECS, CHAPS;
{ const m = location.hash.match(/t=([0-9a-f-]+)/i); if (m) { try { localStorage.setItem('kh-token', m[1]); localStorage.removeItem('qc-key'); } catch (_) {} history.replaceState(null, '', location.pathname); } }
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} };

// ---------- 日付 ----------
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const dayDelta = (a, b) => Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000);
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const slash = s => s ? s.replace(/-/g, '/') : '—';

// ---------- 記録 ----------
const initial = () => ({
  version: 2, exam: DEFAULT_EXAM, cleared: [], read: [], boss: [], history: {}, review: {},
  crickets: 0, specialFood: 0, drillCorrect: 0, drillCounter: 0, practiceAwarded: {},
  days: [], active: [], dayCount: {}, dailyDone: [], cnt: {}, bestStreak: 0, lastSection: null, updatedAt: 0
});
const COUNTERS = ['crickets', 'specialFood', 'drillCorrect', 'drillCounter'];
const DEV = (() => { let d = lsGet('kiko-qc-dev'); if (!d) { d = Math.random().toString(36).slice(2, 10); lsSet('kiko-qc-dev', d); } return d; })();
function totals(st) { for (const k of COUNTERS) st[k] = Object.values(st.cnt || {}).reduce((a, c) => a + (c[k] || 0), 0); return st; }
function bump(k, n = 1) { const c = state.cnt[DEV] || (state.cnt[DEV] = {}); c[k] = (c[k] || 0) + n; totals(state); }
function normalize(obj) {
  const s = { ...initial(), ...(obj || {}) };
  s.boss = migrateBoss(s.boss);
  if (!s.cnt || !Object.keys(s.cnt).length) { s.cnt = { base: {} }; for (const k of COUNTERS) s.cnt.base[k] = s[k] || 0; }
  totals(s);
  if (!obj?.version || obj.version < 2) { s.active = [...(s.days || [])]; s.version = 2; }
  return s;
}
let state;
try { state = normalize(JSON.parse(lsGet(STORE) || 'null')); } catch (_) { state = initial(); }

const uniq = a => [...new Set(a)].sort();
function mergeState(a, b) {
  const [newer, older] = (a.updatedAt || 0) >= (b.updatedAt || 0) ? [a, b] : [b, a];
  const m = { ...older, ...newer };
  for (const k of ['cleared', 'read', 'days', 'active', 'dailyDone']) m[k] = uniq([...(a[k] || []), ...(b[k] || [])]);
  m.boss = migrateBoss([...(a.boss || []), ...(b.boss || [])]);
  m.history = { ...older.history };
  for (const [id, h] of Object.entries(newer.history || {})) {
    const o = m.history[id];
    m.history[id] = !o || (h.attempts || 0) >= (o.attempts || 0) ? h : o;
  }
  m.review = {};
  for (const id of new Set([...Object.keys(a.review || {}), ...Object.keys(b.review || {})])) {
    const x = (a.review || {})[id], y = (b.review || {})[id];
    if (!x || !y) { m.review[id] = x || y; continue; }
    const lx = (a.history || {})[id]?.last || '', ly = (b.history || {})[id]?.last || '';
    m.review[id] = lx > ly ? x : ly > lx ? y : (newer === a ? x : y);
  }
  m.practiceAwarded = { ...older.practiceAwarded, ...newer.practiceAwarded };
  m.dayCount = { ...(a.dayCount || {}) };
  for (const [d, n] of Object.entries(b.dayCount || {})) m.dayCount[d] = Math.max(m.dayCount[d] || 0, n);
  m.bestStreak = Math.max(a.bestStreak || 0, b.bestStreak || 0);
  // コオロギなどの数は端末ごとに持ち、合計を出す（2台で別々に進めても足し合わせになる）
  m.cnt = {};
  for (const src of [a, b]) for (const [dev, c] of Object.entries(src.cnt || {})) { const t = m.cnt[dev] || (m.cnt[dev] = {}); for (const k of COUNTERS) t[k] = Math.max(t[k] || 0, c[k] || 0); }
  totals(m);
  return m;
}

const canon = o => JSON.stringify(o, (k, v) => k === 'updatedAt' ? undefined : v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v);
let syncTimer = null, retryN = 0;
const DIRTY = 'kiko-qc-dirty';
// 保存：まず端末に書き、「まだ送っていない」印を付けてから、少し待ってクラウドへ送る
function save(now) {
  state.updatedAt = Date.now();
  lsSet(STORE, JSON.stringify(state));
  lsSet(DIRTY, '1');
  clearTimeout(syncTimer);
  if (sync.token && sync.ok) syncTimer = setTimeout(pushCloud, now ? 0 : 1500);
}
const isDirty = () => !!lsGet(DIRTY);

// ---------- 同期（キコハウスのログインを使う） ----------
const sync = { token: null, ok: false, status: 'local', at: null };
async function api(fn, v) {
  const body = { token: sync.token, fn };
  if (v !== undefined) body.v = v;
  const r = await fetch(KH_API, { method: 'POST', body: JSON.stringify(body) });
  return r.json();
}
async function pullCloud() {
  sync.token = lsGet('kh-token');
  if (!sync.token) { sync.status = 'nologin'; chrome(); return; }
  try {
    const j = await api('qc_load');
    if (j.error === 'auth') { sync.status = 'expired'; sync.ok = false; chrome(); return; }
    if (!j.ok) { sync.status = 'notready'; sync.err = String(j.error || JSON.stringify(j)).slice(0, 120); sync.ok = false; chrome(); return; }
    sync.ok = true;
    if (j.v) {
      const cloud = normalize(typeof j.v === 'string' ? JSON.parse(j.v) : j.v);
      const merged = mergeState(state, cloud);
      const changed = canon(merged) !== canon(state);
      state = merged;
      lsSet(STORE, JSON.stringify(state));
      if (changed && !quiz && !['lesson', 'drill', 'finish'].includes(page)) render();
      sync.status = 'synced'; sync.at = Date.now();
      if ((cloud.updatedAt || 0) < (state.updatedAt || 0) || changed || isDirty()) pushCloud();
    } else { sync.status = 'synced'; pushCloud(); }
  } catch (e) { sync.status = navigator.onLine ? 'notready' : 'offline'; sync.err = String(e && e.message || e).slice(0, 120); }
  chrome();
}
// 送るときは、直前にクラウドの記録を読んで合わせてから書く（ほかの端末の分を消さない）
let pushing = false, pushAgain = false;
async function pushCloud(win) {
  if (!sync.token || !sync.ok) return;
  if (pushing) { pushAgain = true; return; }
  pushing = true; clearTimeout(syncTimer);
  const prev = sync.status; sync.status = 'saving'; chrome(); if (win) savingWin(true);
  try {
    const j0 = await api('qc_load');
    if (j0.error === 'auth') { sync.status = 'expired'; sync.ok = false; return; }
    if (!j0.ok) throw Error(j0.error || 'load');
    if (j0.v) {
      const cloud = normalize(typeof j0.v === 'string' ? JSON.parse(j0.v) : j0.v);
      const merged = mergeState(state, cloud);
      merged.updatedAt = Math.max(state.updatedAt || 0, cloud.updatedAt || 0);
      const changed = canon(merged) !== canon(state);
      state = merged; lsSet(STORE, JSON.stringify(state));
      if (changed && !quiz && !['lesson', 'drill', 'finish'].includes(page)) render();
    }
    const sent = JSON.stringify(state);
    const j = await api('qc_save', sent);
    if (j.error === 'auth') { sync.status = 'expired'; sync.ok = false; }
    else if (j.ok) { if (JSON.stringify(state) === sent) lsSet(DIRTY, null); sync.status = 'synced'; sync.at = Date.now(); retryN = 0; }
    else throw Error(j.error || 'save');
  } catch (e) {
    sync.status = navigator.onLine ? 'retry' : 'offline'; sync.err = String(e && e.message || e).slice(0, 120);
  } finally {
    pushing = false; if (win) savingWin(false); chrome();
    if (pushAgain) { pushAgain = false; pushCloud(); }
    else if (isDirty() && sync.ok) { syncTimer = setTimeout(pushCloud, Math.min(60000, 5000 * 2 ** retryN++)); }
  }
}
// 閉じる・裏に回るときは、待たずにその場で送る（keepalive で届けきる）
function flushNow() {
  if (!sync.token || !sync.ok || !isDirty() || pushing) return;
  const body = JSON.stringify({ token: sync.token, fn: 'qc_save', v: JSON.stringify(state) });
  if (body.length > 60000) return;
  try { fetch(KH_API, { method: 'POST', body, keepalive: true }); } catch (_) {}
}
function savingWin(on) {
  let w = $('saving-win');
  if (on) { if (!w) { w = document.createElement('div'); w.id = 'saving-win'; w.className = 'rpg bottom'; w.innerHTML = '<p>保存中<span class="ld"><i>.</i><i>.</i><i>.</i></span></p>'; document.body.appendChild(w); } }
  else if (w) w.remove();
}
const syncLabel = () => ({ synced: ic('cloud') + '同期中', saving: ic('cloud') + '保存中…', retry: ic('cloud') + '未送信', nologin: ic('cloud') + 'ログイン', expired: ic('cloud') + '再ログイン', notready: '端末内保存', offline: 'オフライン', local: '端末内保存' }[sync.status]);

// ---------- 学習の時期 ----------
function phase() {
  const t = today(), left = dayDelta(state.exam, t);
  if (left <= 14) return { n: 4, name: '直前期', chapters: null, note: '復習と仕上げ' };
  // 第1期・第2期は計算の章。訓練が始まる日（TRAIN_START）か、試験18日前のどちらか早いほうから第3期
  if (t < '2026-11-14' && left >= 36) return { n: 1, name: '第1期', chapters: CALC_CHAPTERS, note: '計算の章' };
  if (t < TRAIN_START && left >= 18) return { n: 2, name: '第2期', chapters: CALC_CHAPTERS, note: '計算の章' };
  return { n: 3, name: '第3期', chapters: null, note: '全章をまわす' };
}
const chapterLabel = chs => chs ? '第' + chs.join('・') + '章' : '全章';

// ---------- ヘルパー ----------
const has = (arr, k) => arr.includes(k);
const secBy = id => SECS.find(s => s.id === id);
const qBy = id => { for (const s of SECS) { const q = s.questions.find(q => q.id === id) || examplesOf(s).find(q => q.id === id); if (q) return { ...q, section: s }; } return null; };
// 例題：本文の「例題」の部分から取り出す（問題文＝最初の段落、答え＝残り）
function splitText(s) {
  const t = s.text.replace(/\u200b/g, ''), a = t.search(/^例題$/m);
  if (a < 0) return { before: t, ex: '', after: '' };
  const rest = t.slice(a), b = rest.search(/^(練習問題|答えと解説)$/m);
  return { before: t.slice(0, a), ex: b < 0 ? rest : rest.slice(0, b), after: b < 0 ? '' : rest.slice(b) };
}
function examplesOf(s) {
  if (s._ex) return s._ex;
  const parts = splitText(s).ex.split(/^(?=例題\d+：)/m).filter(x => /^例題\d+：/.test(x));
  return (s._ex = parts.map(x => {
    const n = +x.match(/^例題(\d+)/)[1], body = x.replace(/^例題\d+：/, '').trim();
    const i = body.search(/\n\s*\n/), stem = i < 0 ? body : body.slice(0, i), ans = i < 0 ? '' : body.slice(i).trim().replace(/^答え：/, '');
    return { id: `${s.id}-ex${n}`, n, example: true, stem, ans, answer: 0, options: [] };
  }));
}
const tight = t => String(t).replace(/([^\x00-\x7f]) (?=[^\x00-\x7f])/g, '$1'); // 改行の跡のすき間を詰める
const isEx = id => /-ex\d+$/.test(id);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let STAGES = [];
function buildStages() {
  STAGES = [];
  for (const ch of CHAPS) {
    const secs = SECS.filter(s => s.chapter === ch.id), parts = SPLIT[ch.id] || [secs.length];
    let k = 0;
    parts.forEach((n, i) => { STAGES.push({ id: SPLIT[ch.id] ? ch.id + 'abc'[i] : String(ch.id), chapter: ch.id, part: SPLIT[ch.id] ? i + 1 : 0, title: ch.title, secs: secs.slice(k, k + n) }); k += n; });
  }
}
const stageOf = s => STAGES.find(st => st.secs.includes(s));
const stageName = st => st.part ? `${st.title}（${'①②③'[st.part - 1]}）` : st.title;
const chBossDone = c => STAGES.filter(st => st.chapter === c).every(st => has(state.boss, st.id));
const chTitle = id => CHAPS.find(c => c.id === id)?.title || '';
function level() { let l = 1, t = 0, step = 20; while (t + step <= state.crickets) { t += step; l++; step += 10; } return { level: l, base: t, next: t + step }; }
function streak() { let n = 0, d = today(); if (!state.days.includes(d)) d = addDays(d, -1); while (state.days.includes(d)) { n++; d = addDays(d, -1); } return n; }
function markActive(noCount) { // 1問解くごとに呼ぶ。その日に10問解いたら連続日数に数える（例題は数えない）
  const t = today(); if (!state.active.includes(t)) state.active.push(t);
  if (noCount) return;
  state.dayCount[t] = (state.dayCount[t] || 0) + 1;
  if (state.dayCount[t] >= 10) markStreakDay();
}
function markStreakDay() {
  if (!state.days.includes(today())) { state.days.push(today()); state.days.sort(); }
  state.bestStreak = Math.max(state.bestStreak, streak());
}
const idleDays = () => state.active.length ? dayDelta(today(), state.active[state.active.length - 1]) : 0;

function due() {
  return Object.entries(state.review)
    .filter(([, v]) => v && v.step < 3 && v.due && v.due <= today())
    .map(([id, v]) => ({ ...qBy(id), due: v.due, step: v.step }))
    .filter(q => q.id).sort((a, b) => a.due.localeCompare(b.due));
}
function capByChapter(items, size, max = 4) {
  const taken = [], counts = {};
  for (const q of items) { if (taken.length >= size) break; const c = q.section.chapter; if ((counts[c] || 0) < max) { taken.push(q); counts[c] = (counts[c] || 0) + 1; } }
  for (const q of items) { if (taken.length >= size) break; if (!taken.includes(q)) taken.push(q); }
  return taken;
}
function chapterMissRate(ch) {
  let a = 0, c = 0;
  for (const s of SECS.filter(s => s.chapter === ch)) for (const q of s.questions) { const h = state.history[q.id]; if (h) { a += h.attempts; c += h.correct; } }
  return a ? 1 - c / a : 0.5;
}
function dailyQuestions() {
  const ph = phase(), drillSlots = ph.n === 4 ? 2 : 0, size = 10 - drillSlots;
  const rev = capByChapter(due(), size);
  let pool = SECS.filter(s => !ph.chapters || ph.chapters.includes(s.chapter));
  if (ph.n === 4) pool = [...pool].sort((a, b) => (has(state.boss, stageOf(a).id) - has(state.boss, stageOf(b).id)) || (chapterMissRate(b.chapter) - chapterMissRate(a.chapter)));
  const regular = [];
  for (const s of pool) for (const q of s.questions) if (!rev.some(r => r.id === q.id)) regular.push({ ...q, section: s });
  const order = new Map(regular.map((q, i) => [q.id, i]));
  if (ph.n !== 4) regular.sort((a, b) => ((state.history[a.id]?.attempts || 0) - (state.history[b.id]?.attempts || 0)) || (order.get(a.id) - order.get(b.id)));
  let list = rev.concat(capByChapter(regular, size - rev.length));
  if (list.length < size) for (const s of SECS) for (const q of s.questions) { if (list.length >= size) break; if (!list.some(x => x.id === q.id)) list.push({ ...q, section: s }); }
  for (let i = 0; i < drillSlots; i++) list.push(drillAsQuestion());
  return list;
}
function todayPlan() {
  const left = dayDelta(state.exam, today()), notCleared = SECS.filter(s => !has(state.cleared, s.id)).length;
  const studyDays = Math.max(1, left - 14);
  return { left, perDay: notCleared ? Math.ceil(notCleared / studyDays) : 0, notCleared };
}

// ---------- 答えの記録 ----------
function reward(qid, correct) {
  const h = state.history[qid] || { attempts: 0, correct: 0 };
  h.attempts++; if (correct) h.correct++; h.last = today(); state.history[qid] = h;
  const r = state.review[qid];
  if (correct) {
    const key = `${today()}:${qid}`;
    if (!state.practiceAwarded[key]) { bump('crickets'); state.practiceAwarded[key] = true; }
    if (r && r.step < 3 && r.due && r.due <= today()) {
      r.step++;
      if (r.step >= 3) { r.due = null; bump('crickets', 3); } else r.due = addDays(today(), r.step === 1 ? 3 : 7);
    }
  } else state.review[qid] = { step: 0, due: addDays(today(), 1) };
  markActive(isEx(qid)); save();
}

// ---------- 画面の状態 ----------
let openChaps = null;
let page = 'home', sectionId = null, quiz = null, drill = null, stopAnim = null;
let typeTimer = null;
function typeInto(id, text) {
  const el = $(id); if (!el) return; clearInterval(typeTimer);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = text; return; }
  let i = 0; el.textContent = '';
  typeTimer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typeTimer); }, 60);
}
function main(html) {
  if (stopAnim) { stopAnim(); stopAnim = null; }
  clearInterval(typeTimer);
  $('app').innerHTML = html; chrome();
  document.querySelectorAll('#tabs button').forEach(el => el.classList.toggle('on', el.dataset.page === page));
  document.body.dataset.page = page;
}
function chrome() {
  const g = $('brand-gecko');
  if (g && !g.children.length && window.KIKO) g.innerHTML = `<img class="pixel" src="${KIKO.png.tiny.mini}" alt="">`;
  document.querySelectorAll('[data-ic]').forEach(el => { if (!el.children.length) el.innerHTML = ic(el.dataset.ic, 'tab'); });
  const l = $('sync-label'); if (l) l.innerHTML = syncLabel();
}
function kikoImg(kind, width = 144, id = '') {
  const f = KIKO.png.anim[kind] || KIKO.png.anim.awake;
  return `<img class="pixel" ${id ? `id="${id}"` : ''} src="${f[0]}" width="${width}" alt="キコちゃん">`;
}
function animate(id, kind, ms = 300, loops = 0) {
  const img = $(id); if (!img || !window.KIKO) return;
  stopAnim = KIKO.play(img, KIKO.png.anim[kind], ms, loops);
}
function setPage(p) { const same = p === page; page = p; quiz = null; if (p !== 'drill') drill = null; if (!same) pushNav(); scrollTo(0, 0); render(); }
// 画面を切り替えるたびに履歴を残し、ブラウザの「戻る」やスワイプで前の画面に戻れるようにする
function pushNav() { try { history.pushState({ page, sectionId }, ''); } catch (_) {} }
window.addEventListener('popstate', e => {
  if (ignorePop) { ignorePop = false; return; }
  if (modalOpen()) { closeModal(true); return; } // 窓が開いていたら、最初の「戻る」は窓を閉じるだけ
  const st = e.state || { page: 'home' };
  if (quiz && page === 'quiz' && !confirm('問題をやめますか？')) { pushNav(); return; }
  page = st.page === 'quiz' || st.page === 'finish' ? 'home' : st.page; sectionId = st.sectionId || sectionId;
  quiz = null; if (page !== 'drill') drill = null; render(); scrollTo(0, 0);
});

// ---------- ホーム ----------
function home() {
  const lv = level(), plan = todayPlan(), ph = phase(), rev = due().length, idle = idleDays();
  const h = new Date().getHours(), night = h >= 23 || h < 6, sleeping = night || idle >= 2;
  const doneToday = state.days.includes(today());
  const revN = Math.min(rev, ph.n === 4 ? 8 : 10);
  const bub = idle >= 2 ? 'ひさしぶり…' : night ? 'ねむい… zzz' : doneToday ? 'きょうも おつかれ！' : plan.left >= 0 ? `試験まで あと${plan.left}日` : 'がんばろう！';
  main(`
  <section class="yard dotsbg ${night ? 'night' : ''}">
    <div class="walker ${sleeping ? 'still' : ''}"><span class="kbub dot">${esc(bub)}</span><img class="pxi" id="home-kiko" src="${sleeping ? KIKO.png.tiny.sleep[0] : KIKO.png.walkRight[0]}" alt="キコちゃん"></div>
  </section>
  <section class="panel">
    <div class="sh"><h2>キコちゃん Lv.${lv.level}</h2><span class="muted">${ic('cricket')}${state.crickets}匹</span></div>
    <div class="progress"><div style="width:${Math.round((state.crickets - lv.base) / (lv.next - lv.base) * 100)}%"></div></div>
    <div class="stats">
      <div class="stat"><b class="dot">${plan.left >= 0 ? plan.left : '—'}</b><small>試験まで</small></div>
      <div class="stat"><b class="dot">${streak()}</b><small>連続</small></div>
      <div class="stat"><b class="dot">${state.cleared.length}<i>/36</i></b><small>節クリア</small></div>
    </div>
  </section>
  <button class="button pop full" id="start-daily">${state.dailyDone.includes(today()) ? ic('check') : ''}今日はこれだけ（10問）</button>
  <p class="muted center">復習 ${revN} ／ 新しい問題 ${10 - revN - (ph.n === 4 ? 2 : 0)}${ph.n === 4 ? ' ／ 計算 2' : ''}</p>
  <section class="panel strong">
    <div class="sh"><h2>${ph.name}</h2><span class="muted">${esc(ph.note)}</span></div>
    <p>優先：<b class="nb">${chapterLabel(ph.chapters)}</b>${plan.notCleared && ph.n < 4 ? `<span class="muted nb"> ／ 目安 1日${plan.perDay}節</span>` : ''}</p>
  </section>
  ${state.lastSection ? `<button class="mini full" id="resume">${ic('book')}つづき：${esc(secBy(state.lastSection)?.title || '')}</button>` : ''}`);
  const img = $('home-kiko');
  if (img) stopAnim = sleeping ? KIKO.play(img, KIKO.png.tiny.sleep, 440, 0) : KIKO.play(img, KIKO.png.walkRight, 220, 0);
  $('start-daily').onclick = () => startQuiz(dailyQuestions(), 'daily');
  if ($('resume')) $('resume').onclick = () => openLesson(state.lastSection);
}

// ---------- マップ ----------
const unlockedSec = s => s.number === 1 || has(state.cleared, `${s.chapter}-${s.number - 1}`);
function map() {
  const ph = phase();
  let html = '<h2>' + ic('map') + 'マップ</h2>';
  const cur = secBy(state.lastSection), curSt = cur ? stageOf(cur).id : STAGE_IDS[0];
  for (const st of STAGES) {
    const ch = { id: st.id }, secs = st.secs, done = secs.filter(s => has(state.cleared, s.id)).length;
    const pri = ph.chapters && ph.chapters.includes(st.chapter);
    const open = openChaps ? openChaps.has(st.id) : (ph.chapters ? pri && (!st.part || st.id === curSt || !secs.every(s => has(state.cleared, s.id)) && STAGES.filter(x => x.chapter === st.chapter).find(x => !x.secs.every(s => has(state.cleared, s.id))) === st) : curSt === st.id);
    html += `<details class="chapter ${pri ? 'priority' : ''}" data-ch="${st.id}" ${open ? 'open' : ''}><summary class="chapter-header"><div class="chapter-num">${st.chapter}${st.part ? '<small>' + '①②③'[st.part - 1] + '</small>' : ''}</div><div style="flex:1"><h3>${esc(stageName(st))}</h3><div class="muted">${done}/${secs.length}節${has(state.boss, ch.id) ? ' ／ ' + ic('trophy') : ''}</div></div>${pri ? '<span class="pill gold">優先</span>' : ''}<span class="chev"></span></summary><div class="stage-list">`;
    for (const s of secs) html += `<button class="stage" data-stage="${s.id}"><span>${s.number}. ${esc(s.title)}</span><span class="tag">${has(state.cleared, s.id) ? ic('check') : unlockedSec(s) ? ic('play') : ic('lock')}</span></button>`;
    html += `</div><button class="button gold full boss-btn" data-boss="${ch.id}" ${done !== secs.length ? 'disabled' : ''}>${ic('crown')}ボス戦${has(state.boss, ch.id) ? '（再挑戦）' : ''}</button></details>`;
  }
  main(html);
  document.querySelectorAll('details.chapter').forEach(d => d.ontoggle = () => { openChaps = new Set([...document.querySelectorAll('details.chapter[open]')].map(x => x.dataset.ch)); });
  document.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => openLesson(b.dataset.stage));
  document.querySelectorAll('[data-boss]').forEach(b => b.onclick = () => startBoss(b.dataset.boss));
}
function openLesson(id, showText = false) {
  sectionId = id; state.lastSection = id; save();
  page = 'lesson'; quiz = null; pushNav(); render(); scrollTo(0, 0);
  if (showText) { const el = $('full-text'); if (el) { el.hidden = false; $('toggle-text').innerHTML = ic('book') + '閉じる'; } }
}

// ---------- 節 ----------
function fmtText(raw, inline) {
  const w = l => [...l].reduce((a, c) => a + (c.charCodeAt(0) < 256 ? 0.5 : 1), 0);
  const HEAD = /^(解説|例題|練習問題|答えと解説)$/;
  const out = [];
  for (let l of raw.replace(/\u200b/g, '').split('\n')) {
    l = l.replace(/^●\s+/, '● ');
    const prev = out[out.length - 1];
    if (prev && prev.trim() && l.trim() && !/^\s*●/.test(l) && !HEAD.test(prev) &&
      (/^\s{2,}/.test(l) || (w(prev) >= 39 && !/[。：]$/.test(prev) && !/^(答え|例題|解説|練習問題|問\d|\(\d|（\d)/.test(l)))) {
      out[out.length - 1] = prev + l.trim();
    } else out.push(l);
  }
  const NG = /^(何|それぞれ何|これ|それ|この|こう|そう)$/;
  const kw = t => t.replace(/([^\x00-\x7f]) (?=[^\x00-\x7f])/g, '$1')
    .replace(/[^。]*?(大切|重要|前提|ポイント)[^。]*。/g, m => `<span class="imp">${m}</span>`)
    .replace(/「([^「」\n]{2,20})」(?=と(も)?(いいます|いい、|呼ばれ|呼びます|呼ぶ))/g, '「<b class="kw">$1</b>」')
    .replace(/([^\s、。をはがにでも「」：>]{2,20}?)(?=と(も)?(いいます|いい、|呼ばれ|呼びます|呼ぶ))/g, (m, t) => NG.test(t) || /^[）)れ]/.test(t) || /→|ほしい|する$|書く/.test(t) || (t.split('（').length !== t.split('）').length) || t.includes('<') ? m : `<b class="kw">${t}</b>`);
  if (inline) return raw.replace(/\u200b/g, '').split(/\n\s*\n/).map(b => kw(b.split('\n').map(x => x.trim()).join(''))).filter(Boolean).join('<br>');
  return out.map(l => {
    const t = l.trim(); if (!t) return '';
    if (HEAD.test(t)) return `<h4 class="tab"><span>${t}</span></h4>`;
    let m = t.match(/^● ([^：]{1,30})：(.*)$/);
    if (m) return `<div class="pt"><b class="pt-h">${m[1]}</b><p>${kw(m[2])}</p></div>`;
    if ((m = t.match(/^● (.*)$/))) return `<div class="pt"><p>${kw(m[1])}</p></div>`;
    if ((m = t.match(/^答え：(.*)$/))) return `<p class="ans"><b class="ans-h">答え</b>${kw(m[1])}</p>`;
    return `<p>${kw(t)}</p>`;
  }).join('');
}
function lesson() {
  const s = secBy(sectionId); if (!s) return setPage('map');
  const open = unlockedSec(s);
  const hd = t => fmtText(esc(t));
  const parts = splitText(s), exs = examplesOf(s);
  const body = hd(parts.before) + (exs.length ? '<h4 class="tab"><span>例題</span></h4>' + exs.map(e => `<div class="excard" data-ex="${e.id}"><div class="exq"><b class="qno">例${e.n}</b><p>${fmtText(esc(e.stem), 1)}</p></div><button class="mini full" data-peek>答えを見る</button><div class="exa" hidden><p><b class="ans-h">答え</b>${fmtText(esc(e.ans), 1)}</p><div class="button-row"><button class="button secondary" data-grade="1">わかった</button><button class="button" data-grade="0">まちがえた</button></div></div></div>`).join('') : hd(parts.ex)) + hd(parts.after);
  main(`<div class="reading">
    <div class="label">第${s.chapter}章 ${esc(chTitle(s.chapter))}</div>
    <div class="section-top"><h2>${s.number}. ${esc(s.title)}</h2>${has(state.cleared, s.id) ? '<span class="pill gold">' + ic('check') + '</span>' : ''}</div>
    <div class="summary">${s.summary.map(t => `<p>${ic('sprout')}<span>${esc(tight(t))}</span></p>`).join('')}</div>
    <div class="button-row"><button id="toggle-text" class="button secondary">${ic('book')}読む</button><button id="stage-quiz" class="button" ${open ? '' : 'disabled'}>${ic('pencil')}4問</button></div>
    ${open ? '' : '<p class="note">' + ic('lock') + '前の節をクリアすると解けます</p>'}
    <div id="full-text" class="lesson-text" hidden>${body}</div>
    <div class="button-row"><button id="prev-section" class="button secondary">← 前</button><button id="next-section" class="button secondary">次 →</button></div>
  </div>`);
  $('toggle-text').onclick = () => {
    const el = $('full-text'); el.hidden = !el.hidden;
    if (!el.hidden && !has(state.read, s.id)) { state.read.push(s.id); save(); }
    $('toggle-text').innerHTML = ic('book') + (el.hidden ? '読む' : '閉じる');
  };
  document.querySelectorAll('.excard').forEach(c => {
    c.querySelector('[data-peek]').onclick = e => { e.target.remove(); c.querySelector('.exa').hidden = false; };
    c.querySelectorAll('[data-grade]').forEach(b => b.onclick = () => { const ok = b.dataset.grade === '1'; reward(c.dataset.ex, ok); b.parentNode.outerHTML = `<p class="exdone">${ok ? ic('check') + 'OK' : ic('loop') + '復習ボックスに入れました'}</p>`; });
  });
  $('stage-quiz').onclick = () => startQuiz(s.questions.map(q => ({ ...q, section: s })), 'stage', s.id);
  const i = SECS.findIndex(a => a.id === s.id);
  $('prev-section').disabled = i === 0;
  $('prev-section').onclick = () => openLesson(SECS[i - 1].id);
  $('next-section').onclick = () => i >= SECS.length - 1 ? setPage('map') : openLesson(SECS[i + 1].id);
}

// ---------- クイズ ----------
// 選択肢の並びを毎回シャッフルし、解説の中の記号（「イは〜」など）も付け替える
function shuffleChoices(q) {
  if (q.drill || q.example || !q.options || q.options.length !== 4) return q;
  const perm = shuffle([0, 1, 2, 3]), pos = perm.map((_, j) => perm.indexOf(j));
  const explanation = q.explanation.replace(/(^|[^ァ-ヶー])([アイウエ])(?![ァ-ヶー])/g, (m, p1, k) => p1 + KANA[pos[KANA.indexOf(k)]]);
  return { ...q, options: perm.map(j => q.options[j]), answer: pos[q.answer], explanation: explanation.replace(/([^\x00-\x7f]) (?=[^\x00-\x7f])/g, '$1') };
}
function startQuiz(qs, mode, id) {
  if (!qs.length) return;
  qs = qs.map(shuffleChoices);
  quiz = { questions: qs, index: 0, answered: false, mode, answer: null, correctCount: 0, section: id };
  page = 'quiz'; pushNav(); scrollTo(0, 0); render();
}
function startBoss(id) {
  const st = STAGES.find(x => x.id === id); if (!st) return;
  const pool = st.secs.flatMap(s => s.questions.map(q => ({ ...q, section: s })));
  startQuiz(shuffle(pool).slice(0, 10), 'boss', id);
}
const modeLabel = m => (ic({ boss: 'crown', daily: 'sun', review: 'loop', stage: 'pencil' }[m]) + { boss: 'ボス戦', daily: '今日はこれだけ', review: '復習', stage: '節の問題' }[m]);
function quizView() {
  if (!quiz) return setPage('home');
  const q = quiz.questions[quiz.index]; if (!q) return quizFinish();
  if (q.example) return exampleView(q);
  const show = quiz.answered, ok = quiz.answer === q.answer, s = q.section;
  const choices = q.options.map((opt, i) => `<button class="choice ${show ? (i === q.answer ? 'correct' : i === quiz.answer ? 'wrong' : '') : ''}" data-answer="${i}" ${show ? 'disabled' : ''}><b>${KANA[i]}</b>${esc(opt)}</button>`).join('');
  main(`<div class="section-top"><div><div class="label">${modeLabel(quiz.mode)}</div><h2>${q.drill ? ic('calc') + '計算' : esc(s.title)}</h2></div><span class="pill">${quiz.index + 1}/${quiz.questions.length}</span></div>
  <div class="progress"><div style="width:${quiz.index / quiz.questions.length * 100}%"></div></div>
  <div class="question-card"><h3>${esc(q.stem)}</h3>
    ${q.drill ? '<button class="button secondary small" id="calc-toggle">' + ic('calc') + '電卓</button><div id="calc-slot"></div>' : ''}
    <div class="choices">${choices}</div>
    ${show ? `<div class="rpg"><p id="rpg-msg"></p></div><div class="explain"><p class="pre">${esc(q.explanation)}</p>${q.drill ? tipHtml(q.tip) : `<button class="button secondary small" id="read-detail">${ic('book')}この節の解説</button>`}</div>
    <button class="button full" id="next-q">${quiz.index + 1 < quiz.questions.length ? '次へ →' : '結果へ →'}</button>` : ''}
  </div>`);
  document.querySelectorAll('[data-answer]').forEach(b => b.onclick = () => answer(+b.dataset.answer));
  if (show) typeInto('rpg-msg', ok ? (q.drill ? 'せいかい！ キコは うれしそう！' : 'せいかい！ キコは コオロギを もらった！') : `ざんねん… せいかいは ${KANA[q.answer]} だよ`);
  if ($('calc-toggle')) $('calc-toggle').onclick = () => toggleCalc('calc-slot');
  if (!show) return;
  $('next-q').onclick = () => { quiz.index++; quiz.answered = false; quiz.answer = null; render(); scrollTo(0, 0); };
  if ($('read-detail')) $('read-detail').onclick = () => modal(`${ic('book')}${esc(s.title)}`, `<div class="summary">${s.summary.map(t => `<p>${ic('sprout')}<span>${esc(tight(t))}</span></p>`).join('')}</div><div class="lesson-text">${fmtText(esc(s.text))}</div>`);
}
function exampleView(q) {
  const show = quiz.answered, ok = quiz.answer === 0, s = q.section;
  main(`<div class="section-top"><div><div class="label">${modeLabel(quiz.mode)}</div><h2>${esc(s.title)}</h2></div><span class="pill">${quiz.index + 1}/${quiz.questions.length}</span></div>
  <div class="progress"><div style="width:${quiz.index / quiz.questions.length * 100}%"></div></div>
  <div class="question-card"><div class="label">例題</div><h3>${fmtText(esc(q.stem), 1)}</h3>
    ${quiz.peek || show ? `<div class="explain"><p><b class="ans-h">答え</b>${fmtText(esc(q.ans), 1)}</p></div>` : '<button class="button full" id="peek">答えを見る</button>'}
    ${quiz.peek && !show ? '<div class="button-row"><button class="button secondary" data-self="1">わかった</button><button class="button" data-self="0">まちがえた</button></div>' : ''}
    ${show ? `<div class="rpg"><p id="rpg-msg"></p></div><button class="button full" id="next-q">${quiz.index + 1 < quiz.questions.length ? '次へ →' : '結果へ →'}</button>` : ''}
  </div>`);
  if ($('peek')) $('peek').onclick = () => { quiz.peek = true; render(); };
  document.querySelectorAll('[data-self]').forEach(b => b.onclick = () => answer(b.dataset.self === '1' ? 0 : 1));
  if (!show) return;
  typeInto('rpg-msg', ok ? 'よし！ キコも うなずいてる！' : 'だいじょうぶ！ ふくしゅうで また でるよ');
  $('next-q').onclick = () => { quiz.index++; quiz.answered = false; quiz.answer = null; quiz.peek = false; render(); scrollTo(0, 0); };
}
function answer(i) {
  if (quiz.answered) return;
  const q = quiz.questions[quiz.index], ok = i === q.answer;
  quiz.answered = true; quiz.answer = i; if (ok) quiz.correctCount++;
  if (q.drill) { if (ok) { bump('drillCorrect'); bump('drillCounter'); if (state.drillCounter % 2 === 0) bump('crickets'); } markActive(); save(); }
  else reward(q.id, ok);
  render();
}
function quizFinish() {
  const qz = quiz, n = qz.questions.length, score = Math.round(qz.correctCount / n * 100), pass = score >= 70;
  let msg = '';
  if (qz.mode === 'boss') {
    if (pass && !has(state.boss, qz.section)) { state.boss = stageSort([...state.boss, qz.section]); bump('specialFood'); msg = '特別なエサをゲット！'; }
    else msg = pass ? 'クリア！' : '70%でクリア';
  }
  if (qz.mode === 'stage') {
    if (pass && !has(state.cleared, qz.section)) { state.cleared.push(qz.section); msg = '節クリア！次の節がひらいたよ'; }
    else if (!pass) msg = '3問正解でクリア';
  }
  if (qz.mode === 'daily') { if (!state.dailyDone.includes(today())) state.dailyDone.push(today()); markStreakDay(); msg = `連続 ${streak()}日`; }
  save(); pushCloud(true);
  quiz = null; page = 'finish'; try { history.replaceState({ page: 'home' }, ''); } catch (_) {}
  const line = qz.mode === 'boss' ? (pass ? (msg.includes('エサ') ? 'ボスを たおした！ キコは とくべつな エサを もらった！' : 'ボスを たおした！') : 'ボスは つよかった… もういちど いどもう')
    : qz.mode === 'stage' ? (pass ? (msg.includes('ひらいた') ? 'せつ クリア！ つぎの せつが ひらいた！' : 'せつ クリア！') : 'あと すこし！ 3もん せいかいで クリア')
    : qz.mode === 'daily' ? `きょうの ぶん おわり！ れんぞく ${streak()}にち！` : 'ふくしゅう おわり！';
  main(`<h2 class="center">${modeLabel(qz.mode)}</h2><div class="score dot center">${qz.correctCount}<i>/${n}</i></div>
    <div class="rpg"><img class="pxi" id="finish-kiko" src="${KIKO.png.anim[pass ? 'dance' : 'awake'][0]}" alt=""><p id="rpg-msg"></p></div>
    <div class="button-row"><button class="button" id="quiz-home">ホーム</button><button class="mini" id="quiz-map">マップ</button></div>`);
  animate('finish-kiko', pass ? 'dance' : 'awake', 300);
  typeInto('rpg-msg', line);
  $('quiz-home').onclick = () => setPage('home');
  $('quiz-map').onclick = () => setPage('map');
}

// ---------- 復習 ----------
function review() {
  const d = due(), all = Object.values(state.review), grad = all.filter(v => v.step >= 3).length, waiting = all.length - grad - d.length;
  main(`<h2>${ic('loop')}復習ボックス</h2>
  <div class="stats"><div class="stat"><b>${d.length}</b><small>今日</small></div><div class="stat"><b>${waiting}</b><small>待機中</small></div><div class="stat"><b>${grad}</b><small>卒業</small></div></div>
  <p class="muted">翌日 → 3日後 → 7日後。3回続けて正解で卒業</p>
  <button class="button full" id="start-review" ${d.length ? '' : 'disabled'}>${ic('play')}復習する</button>
  <div class="stage-list" style="margin-top:12px">${d.slice(0, 20).map(q => `<div class="stage"><span>${esc(q.section.title)}</span><span class="tag">${'●'.repeat(q.step)}${'○'.repeat(3 - q.step)}</span></div>`).join('') || '<p class="empty">今日の復習はありません</p>'}</div>`);
  $('start-review').onclick = () => startQuiz(capByChapter(d, 10), 'review');
}

// ---------- 正規分布表 ----------
function upperP(k) { // 標準正規分布の上側確率
  const z = Math.abs(k) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
  const erfc = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z);
  const p = erfc / 2; return k >= 0 ? p : 1 - p;
}
const P4 = k => Number(upperP(k).toFixed(4));
function normalTable() {
  let h = '<div class="ntable-wrap"><table class="ntable"><tr><th>Kp</th>';
  for (let c = 0; c < 10; c++) h += `<th>.0${c}</th>`;
  h += '</tr>';
  for (let r = 0; r <= 30; r++) {
    h += `<tr><th>${(r / 10).toFixed(1)}</th>`;
    for (let c = 0; c < 10; c++) h += `<td>${P4(r / 10 + c / 100).toFixed(4).slice(1)}</td>`;
    h += '</tr>';
  }
  return h + '</table></div><p class="muted">Kp（行＋列）→ 上側確率 P</p>';
}

// ---------- 計算ドリル ----------
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[rand(0, a.length - 1)];
const rnd = (n, p = 2) => Number(Number(n).toFixed(p));
const sum = a => a.reduce((x, y) => x + y, 0);
const XR = { 2: [1.880, 3.267], 3: [1.023, 2.574], 4: [0.729, 2.282], 5: [0.577, 2.114] };

const DRILLS = [
  ['stats', '基本統計量'],
  ['transform', 'データ変換'],
  ['hist', 'ヒストグラム'],
  ['normal', '正規分布表'],
  ['binom', '二項分布'],
  ['xbar', 'x̄-R管理図'],
  ['np', 'np管理図'],
  ['p', 'p管理図'],
  ['cp', 'Cp'],
  ['cpk', 'Cpk'],
  ['oneside', '片側規格'],
  ['corr', '相関係数']
];
function makeDrill(type) {
  let stem, ans, steps, d = 2, traps = [], options = null;
  switch (type) {
    case 'stats': {
      const n = 5, xs = Array.from({ length: n }, () => rand(4, 16)), m = sum(xs) / n;
      const S = sum(xs.map(x => (x - m) ** 2)), sub = pick(['mean', 'S', 'V', 's']);
      const data = xs.join('、');
      if (sub === 'mean') { stem = `データ ${data} の平均 x̄ は？`; ans = rnd(m, 1); d = 1; steps = `x̄ ＝ 合計 ÷ n\n＝ ${sum(xs)} ÷ ${n}\n＝ ${ans}`; traps = [rnd(m + 1, 1), rnd(m - 1, 1), rnd(sum(xs) / (n - 1), 1)]; }
      if (sub === 'S') { stem = `データ ${data} の平方和 S は？（小数第1位）`; ans = rnd(S, 1); d = 1; steps = `S ＝ Σx² − (Σx)² ÷ n\n＝ ${sum(xs.map(x => x * x))} − ${sum(xs)}² ÷ ${n}\n＝ ${ans}`; traps = [rnd(S / (n - 1), 1), rnd(S / n, 1), rnd(Math.sqrt(S), 1)]; }
      if (sub === 'V') { stem = `データ ${data} の不偏分散 V は？（小数第2位）`; ans = rnd(S / (n - 1)); steps = `S ＝ ${rnd(S, 2)}\nV ＝ S ÷ (n−1) ＝ ${rnd(S, 2)} ÷ ${n - 1}\n＝ ${ans}`; traps = [rnd(S / n), rnd(S), rnd(Math.sqrt(S / (n - 1)))]; }
      if (sub === 's') { stem = `データ ${data} の標準偏差 s は？（小数第2位）`; ans = rnd(Math.sqrt(S / (n - 1))); steps = `S ＝ ${rnd(S, 2)}、V ＝ S ÷ ${n - 1} ＝ ${rnd(S / (n - 1), 3)}\ns ＝ √V ＝ ${ans}`; traps = [rnd(S / (n - 1)), rnd(Math.sqrt(S / n)), rnd(Math.sqrt(S))]; }
      break;
    }
    case 'transform': {
      const a = rand(5, 9) * 10, h = pick([10, 100]), n = 6, ys = Array.from({ length: n }, () => rand(-4, 9));
      const Sy = sum(ys.map(y => y * y)) - sum(ys) ** 2 / n, sub = pick(['mean', 'S']);
      const head = `y ＝ (x − ${a}) × ${h} と変換した。n＝${n}、Σy＝${sum(ys)}、Σy²＝${sum(ys.map(y => y * y))}。`;
      if (sub === 'mean') { d = 3; ans = rnd(a + sum(ys) / n / h, 3); stem = head + 'もとの平均 x̄ は？'; steps = `ȳ ＝ ${sum(ys)} ÷ ${n} ＝ ${rnd(sum(ys) / n, 3)}\nx̄ ＝ a ＋ ȳ ÷ h ＝ ${a} ＋ ${rnd(sum(ys) / n, 3)} ÷ ${h}\n＝ ${ans}`; traps = [rnd(a + sum(ys) / n, 3), rnd(a + sum(ys) / n * h, 3), rnd(a - sum(ys) / n / h, 3)]; }
      else { d = 4; ans = rnd(Sy / h / h, 4); stem = head + 'もとの平方和 S は？'; steps = `Sy ＝ Σy² − (Σy)² ÷ n ＝ ${rnd(Sy, 3)}\nS ＝ Sy ÷ h² ＝ ${rnd(Sy, 3)} ÷ ${h * h}\n＝ ${ans}`; traps = [rnd(Sy / h, 4), rnd(Sy, 4), rnd(Sy / h / h / (n - 1), 4)]; }
      break;
    }
    case 'hist': {
      const u = pick([0.1, 1, 0.01]), dp = u === 1 ? 0 : u === 0.1 ? 1 : 2, mn = rnd(rand(100, 400) * u, dp);
      d = dp + 1; ans = rnd(mn - u / 2, d);
      stem = `最小値 ${mn}、測定単位 ${u} のとき、第1区間の下側境界値は？`;
      steps = `下側境界値 ＝ 最小値 − 測定単位 ÷ 2\n＝ ${mn} − ${u} ÷ 2\n＝ ${ans}`;
      traps = [rnd(mn - u, d), rnd(mn + u / 2, d), mn];
      break;
    }
    case 'normal': {
      const sub = pick(['kp', 'p', 'x']);
      if (sub === 'kp') { const k = rnd(rand(5, 30) / 10 + rand(0, 9) / 100, 2); d = 4; ans = P4(k); stem = `Kp ＝ ${k.toFixed(2)} のとき、上側確率 P は？（正規分布表）`; steps = `表の ${Math.floor(k * 10) / 10} の行、.0${Math.round(k * 100) % 10} の列\nP ＝ ${ans}`; traps = [P4(k + 0.1), P4(k - 0.1), rnd(1 - ans, 4)]; }
      if (sub === 'p') { const k = rnd(rand(10, 25) / 10 + rand(0, 9) / 100, 2), P = P4(k); d = 2; ans = k; stem = `上側確率 P ＝ ${P.toFixed(4)} となる Kp は？（正規分布表）`; steps = `表の中から ${P.toFixed(4)} を探す\nKp ＝ ${k.toFixed(2)}`; traps = [rnd(k + 0.1), rnd(k - 0.1), rnd(k + 0.01)]; }
      if (sub === 'x') { const mu = rand(40, 80), sg = pick([2, 4, 5]), k = pick([0.5, 1, 1.5, 2, 2.5]), x = mu + k * sg; d = 4; ans = P4(k); stem = `平均 ${mu}、標準偏差 ${sg} の正規分布。${x} を超える確率は？`; steps = `Kp ＝ (x − μ) ÷ σ ＝ (${x} − ${mu}) ÷ ${sg} ＝ ${k}\n表より P ＝ ${ans}`; traps = [rnd(1 - ans, 4), P4(k / 2), P4(k * sg / 10)]; }
      break;
    }
    case 'binom': {
      const n = rand(3, 6), p = pick([0.1, 0.2]), k = pick([0, 1, 2]);
      const C = [1, 1, 2, 6, 24, 120, 720], nCk = C[n] / C[k] / C[n - k];
      d = 3; ans = rnd(nCk * p ** k * (1 - p) ** (n - k), 3);
      stem = `不適合品率 ${p * 100}% の工程から ${n} 個取る。不適合品がちょうど ${k} 個の確率は？（小数第3位）`;
      steps = `P ＝ ${n}C${k} × ${p}^${k} × ${rnd(1 - p, 1)}^${n - k}\n＝ ${nCk} × ${rnd(p ** k, 4)} × ${rnd((1 - p) ** (n - k), 4)}\n＝ ${ans}`;
      traps = [rnd(p ** k * (1 - p) ** (n - k), 3), rnd(nCk * p ** k, 3), rnd(1 - ans, 3)];
      break;
    }
    case 'xbar': {
      const n = pick([2, 3, 4, 5]), [A2, D4] = XR[n], X = rnd(rand(200, 800) / 10, 1), R = rnd(rand(10, 60) / 10, 1), sub = pick(['ucl', 'lcl', 'r']);
      const head = `n＝${n}、x̿＝${X}、R̄＝${R}（A2＝${A2}、D4＝${D4}）。`;
      if (sub === 'ucl') { ans = rnd(X + A2 * R); stem = head + 'x̄管理図の UCL は？'; steps = `UCL ＝ x̿ ＋ A2 × R̄ ＝ ${X} ＋ ${A2} × ${R}\n＝ ${ans}`; traps = [rnd(X - A2 * R), rnd(X + D4 * R), rnd(X + 3 * R)]; }
      if (sub === 'lcl') { ans = rnd(X - A2 * R); stem = head + 'x̄管理図の LCL は？'; steps = `LCL ＝ x̿ − A2 × R̄ ＝ ${X} − ${A2} × ${R}\n＝ ${ans}`; traps = [rnd(X + A2 * R), rnd(X - D4 * R), rnd(X - R)]; }
      if (sub === 'r') { ans = rnd(D4 * R); stem = head + 'R管理図の UCL は？'; steps = `UCL ＝ D4 × R̄ ＝ ${D4} × ${R}\n＝ ${ans}\n（n≦6 では LCL なし）`; traps = [rnd(A2 * R), rnd(X + D4 * R), rnd(D4 * R / 2)]; }
      break;
    }
    case 'np': {
      const n = pick([50, 100, 200]), pbar = pick([0.02, 0.04, 0.05, 0.1]), np = n * pbar, sd = Math.sqrt(np * (1 - pbar)), lcl = np - 3 * sd, sub = pick(['ucl', 'lcl']);
      const head = `n＝${n}、p̄＝${pbar} の np管理図。`;
      if (sub === 'ucl') { ans = rnd(np + 3 * sd); stem = head + 'UCL は？（小数第2位）'; steps = `CL ＝ n p̄ ＝ ${rnd(np, 2)}\nUCL ＝ n p̄ ＋ 3√(n p̄(1−p̄))\n＝ ${rnd(np, 2)} ＋ 3 × √${rnd(np * (1 - pbar), 3)}\n＝ ${ans}`; traps = [rnd(np + sd), rnd(np + 3 * Math.sqrt(np)), rnd(lcl)]; }
      else { stem = head + 'LCL は？'; steps = `LCL ＝ n p̄ − 3√(n p̄(1−p̄))\n＝ ${rnd(np, 2)} − 3 × √${rnd(np * (1 - pbar), 3)} ＝ ${rnd(lcl)}\n${lcl < 0 ? 'マイナスなので LCL は「なし」' : ''}`; if (lcl < 0) { options = shuffle(['なし', '0', String(rnd(lcl)), String(rnd(np - sd))]); ans = options.indexOf('なし'); } else { ans = rnd(lcl); traps = [rnd(np + 3 * sd), rnd(np - sd), rnd(np - 3 * Math.sqrt(np))]; } }
      break;
    }
    case 'p': {
      const n = pick([100, 200, 400]), pbar = pick([0.02, 0.05, 0.1]), w = 3 * Math.sqrt(pbar * (1 - pbar) / n);
      d = 4; ans = rnd(pbar + w, 4);
      stem = `n＝${n}、p̄＝${pbar} の p管理図。UCL は？（小数第4位）`;
      steps = `UCL ＝ p̄ ＋ 3√(p̄(1−p̄) ÷ n)\n＝ ${pbar} ＋ 3 × √(${rnd(pbar * (1 - pbar), 4)} ÷ ${n})\n＝ ${ans}`;
      traps = [rnd(pbar + 3 * Math.sqrt(pbar * (1 - pbar)), 4), rnd(pbar + Math.sqrt(pbar * (1 - pbar) / n), 4), rnd(pbar - w, 4)];
      break;
    }
    case 'cp': {
      const s = pick([0.5, 1, 2, 2.5]), c = rand(40, 60), half = rnd(s * pick([2, 3, 4, 5, 6]), 1), SL = rnd(c - half, 1), SU = rnd(c + half, 1);
      ans = rnd((SU - SL) / (6 * s)); stem = `規格 ${SL}〜${SU}、標準偏差 s＝${s}。Cp は？（小数第2位）`;
      steps = `Cp ＝ (SU − SL) ÷ 6s ＝ (${SU} − ${SL}) ÷ (6 × ${s})\n＝ ${ans}`; traps = [rnd((SU - SL) / (3 * s)), rnd((SU - SL) / s / 6 * 2), rnd(half / (6 * s))];
      break;
    }
    case 'cpk': {
      const s = pick([1, 2]), c = 50, half = s * pick([4, 5, 6]), off = pick([-2, -1, 1, 2]) * s, m = c + off, SL = c - half, SU = c + half;
      const near = Math.min(SU - m, m - SL); ans = rnd(near / (3 * s));
      stem = `規格 ${SL}〜${SU}、平均 x̄＝${m}、s＝${s}。Cpk は？（小数第2位）`;
      steps = `近いほうの規格までの距離 ＝ min(${SU} − ${m}, ${m} − ${SL}) ＝ ${near}\nCpk ＝ ${near} ÷ (3 × ${s})\n＝ ${ans}`;
      traps = [rnd(Math.max(SU - m, m - SL) / (3 * s)), rnd((SU - SL) / (6 * s)), rnd(near / (6 * s))];
      break;
    }
    case 'oneside': {
      const s = pick([1, 2, 0.5]), m = rand(20, 60), dist = s * pick([3, 4, 5]), up = Math.random() < 0.5;
      const lim = up ? m + dist : m - dist; ans = rnd(dist / (3 * s));
      stem = `${up ? '上限' : '下限'}規格 ${up ? 'SU' : 'SL'}＝${lim} だけ。x̄＝${m}、s＝${s}。工程能力指数は？`;
      steps = `${up ? '(SU − x̄)' : '(x̄ − SL)'} ÷ 3s ＝ ${dist} ÷ (3 × ${s})\n＝ ${ans}`;
      traps = [rnd(dist / (6 * s)), rnd(dist / s), rnd(2 * dist / (3 * s))];
      break;
    }
    case 'corr': {
      const Sx = pick([16, 25, 36, 64, 100]), Sy = pick([4, 9, 16, 25, 49]), r = pick([-0.9, -0.8, -0.6, 0.5, 0.6, 0.7, 0.8, 0.9]);
      const Sxy = rnd(r * Math.sqrt(Sx * Sy), 2); ans = rnd(Sxy / Math.sqrt(Sx * Sy));
      stem = `Sx＝${Sx}、Sy＝${Sy}、Sxy＝${Sxy}。相関係数 r は？（小数第2位）`;
      steps = `r ＝ Sxy ÷ √(Sx × Sy) ＝ ${Sxy} ÷ √(${Sx} × ${Sy})\n＝ ${Sxy} ÷ ${rnd(Math.sqrt(Sx * Sy), 2)}\n＝ ${ans}`;
      traps = [rnd(-ans), rnd(Sxy / (Sx * Sy), 3), rnd(Sxy / Math.sqrt(Sx) )];
      break;
    }
  }
  if (!options) {
    const vals = [ans];
    for (const t of traps.concat([rnd(ans * 1.2, d), rnd(ans * 0.8, d), rnd(ans + 1, d)])) if (vals.length < 4 && Number.isFinite(t) && !vals.includes(t)) vals.push(t);
    options = shuffle(vals.map(v => String(v)));
    ans = options.indexOf(String(vals[0]));
  }
  return { type, stem, options, answer: ans, explanation: steps, tip: DRILL_TIPS[type] };
}
// つまずきポイント（解説の最後に1行）
const DRILL_TIPS = {
  stats: '不偏分散は n ではなく n−1 で割る。標準偏差 s は V の √',
  transform: '平均は ÷h してから a を足す。平方和は h² で割り、a は関係しない',
  hist: '下側境界値は「最小値 − 測定単位 ÷ 2」。測定単位そのものを引かない',
  normal: '表は上側確率。Kp の小数第1位で行、第2位で列を見る',
  binom: 'nCk × p^k × (1−p)^(n−k)。組み合わせの数 nCk のかけ忘れに注意',
  xbar: 'x̄管理図は A2、R管理図は D4。係数を取り違えない',
  np: '√ の中は n p̄(1−p̄)。LCL がマイナスなら「なし」',
  p: '√ の中は p̄(1−p̄) ÷ n。n で割るのは √ の中',
  cp: 'Cp は平均の位置を考えない。規格幅 ÷ 6s',
  cpk: '平均から近いほうの規格までの距離を 3s で割る（6s ではない）',
  oneside: '片側規格は 3s で割る。規格幅がないので 6s は使わない',
  corr: 'r は −1〜＋1。Sxy がマイナスなら r もマイナス'
};
const tipHtml = t => t ? `<p class="tip"><b class="tip-h">つまずき</b>${esc(t)}</p>` : '';
// 数字入力の答え合わせ：問題の「小数第○位」（なければ答えの桁）で四捨五入して合えば正解
function numOk(input, ansStr, stem) {
  const v = Number(String(input).replace(/[０-９．]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[−ー－]/g, '-').trim());
  const a = Number(ansStr); if (!Number.isFinite(v) || !Number.isFinite(a) || String(input).trim() === '') return false;
  const m = String(stem || '').match(/小数第([1-4１-４])位/), dec = m ? Number(m[1].replace(/[１-４]/, c => c.charCodeAt(0) - 0xFF10)) : (ansStr.split('.')[1] || '').length;
  return Math.abs(v - a) <= (dec ? 0.5 * 10 ** -dec : 0) + 1e-9;
}
function drillAsQuestion(type) {
  const t = type || pick(DRILLS)[0];
  return { ...makeDrill(t), id: 'drill', drill: true, section: { title: '計算', chapter: 0 } };
}
function drillView() {
  const inputMode = lsGet('qc-drill-input') === '1', useInput = inputMode && drill && Number.isFinite(Number(drill.options[drill.answer]));
  main(`<h2>${ic('calc')}計算ドリル</h2>
  <div class="drill-types">${DRILLS.map(([id, t]) => `<button class="chip ${drill?.type === id ? 'on' : ''}" data-type="${id}">${esc(t)}</button>`).join('')}</div>
  <div class="seg"><button class="${inputMode ? '' : 'on'}" data-mode="0">4択</button><button class="${inputMode ? 'on' : ''}" data-mode="1">数字入力</button></div>
  ${drill ? `<div class="question-card"><h3>${esc(drill.stem)}</h3>
    ${useInput ? `<form class="numform" id="num-form"><input class="input" id="num-in" inputmode="decimal" autocomplete="off" placeholder="答え" value="${esc(drill.input || '')}" ${drill.done ? 'disabled' : ''}><button class="button" ${drill.done ? 'disabled' : ''}>答える</button></form>
    ${drill.done ? `<p class="numans ${drill.picked === drill.answer ? 'ok' : 'ng'}">答え ${esc(drill.options[drill.answer])}</p>` : ''}`
    : `<div class="choices">${drill.options.map((v, i) => `<button class="choice ${drill.done ? (i === drill.answer ? 'correct' : i === drill.picked ? 'wrong' : '') : ''}" data-opt="${i}" ${drill.done ? 'disabled' : ''}><b>${KANA[i]}</b>${esc(v)}</button>`).join('')}</div>`}
    ${drill.done ? `<div class="rpg"><p id="rpg-msg"></p></div><div class="explain"><p class="pre">${esc(drill.explanation)}</p>${tipHtml(drill.tip)}</div><button class="button full" id="again">次の問題 →</button>` : ''}
  </div>` : '<p class="empty">分野を選んでね</p>'}
  <div class="button-row"><button class="button secondary" id="ntable">${ic('bar')}正規分布表</button><button class="button secondary" id="calc-toggle">${ic('calc')}電卓</button></div>
  <div id="calc-slot"></div>`);
  document.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { drill = makeDrill(b.dataset.type); render(); });
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { lsSet('qc-drill-input', b.dataset.mode === '1' ? '1' : null); if (drill && !drill.done) drill.input = ''; render(); });
  $('ntable').onclick = () => modal(ic('bar') + '正規分布表', normalTable());
  $('calc-toggle').onclick = () => toggleCalc('calc-slot');
  if (!drill) return;
  const finishDrill = picked => {
    drill.done = true; drill.picked = picked;
    if (drill.picked === drill.answer) { bump('drillCorrect'); bump('drillCounter'); if (state.drillCounter % 2 === 0) bump('crickets'); }
    markActive(); save(); render();
  };
  document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => finishDrill(+b.dataset.opt));
  if ($('num-form')) $('num-form').onsubmit = e => { e.preventDefault(); const v = $('num-in').value; if (!v.trim()) return; drill.input = v; finishDrill(numOk(v, drill.options[drill.answer], drill.stem) ? drill.answer : -1); };
  if (drill.done) typeInto('rpg-msg', drill.picked === drill.answer ? 'せいかい！ キコは うれしそう！' : `ざんねん… せいかいは ${useInput ? drill.options[drill.answer] : KANA[drill.answer]} だよ`);
  if ($('again')) $('again').onclick = () => { drill = makeDrill(drill.type); render(); };
}

// ---------- 電卓（入力した順に計算する型） ----------
function toggleCalc(slotId) {
  const slot = $(slotId); if (!slot) return;
  if (slot.innerHTML) { slot.innerHTML = ''; return; }
  slot.innerHTML = `<div class="calc"><div class="calc-screen" id="calc-screen">0</div><div class="calc-grid">${['C', '√', '←', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '＋', '0', '.', '±', '='].map(k => `<button data-key="${k}" class="${'÷×−＋='.includes(k) ? 'op' : ''}">${k}</button>`).join('')}</div></div>`;
  let cur = '0', acc = null, op = null, fresh = true, typed = false;
  const show = v => { $('calc-screen').textContent = v; };
  const fmt = n => String(Number(n.toPrecision(10)));
  const apply = (a, b) => op === '＋' ? a + b : op === '−' ? a - b : op === '×' ? a * b : op === '÷' ? a / b : b;
  slot.querySelectorAll('[data-key]').forEach(b => b.onclick = () => {
    const k = b.dataset.key;
    if (/^[0-9]$/.test(k)) { cur = fresh || cur === '0' ? k : cur + k; fresh = false; typed = true; return show(cur); }
    if (k === '.') { if (fresh) { cur = '0'; fresh = false; } if (!cur.includes('.')) cur += '.'; typed = true; return show(cur); }
    if (k === 'C') { cur = '0'; acc = null; op = null; fresh = true; typed = false; return show(cur); }
    if (k === '←') { if (!fresh) cur = cur.slice(0, -1) || '0'; return show(cur); }
    if (k === '±') { cur = fmt(-Number(cur)); typed = true; return show(cur); }
    if (k === '√') { cur = fmt(Math.sqrt(Number(cur))); fresh = true; typed = true; return show(cur); }
    const n = Number(cur);
    if (k === '=') { if (op !== null) { cur = fmt(apply(acc, n)); acc = null; op = null; } fresh = true; typed = false; return show(cur); }
    acc = op !== null && typed ? apply(acc, n) : (op !== null ? acc : n);
    op = k; fresh = true; typed = false; cur = fmt(acc); show(cur);
  });
}

// ---------- おへや ----------
const DECO = [['flag', '品質の旗'], ['books', 'データの\u200b本棚'], ['tools', '七つ道具'], ['folder', '新\u200b七つ道具'], ['dice', '確率\u200bサイコロ'], ['line', '管理図'], ['trophy', 'トロフィー'], ['cushion', '散布図\u200bクッション']];
function room() {
  const lv = level(), molts = Math.floor((lv.level - 1) / 3);
  main(`<h2>${ic('gecko')}おへや</h2>
  <div class="room-scene"><div class="room-deco">${DECO.map(([e], i) => chBossDone(i + 1) ? ic(e, 'big') : '').join('')}</div>${kikoImg('awake', 192, 'room-kiko')}<div class="room-info"><b>キコちゃん Lv.${lv.level}</b><div class="room-stats"><span>${ic('cricket')}${state.crickets}匹</span><span>${ic('sparkle')}脱皮 ${molts}回</span><span>${ic('meat')}特別なエサ ${state.specialFood}</span></div></div></div>
  <div class="panel"><div class="decor">${DECO.map(([e, n], i) => `<div class="tile ${chBossDone(i + 1) ? '' : 'locked'}">${ic(chBossDone(i + 1) ? e : 'question', 'big')}<small>${esc(n)}</small></div>`).join('')}<div class="tile ${state.boss.length === STAGE_IDS.length ? '' : 'locked'}">${ic(state.boss.length === STAGE_IDS.length ? 'crown' : 'question', 'big')}<small>王冠</small></div></div></div>
  <div class="button-row"><button class="button" id="kiko-dance">${ic('music')}あそぶ</button>${state.specialFood ? '<button class="button secondary" id="kiko-food">' + ic('meat') + 'エサをあげる</button>' : ''}</div>`);
  animate('room-kiko', 'awake', 400);
  $('kiko-dance').onclick = () => { if (stopAnim) stopAnim(); animate('room-kiko', 'dance', 300, 3); };
  if ($('kiko-food')) $('kiko-food').onclick = () => { if (stopAnim) stopAnim(); animate('room-kiko', 'food', 300, 1); };
}

// ---------- 設定 ----------
function settings() {
  const st = { synced: 'キコハウスのアカウントで同期中', nologin: 'キコハウスでログインすると同期できます', expired: 'ログインが切れました', notready: '同期の準備中（いまは端末内に保存）', offline: 'オフライン（端末内に保存）', local: '端末内に保存' }[sync.status];
  main(`<h2>${ic('gear')}設定</h2>
  <div class="panel"><h3>${ic('calendar')}試験日</h3><input class="input" type="date" value="${esc(state.exam)}" id="exam-input"><button class="button full" id="exam-save" style="margin-top:10px">保存</button></div>
  <div class="panel"><h3>${ic('cloud')}同期</h3><p>${st}</p>${sync.err && sync.status !== 'synced' ? `<p class="muted">${esc(sync.err)}</p>` : ''}
    ${['nologin', 'expired'].includes(sync.status) ? loginBox() : `<div class="button-row"><button class="button secondary" id="sync-now">今すぐ同期</button><button class="button secondary" id="copy-token">合言葉をコピー</button></div>`}</div>
  <div class="panel"><h3>${ic('bar')}記録</h3>
    <p>節クリア ${state.cleared.length}/36 ／ ボス ${state.boss.length}/${STAGE_IDS.length}</p>
    <p>解いた問題 ${Object.keys(state.history).filter(id => !isEx(id)).length}/144 ／ 計算 ${state.drillCorrect}問</p>
    <p>勉強した日 ${state.active.length}日 ／ 最高連続 ${state.bestStreak}日</p></div>
  <div class="panel"><h3>${ic('disk')}バックアップ</h3><div class="button-row"><button id="backup-export" class="button secondary">書き出す</button><button id="backup-import" class="button secondary">読み込む</button></div><input type="file" accept="application/json,.json" id="backup-file" hidden></div>`);
  $('exam-save').onclick = () => { const v = $('exam-input').value; if (!v) return; state.exam = v; save(); pushCloud(true); modal('保存しました', `試験日：${esc(slash(v))}<br>残り ${dayDelta(v, today())}日`); };
  bindLogin();
  if ($('copy-token')) $('copy-token').onclick = async () => { try { await navigator.clipboard.writeText(lsGet('kh-token') || ''); modal('コピーしました', 'ホーム画面のアプリの「合言葉」に貼ってください'); } catch (_) { modal('コピーできませんでした', ''); } };
  if ($('sync-now')) $('sync-now').onclick = async () => { await pullCloud(); render(); };
  $('backup-export').onclick = () => { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kiko-qc-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  $('backup-import').onclick = () => $('backup-file').click();
  $('backup-file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const o = JSON.parse(await f.text()); if (!o || !Array.isArray(o.cleared)) throw Error('形式が違います'); if (!confirm('今の記録と合わせて読み込みますか？')) return; state = mergeState(state, normalize(o)); save(); render(); modal('読み込みました', ''); }
    catch (err) { modal('読み込めませんでした', esc(err.message)); }
  };
}

const loginBox = () => `<a class="button full" href="${KH_LOGIN_PAGE}" >1. Googleでログイン</a>
  <p class="muted">出てきた英数字の合言葉をコピーして、下に貼る</p>
  <form id="code-form" class="code-form"><input class="input" id="code-in" placeholder="合言葉" autocomplete="off" autocapitalize="off"><button class="button">2. 入れる</button></form>`;
function bindLogin() { const f = $('code-form'); if (!f) return; f.onsubmit = e => { e.preventDefault(); const v = $('code-in').value.trim(); if (!v) return; lsSet('kh-token', v); lsSet('qc-key', null); location.reload(); }; }

// ---------- 共通 ----------
const modalOpen = () => !$('modal-overlay').classList.contains('hidden');
let ignorePop = false;
function modal(title, html) {
  if (!modalOpen()) { try { history.pushState({ ...(history.state || { page, sectionId }), modal: 1 }, ''); } catch (_) {} }
  $('modal-title').innerHTML = title; $('modal-content').innerHTML = html; $('modal-overlay').classList.remove('hidden');
}
function closeModal(fromPop) {
  if (!modalOpen()) return;
  $('modal-overlay').classList.add('hidden');
  if (!fromPop && history.state && history.state.modal) { ignorePop = true; history.back(); }
}
function render() {
  ({ home, map, lesson, quiz: quizView, review, drill: drillView, room, settings }[page] || (() => {}))();
}

// ---------- 中身の読み込み（暗号化された content.bin にも対応） ----------
async function loadContent() {
  if (window.QC_CONTENT) return window.QC_CONTENT;
  let key = lsGet('qc-key');
  const tok = lsGet('kh-token');
  if (!key && tok) {
    try { const j = await (await fetch(KH_API, { method: 'POST', body: JSON.stringify({ token: tok, fn: '__boot' }) })).json(); let v = j.v; if (typeof v === 'string') { try { v = JSON.parse(v); } catch (_) {} } const qk = (v && (v.qcKey || v.qckey || v.QC_KEY)) || j.qcKey; DIAG.boot = j.ok ? 'ok / qcKey ' + (qk ? 'あり' : 'なし（' + Object.keys(v || {}).join(',') + '）') : 'NG ' + (j.error || ''); if (j.ok && qk) { key = qk; lsSet('qc-key', key); } } catch (e) { DIAG.boot = '通信エラー ' + e.message; }
  }
  if (!key) return null;
  try {
    const buf = await (await fetch('content.bin', { cache: 'no-cache' })).arrayBuffer();
    const raw = Uint8Array.from(atob(key), c => c.charCodeAt(0));
    const k = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, k, buf.slice(12))));
  } catch (e) { DIAG.decrypt = '復号エラー ' + (e.name || e.message); lsSet('qc-key', null); return null; }
}
const DIAG = {};

async function boot() {
  const g = $('gkiko'); if (g && window.KIKO) { g.src = KIKO.png.walkRight[0]; KIKO.play(g, KIKO.png.walkRight, 220, 0); }
  try { history.replaceState({ page: 'home' }, ''); } catch (_) {}
  $('modal-close').onclick = () => closeModal();
  $('modal-overlay').onclick = e => { if (e.target === $('modal-overlay')) closeModal(); };
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => setPage(b.dataset.page));
  $('sync-btn').onclick = () => setPage('settings');
  DATA = await loadContent();
  if (!DATA) {
    const hasTok = !!lsGet('kh-token');
    const diag = `<p class="muted">確認用：合言葉 ${hasTok ? 'あり' : 'なし'} ／ 鍵 ${DIAG.boot || '未取得'}${DIAG.decrypt ? ' ／ ' + esc(DIAG.decrypt) : ''}</p>`;
    const showLogin = () => { $('app').innerHTML = `<div class="panel"><h2>${hasTok ? '中身を開けませんでした' : 'ログインしてね'}</h2>${hasTok ? '<p class="muted">合言葉はあるが鍵を受け取れませんでした。もう一度ログインしてください</p>' : ''}${loginBox()}${diag}</div>`; bindLogin(); chrome(); };
    document.querySelectorAll('#tabs button').forEach(b => b.onclick = showLogin);
    $('sync-btn').onclick = showLogin;
    showLogin(); return;
  }
  SECS = DATA.sections; CHAPS = DATA.chapters; buildStages();
  render();
  pullCloud();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullCloud(); else flushNow(); });
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('online', () => { if (sync.ok) pushCloud(); else pullCloud(); });
}
boot();
})();
