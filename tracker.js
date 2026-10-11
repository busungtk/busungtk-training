/* 부성티케이 교육 사이트 — 학습 기록 장치 (tracker.js)
 * 교재 페이지에 넣으면: 「왜 배우나」·「실제 현장 사례」 상자, 숙지 시간 측정, 문제 정오답 기록,
 * 헷갈림 기록 시트, 학습자 표시를 붙인다. 저장 위치는 training_progress.progress.learn 하나뿐이다.
 * <html data-bt-lib> 이면 화면 없이 저장 함수만 쓴다(planner.html · report.html).
 * 전역은 window.BTTrack 하나. 모든 클래스는 bt- 접두사. 필요: curriculum.js, cases-data.js */
(function () {
  'use strict';
  if (window.BTTrack) return;

  var SB_URL = 'https://xvtixgncxzhqgjtcyngb.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dGl4Z25jeHpocWdqdGN5bmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDgwNjIsImV4cCI6MjA4NjMyNDA2Mn0.UFb0h6XkTiFVVrBLEsX3Etl-j_7x5uWIqFWrXZ76h6A';
  var TABLE = 'training_progress';
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  var LIB_ONLY = document.documentElement.hasAttribute('data-bt-lib');
  var GUEST = '__guest__';

  // ───────── 작은 도구 ─────────
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function iso() { return new Date().toISOString(); }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function minStr(a, b) { return !a ? (b || null) : !b ? a : (a < b ? a : b); }
  function maxStr(a, b) { return !a ? (b || null) : !b ? a : (a > b ? a : b); }
  function fmtMin(m) {
    m = Math.max(0, Math.round(m));
    if (m < 60) return m + '분';
    var h = Math.floor(m / 60), r = m % 60;
    return h + '시간' + (r ? ' ' + r + '분' : '');
  }
  function dayMs(s) { var p = String(s).split('-'); return Date.UTC(+p[0], (+p[1]) - 1, +p[2]); }
  function addDays(s, n) {
    var d = new Date(dayMs(s) + n * 86400000);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function newId() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  // 키 순서와 상관없이 같은 내용이면 같은 문자열 (병합 결과 비교용)
  function stable(x) {
    if (Array.isArray(x)) return '[' + x.map(stable).join(',') + ']';
    if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(x[k]); }).join(',') + '}';
    return JSON.stringify(x === undefined ? null : x);
  }
  // 이 기기 id — 여러 기기에서 동시에 공부해도 시간이 합산되게 기기별로 누계를 둔다
  var DEVICE = (function () {
    var d = lsGet('bt_device');
    if (!d) { d = 'd' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); lsSet('bt_device', d); }
    return d;
  })();
  function sumVals(o) { var t = 0; for (var k in o) t += o[k] || 0; return t; }
  // 기기별 몫. 옛 데이터(dev 없음)는 합계를 '_old' 기기 몫으로 본다.
  function devMap(devObj, total) {
    if (isObj(devObj)) return devObj;
    return total > 0 ? { _old: total } : {};
  }
  function mergeDev(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k] || 0;
    for (k in b) o[k] = Math.max(o[k] || 0, b[k] || 0);
    return o;
  }
  function pageName() {
    var p = (location.pathname.split('/').pop() || 'index.html');
    return /\.[a-z0-9]+$/i.test(p) ? p : p + '.html';
  }

  // ───────── learn 모양과 병합 ─────────
  function blank() { return { v: 1, start: null, startSetAt: null, role: null, units: {}, quiz: {}, days: {}, daysDev: {}, notes: [], weekly: {}, goals: {}, plan: null }; }
  function norm(x) {
    var b = blank();
    if (!isObj(x)) return b;
    b.start = typeof x.start === 'string' ? x.start : null;
    b.startSetAt = typeof x.startSetAt === 'string' ? x.startSetAt : null;
    b.role = (x.role === 'tech' || x.role === 'office') ? x.role : null;
    b.units = isObj(x.units) ? x.units : {};
    b.quiz = isObj(x.quiz) ? x.quiz : {};
    b.days = isObj(x.days) ? x.days : {};
    b.daysDev = isObj(x.daysDev) ? x.daysDev : {};
    b.notes = Array.isArray(x.notes) ? x.notes.filter(function (n) { return n && n.id; }) : [];
    b.weekly = isObj(x.weekly) ? x.weekly : {};
    b.goals = isObj(x.goals) ? x.goals : {};
    b.plan = isObj(x.plan) ? x.plan : null;
    if (x.updatedAt) b.updatedAt = x.updatedAt;
    return b;
  }
  function mergeUnit(x, y) {
    if (!x) return Object.assign({}, y);
    if (!y) return Object.assign({}, x);
    var dev = mergeDev(devMap(x.dev, x.sec), devMap(y.dev, y.sec));
    var o = { sec: sumVals(dev), first: minStr(x.first, y.first), last: maxStr(x.last, y.last),
      done: !!(x.done || y.done), doneAt: maxStr(x.doneAt, y.doneAt) };
    if (Object.keys(dev).length) o.dev = dev;
    // 「다 봤음」을 취소한 기록(undoneAt)이 더 늦으면 OR 병합이어도 취소가 살아남게 한다
    var un = maxStr(x.undoneAt, y.undoneAt);
    if (un) { o.undoneAt = un; if (!o.doneAt || un > o.doneAt) o.done = false; }
    return o;
  }
  function mergeQuiz(x, y) {
    if (!x) return Object.assign({}, y);
    if (!y) return Object.assign({}, x);
    var o = Object.assign({}, (y.last || '') > (x.last || '') ? y : x);
    o.tries = Math.max(x.tries || 0, y.tries || 0);
    return o;
  }
  // 주간 보고는 두 묶음을 따로 병합한다: 학습자 칸(goal·learned·applied·nextGoal·submittedAt)은 learnerAt,
  // 사수 칸(mentorFeedback·mentorRating)은 mentorAt 이 늦은 쪽. 옛 데이터(updatedAt 만 있음)도 처리한다.
  var W_LEARNER = ['goal', 'learned', 'applied', 'nextGoal', 'submittedAt'], W_MENTOR = ['mentorFeedback', 'mentorRating'];
  // 옛 데이터의 updatedAt 은 그 묶음에 실제로 칸이 있을 때만 그 묶음의 시각으로 본다.
  // (사수 칸만 있는 기록이 updatedAt 하나로 학습자 묶음까지 이겨 학습자 칸을 지우던 결함 — 2026-10-11 재검수 N1)
  function hasAny(w, keys) { return keys.some(function (k) { return w[k] !== undefined && w[k] !== null && w[k] !== ''; }); }
  function learnerTs(w) { return w.learnerAt || (hasAny(w, W_LEARNER) ? (w.updatedAt || '') : ''); }
  function mentorTs(w) { return w.mentorAt || (hasAny(w, W_MENTOR) ? (w.updatedAt || '') : ''); }
  function laterWeekly(x, y) {
    if (!x) return y;
    if (!y) return x;
    var lw = learnerTs(y) > learnerTs(x) ? y : x, mw = mentorTs(y) > mentorTs(x) ? y : x, o = {};
    var lo = lw === x ? y : x, mo = mw === x ? y : x;
    // 이긴 쪽에 없는 칸은 진 쪽 값을 남긴다
    W_LEARNER.forEach(function (k) { if (k in lw) o[k] = lw[k]; else if (k in lo) o[k] = lo[k]; });
    W_MENTOR.forEach(function (k) { if (k in mw) o[k] = mw[k]; else if (k in mo) o[k] = mo[k]; });
    var la = learnerTs(lw), ma = mentorTs(mw);
    if (la) o.learnerAt = la;
    if (ma) o.mentorAt = ma;
    var u = maxStr(x.updatedAt, y.updatedAt);
    if (u) o.updatedAt = u;
    return o;
  }
  // 역량 목표: 학습자가 매긴 단계(self·selfAt)와 사수가 확인한 단계(mLevel·mBy·mNote·mAt)를 따로, 각각 늦게 저장된 쪽
  function laterGoal(x, y) {
    if (!x) return y;
    if (!y) return x;
    var s = (y.selfAt || '') > (x.selfAt || '') ? y : x, m = (y.mAt || '') > (x.mAt || '') ? y : x, o = {};
    if (s.self != null) { o.self = s.self; o.selfAt = s.selfAt; }
    if (m.mLevel != null) { o.mLevel = m.mLevel; o.mBy = m.mBy; o.mNote = m.mNote; o.mAt = m.mAt; }
    return o;
  }
  function merge(a, b) {
    a = norm(a); b = norm(b);
    var o = blank(), k;
    // 사람이 정한 시작일(startSetAt 있음)이 자동값을 이기고, 둘 다 사람이 정했으면 늦게 정한 쪽. 둘 다 자동이면 빠른 날짜.
    if (a.startSetAt || b.startSetAt) {
      var sb2 = (b.startSetAt || '') > (a.startSetAt || '') ? b : a;
      o.start = sb2.start; o.startSetAt = sb2.startSetAt;
    } else o.start = minStr(a.start, b.start);
    var pa = a.plan, pb = b.plan;
    var pickB = !!pb && (!pa || (pb.generatedAt || '') > (pa.generatedAt || ''));
    o.plan = pickB ? pb : pa;
    o.role = (pickB ? b.role : a.role) || a.role || b.role;
    for (k in a.units) o.units[k] = mergeUnit(a.units[k], b.units[k]);
    for (k in b.units) if (!(k in a.units)) o.units[k] = Object.assign({}, b.units[k]);
    for (k in a.quiz) o.quiz[k] = mergeQuiz(a.quiz[k], b.quiz[k]);
    for (k in b.quiz) if (!(k in a.quiz)) o.quiz[k] = Object.assign({}, b.quiz[k]);
    var dkeys = {};
    Object.keys(a.days).concat(Object.keys(b.days), Object.keys(a.daysDev), Object.keys(b.daysDev)).forEach(function (d) { dkeys[d] = 1; });
    Object.keys(dkeys).forEach(function (d) {
      var dv = mergeDev(devMap(a.daysDev[d], a.days[d]), devMap(b.daysDev[d], b.days[d]));
      var t = sumVals(dv);
      o.days[d] = t;
      if (Object.keys(dv).length) o.daysDev[d] = dv;
    });
    var byId = {};
    a.notes.concat(b.notes).forEach(function (n) {
      var c = byId[n.id];
      if (!c || (n.updatedAt || n.at || '') > (c.updatedAt || c.at || '')) byId[n.id] = n;
    });
    o.notes = Object.keys(byId).map(function (id) { return byId[id]; })
      .sort(function (x, y) { return (x.at || '') < (y.at || '') ? -1 : 1; });
    for (k in a.weekly) o.weekly[k] = laterWeekly(a.weekly[k], b.weekly[k]);
    for (k in b.weekly) if (!(k in a.weekly)) o.weekly[k] = b.weekly[k];
    for (k in a.goals) o.goals[k] = laterGoal(a.goals[k], b.goals[k]);
    for (k in b.goals) if (!(k in a.goals)) o.goals[k] = b.goals[k];
    var u = maxStr(a.updatedAt, b.updatedAt);
    if (u) o.updatedAt = u;
    return o;
  }

  // ───────── 저장소 (이 기기 + Supabase) ─────────
  var sbPromise = null;
  function makeClient() {
    try { return window.supabase && window.supabase.createClient ? window.supabase.createClient(SB_URL, SB_KEY) : null; } catch (e) { return null; }
  }
  var cdnTag = null;   // 불러오기 태그는 하나만 (재시도마다 쌓이지 않게)
  function getSb() {
    if (sbPromise) return sbPromise;
    var p = new Promise(function (resolve) {
      if (window.supabase && window.supabase.createClient) { resolve(makeClient()); return; }
      var done = false;
      function fin(v) { if (!done) { done = true; resolve(v); } }
      if (!cdnTag) {
        cdnTag = document.createElement('script');
        cdnTag.setAttribute('data-bt-cdn', '');
        cdnTag.src = CDN;
        document.head.appendChild(cdnTag);
      }
      var tag = cdnTag;
      tag.addEventListener('load', function () { fin(makeClient()); });
      tag.addEventListener('error', function () {
        if (cdnTag === tag) { cdnTag = null; if (tag.parentNode) tag.parentNode.removeChild(tag); }
        fin(null);
      });
      setTimeout(function () { fin(null); }, 10000);
    });
    sbPromise = p;
    p.then(function (c) { if (!c && sbPromise === p) sbPromise = null; });
    return p;
  }
  function LK(n) { return 'bt_learn:' + n; }
  function readLocal(name) {
    var raw = lsGet(LK(name));
    if (!raw) return blank();
    try { return norm(JSON.parse(raw)); } catch (e) { return blank(); }
  }
  function writeLocal(name, learn) { lsSet(LK(name), JSON.stringify(learn)); }

  // tech.html 이 쓰는 기록(progress.tech) — 읽기 전용. 이 기기 것과 서버 것 중 늦은 쪽.
  function pickTech(name, serverTech) {
    var local = null;
    try { local = JSON.parse(lsGet('bt_tech:' + name) || 'null'); } catch (e) { local = null; }
    if (!isObj(serverTech)) return isObj(local) ? local : null;
    if (!isObj(local)) return serverTech;
    return (local.updatedAt || '') > (serverTech.updatedAt || '') ? local : serverTech;
  }
  // 이 기기 기록과 서버 기록을 합쳐서 돌려준다. needsPush = 합친 결과가 서버 값과 다르다(올릴 것이 있다).
  async function fetchLearn(name) {
    var local = readLocal(name);
    var sb = await getSb();
    if (!sb) return { learn: local, server: false, exists: false, tech: pickTech(name, null), needsPush: false };
    try {
      var r = await sb.from(TABLE).select('progress').eq('trainee_name', name).maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) return { learn: local, server: true, exists: false, tech: pickTech(name, null), needsPush: false };
      var prog = r.data.progress || {};
      var m = merge(local, prog.learn);
      writeLocal(name, m);
      return { learn: m, server: true, exists: true, tech: pickTech(name, prog.tech),
        needsPush: stable(m) !== stable(merge(prog.learn, null)) };
    } catch (e) {
      return { learn: local, server: false, exists: false, tech: pickTech(name, null), needsPush: false };
    }
  }
  // 저장: 최신 행을 읽고 learn 키만 바꿔 쓴다(다른 키 보존). 읽은 updated_at 이 그대로일 때만 쓰고,
  // 그 사이 누가 먼저 썼으면(0행) 다시 읽고 병합해 최대 3번 다시 시도한다.
  async function commit(name, learn) {
    writeLocal(name, learn);
    var sb = await getSb();
    if (!sb) return { learn: learn, ok: false, why: 'offline' };
    var cur = learn;
    try {
      for (var attempt = 0; attempt < 3; attempt++) {
        var sel = await sb.from(TABLE).select('progress, updated_at').eq('trainee_name', name).maybeSingle();
        if (sel.error) throw sel.error;
        if (!sel.data) return { learn: cur, ok: false, why: 'norow' };
        var latest = sel.data.progress || {}, stamp = sel.data.updated_at;
        var merged = merge(cur, latest.learn);
        var q = sb.from(TABLE)
          .update({ progress: Object.assign({}, latest, { learn: merged }), updated_at: iso() })
          .eq('trainee_name', name);
        q = (stamp == null) ? q.is('updated_at', null) : q.eq('updated_at', stamp);
        var upd = await q.select('trainee_name');
        if (upd.error) throw upd.error;
        if (upd.data && upd.data.length) { writeLocal(name, merged); return { learn: merged, ok: true }; }
        // 0행: 그 사이 다른 쪽이 썼는지(충돌), 아니면 권한이 막은 것인지 구분한다
        var chk = await sb.from(TABLE).select('updated_at').eq('trainee_name', name).maybeSingle();
        if (chk.error) throw chk.error;
        if (!chk.data) return { learn: merged, ok: false, why: 'norow' };
        if (chk.data.updated_at === stamp) return { learn: merged, ok: false, why: 'blocked' };
        cur = merged;
      }
      return { learn: cur, ok: false, why: 'conflict' };
    } catch (e) {
      return { learn: cur, ok: false, why: 'error' };
    }
  }
  // 읽고 → 고치고 → 저장 (planner · report 용)
  async function update(name, fn) {
    var r = await fetchLearn(name);
    var l = norm(r.learn);
    fn(l);
    l.updatedAt = iso();
    var c = await commit(name, l);
    return { learn: c.learn, ok: c.ok, why: c.why };
  }
  async function listTrainees() {
    var sb = await getSb();
    if (!sb) return { rows: [], ok: false };
    try {
      var r = await sb.from(TABLE).select('trainee_name, progress, updated_at').order('updated_at', { ascending: false });
      if (r.error) throw r.error;
      return { ok: true, rows: (r.data || []).map(function (x) {
        return { name: x.trainee_name, learn: norm((x.progress || {}).learn), tech: pickTech(x.trainee_name, (x.progress || {}).tech), updated_at: x.updated_at };
      }) };
    } catch (e) { return { rows: [], ok: false }; }
  }
  async function createTrainee(name) {
    var sb = await getSb();
    if (!sb) return { ok: false, why: 'offline' };
    try {
      var r = await sb.from(TABLE).insert({ trainee_name: name, progress: {} });
      if (r.error && r.error.code !== '23505') throw r.error;
      return { ok: true, existed: !!(r.error && r.error.code === '23505') };
    } catch (e) { return { ok: false, why: 'error' }; }
  }

  // ───────── 학습자 ─────────
  function getWho() {
    var w = lsGet('bt_learner');
    if (w && w !== GUEST) return w;
    var t = lsGet('bt_tech:who');
    if (t && t !== GUEST) { lsSet('bt_learner', t); return t; }
    return null;
  }
  function storeWho(name) {
    lsSet('bt_learner', name);
    lsSet('bt_tech:who', name);
  }
  function weekNo(learn, dateStr) {
    if (!learn || !learn.start) return 1;
    var diff = Math.floor((dayMs(dateStr || todayStr()) - dayMs(learn.start)) / 86400000);
    return Math.max(1, Math.floor(diff / 7) + 1);
  }
  function weekRange(learn, wk) {
    var s = addDays((learn && learn.start) || todayStr(), 7 * (wk - 1));
    return [s, addDays(s, 6)];
  }

  function techDone(tech, unitId) {
    var m = /^tech:c(\d+)$/.exec(unitId || '');
    if (!m || !isObj(tech)) return false;
    var ch = +m[1];
    if (isObj(tech.read) && tech.read[ch]) return true;
    var qs = (window.TECH_QUESTIONS || []).filter(function (q) { return q.ch === ch; });
    if (!qs.length || !isObj(tech.q)) return false;
    return qs.every(function (q) { return tech.q[q.id] && tech.q[q.id].seen > 0; });
  }
  function isDone(learn, tech, unitId) {
    var u = learn && learn.units && learn.units[unitId];
    return !!(u && u.done) || techDone(tech, unitId);
  }

  window.BTTrack = {
    version: 1, lib: LIB_ONLY,
    today: todayStr, addDays: addDays, fmtMin: fmtMin, pageName: pageName, newId: newId,
    blank: blank, norm: norm, merge: merge,
    getWho: getWho, setWho: storeWho,
    getSb: getSb, fetchLearn: fetchLearn, commit: commit, update: update,
    listTrainees: listTrainees, createTrainee: createTrainee,
    weekNo: weekNo, weekRange: weekRange, techDone: techDone, isDone: isDone, stable: stable
  };
  if (LIB_ONLY) return;

  // ═════════════ 여기부터는 교재 페이지 전용 ═════════════
  var CUR = window.CURRICULUM || null;
  var PAGE = pageName();
  var PAGE_UNITS = CUR ? CUR.UNITS.filter(function (u) { return u.page === PAGE && u.anchor && u.anchor.charAt(0) !== '#'; }) : [];
  var KIND_LABEL = { as: 'A/S', sigong: '시공', napum: '납품' };
  var PRIO_CLASS = { '필수': 'req', '권장': 'rec', '심화': 'adv' };

  var who = null;
  var L = null;          // 지금 학습자의 learn (항상 이 변수를 통해 읽는다)
  var status = 'none';   // none | ok | busy | local
  var ver = 0, dirty = false, pushChain = Promise.resolve();
  var lastInput = Date.now();
  var lastSel = null;
  var els = {};          // 화면 요소 모음
  var unitInfo = [];     // { u, el, why, end, doneBtn, spent }
  var sheetRefs = null;
  // 입사 전(0주차) 페이지만 있는 곳에서는 시작일을 자동으로 정하지 않는다 (시작일은 편성기에서 사람이 정한다)
  var ZERO_PAGE = PAGE_UNITS.length > 0 && PAGE_UNITS.every(function (u) { return u.week === 0; });
  function autoStart(l) { if (!l.start && !ZERO_PAGE) l.start = todayStr(); }

  function h(tag, props) {
    var e = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }

  // ───────── 상태 저장 ─────────
  function setStatus(s) { status = s; renderTop(); }
  function persist() {
    if (!who || !L) return;
    L = merge(L, readLocal(who));   // 같은 기기의 다른 탭 기록도 놓치지 않게
    writeLocal(who, L);
  }
  function mutate(fn, pushDelay) {
    if (!who || !L) return false;
    fn(L);
    L.updatedAt = iso();
    ver++; dirty = true;
    persist();
    if (pushDelay != null) pushSoon(pushDelay);
    return true;
  }
  var pushTimer = null;
  function pushSoon(ms) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, ms);
  }
  function pushNow() {
    pushChain = pushChain.then(async function () {
      if (!who || !L || !dirty) return;
      var name = who, v = ver;
      setStatus('busy');
      var r = await commit(name, L);
      if (name !== who) return;
      L = merge(L, r.learn);
      writeLocal(who, L);
      if (r.ok && ver === v) dirty = false;
      setStatus(r.ok ? 'ok' : 'local');
    }).catch(function () { setStatus('local'); });
    return pushChain;
  }
  async function loadLearner(name) {
    who = name;
    try { document.dispatchEvent(new CustomEvent('bt:learner', { detail: { name: name } })); } catch (e) {}
    L = readLocal(name);
    dirty = false;
    setStatus('busy');
    refreshUnits();
    var r = await fetchLearn(name);
    if (who !== name) return;
    L = merge(L, r.learn);
    writeLocal(name, L);
    if (r.server && !r.exists) { setStatus('local'); toast('명단에 없는 이름이라 이 기기에만 저장합니다.'); }
    else setStatus(r.server ? 'ok' : 'local');
    // 이 기기에만 남아 있던 몫(지난번 저장 실패·학습자 전환 직전 몫)이 있으면 지금 올린다
    if (r.server && r.exists && r.needsPush) { dirty = true; pushSoon(1500); }
    refreshUnits();
  }

  // ───────── 스타일 ─────────
  function injectCss() {
    var css = [
      '.bt-box,.bt-top,.bt-fab,.bt-sheet,.bt-modal,.bt-toast{--bt-accent:var(--accent,#38bdf8);--bt-surface:var(--surface,#111827);--bt-surface2:var(--surface2,#1a2332);--bt-border:var(--border,#1e2d3d);--bt-text:var(--text,#e2e8f0);--bt-dim:var(--text-dim,#94a3b8);--bt-bright:var(--text-bright,#f8fafc);--bt-on:var(--on-accent,#0a0e17);--bt-topbg:var(--top-bg,rgba(17,24,39,.92));--bt-inbg:var(--input-bg,#0a0e17);font-family:inherit;line-height:1.6}',
      '.bt-box *,.bt-top *,.bt-fab,.bt-sheet *,.bt-modal *,.bt-box,.bt-top,.bt-sheet,.bt-modal{box-sizing:border-box}',
      '.bt-box{margin:20px 0;padding:16px 18px;background:var(--bt-surface2);border:1px solid var(--bt-border);border-left:3px solid var(--bt-accent);border-radius:12px;color:var(--bt-text);font-size:.92rem;text-align:left}',
      '.bt-box h4{margin:0 0 8px;font-size:.95rem;color:var(--bt-bright);display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '.bt-box p{margin:0 0 8px}',
      '.bt-meta{color:var(--bt-dim);font-size:.82rem}',
      '.bt-badge{display:inline-block;padding:1px 9px;border-radius:99px;font-size:.74rem;font-weight:700;border:1px solid}',
      '.bt-badge.req{color:#fca5a5;border-color:rgba(248,113,113,.5);background:rgba(248,113,113,.1)}',
      '.bt-badge.rec{color:#7dd3fc;border-color:rgba(56,189,248,.5);background:rgba(56,189,248,.1)}',
      '.bt-badge.adv{color:#c4b5fd;border-color:rgba(167,139,250,.5);background:rgba(167,139,250,.1)}',
      '.bt-cases{list-style:none;margin:0 0 10px;padding:0}',
      '.bt-cases li{padding:7px 0;border-top:1px solid var(--bt-border)}',
      '.bt-cases li:first-child{border-top:0}',
      '.bt-cases a{color:var(--bt-accent);text-decoration:none;font-weight:600}',
      '.bt-cases a:hover{text-decoration:underline}',
      '.bt-btn{appearance:none;font:inherit;font-size:.86rem;font-weight:600;cursor:pointer;padding:7px 14px;border-radius:9px;border:1px solid var(--bt-border);background:var(--bt-surface);color:var(--bt-text);min-height:36px}',
      '.bt-btn:hover{border-color:var(--bt-accent);color:var(--bt-accent)}',
      '.bt-btn.main{background:var(--bt-accent);border-color:var(--bt-accent);color:var(--bt-on)}',
      '.bt-btn.main:hover{filter:brightness(1.08);color:var(--bt-on)}',
      '.bt-btn.on{background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.55);color:#6ee7b7}',
      '.bt-btn.small{padding:3px 10px;font-size:.78rem;min-height:28px;font-weight:500}',
      '.bt-btn:focus-visible,.bt-fab:focus-visible,.bt-chip:focus-visible,.bt-x:focus-visible,.bt-in:focus-visible,.bt-radio input:focus-visible+span,.bt-cases a:focus-visible,.bt-sheet a:focus-visible{outline:3px solid var(--bt-accent);outline-offset:2px}',
      '.bt-redo-wrap{margin:6px 0 14px;text-align:right}',
      '.bt-top{position:fixed;top:12px;right:16px;z-index:9000;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 150px);background:var(--bt-topbg);border:1px solid var(--bt-border);border-radius:99px;padding:5px 6px 5px 12px;color:var(--bt-dim);font-size:.8rem;backdrop-filter:blur(8px)}',
      '.bt-top.need{border-color:var(--bt-accent)}',
      '.bt-chip{appearance:none;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer;color:var(--bt-bright);background:transparent;border:0;padding:2px 6px;border-radius:99px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.bt-top.need .bt-chip{background:var(--bt-accent);color:var(--bt-on);padding:5px 12px}',
      '.bt-dot{width:9px;height:9px;border-radius:50%;background:#64748b;flex:none}',
      '.bt-dot.ok{background:#10b981}.bt-dot.busy{background:#fbbf24}.bt-dot.local{background:#ef4444}',
      '.bt-today{white-space:nowrap;padding-right:6px}',
      '.bt-plan{white-space:nowrap;font-size:.78rem;font-weight:700;color:var(--accent-text,var(--bt-accent));text-decoration:none;border-left:1px solid var(--bt-border);padding:0 4px 0 8px}.bt-plan:hover{text-decoration:underline}.bt-plan:focus-visible{outline:2px solid var(--bt-accent);outline-offset:2px}',
      '.bt-need-msg{white-space:nowrap}',
      '.bt-lbl{font-size:.72rem;font-weight:700;letter-spacing:.04em;color:var(--bt-dim);padding-left:4px}',
      '.bt-fab{position:fixed;right:16px;bottom:84px;z-index:8999;appearance:none;font:inherit;font-size:.86rem;font-weight:700;cursor:pointer;color:var(--bt-on);background:var(--bt-accent);border:0;border-radius:99px;padding:10px 16px;box-shadow:0 6px 20px rgba(0,0,0,.4)}',
      '.bt-fab:hover{filter:brightness(1.1)}',
      '.bt-over{position:fixed;top:0;right:0;bottom:0;left:0;z-index:9500;background:rgba(2,6,15,.6);display:none}',
      '.bt-over.open{display:block}',
      '.bt-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9501;margin:0 auto;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;background:var(--bt-surface);border:1px solid var(--bt-border);border-bottom:0;border-radius:16px 16px 0 0;padding:18px 18px 22px;color:var(--bt-text);font-size:.92rem;transform:translateY(105%);visibility:hidden;transition:transform .25s ease,visibility 0s .25s}',
      '.bt-sheet.open{transform:none;visibility:visible;transition:transform .25s ease}',
      '.bt-modal{position:fixed;left:50%;top:50%;z-index:9501;width:calc(100% - 28px);max-width:420px;max-height:84vh;overflow-y:auto;transform:translate(-50%,-50%);background:var(--bt-surface);border:1px solid var(--bt-border);border-radius:16px;padding:18px;color:var(--bt-text);font-size:.92rem;display:none}',
      '.bt-modal.open{display:block}',
      '.bt-sheet h3,.bt-modal h3{margin:0 0 10px;font-size:1.02rem;color:var(--bt-bright);display:flex;justify-content:space-between;align-items:center;gap:8px}',
      '.bt-x{appearance:none;background:transparent;border:0;color:var(--bt-dim);font-size:1.3rem;cursor:pointer;padding:2px 8px;border-radius:8px;line-height:1}',
      '.bt-lbl{display:block;margin:12px 0 5px;color:var(--bt-dim);font-size:.8rem;font-weight:600}',
      '.bt-in{width:100%;font:inherit;font-size:.92rem;color:var(--bt-text);background:var(--bt-inbg);border:1px solid var(--bt-border);border-radius:9px;padding:8px 10px}',
      'textarea.bt-in{resize:vertical;min-height:84px}',
      'textarea.bt-quote{min-height:44px;color:var(--bt-dim);font-size:.85rem}',
      '.bt-kinds{display:flex;flex-wrap:wrap;gap:6px}',
      '.bt-radio{position:relative;display:inline-block}',
      '.bt-radio input{position:absolute;opacity:0;top:0;left:0;width:100%;height:100%;cursor:pointer;margin:0}',
      '.bt-radio span{display:inline-block;padding:6px 14px;border:1px solid var(--bt-border);border-radius:99px;font-size:.86rem;font-weight:600;color:var(--bt-dim)}',
      '.bt-radio input:checked+span{border-color:var(--bt-accent);background:rgba(56,189,248,.14);color:var(--bt-bright)}',
      '.bt-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px}',
      '.bt-list{list-style:none;margin:8px 0;padding:0}',
      '.bt-list li{padding:8px 0;border-top:1px solid var(--bt-border);font-size:.85rem}',
      '.bt-list .k{color:var(--bt-accent);font-weight:700;margin-right:6px}',
      '.bt-list .s{color:var(--bt-dim);margin-left:6px;font-size:.78rem}',
      '.bt-names{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}',
      '.bt-toast{position:fixed;left:50%;bottom:24px;z-index:9600;transform:translateX(-50%);max-width:calc(100% - 32px);background:var(--bt-surface2);border:1px solid var(--bt-border);color:var(--bt-bright);padding:9px 16px;border-radius:10px;font-size:.86rem;opacity:0;pointer-events:none;transition:opacity .2s}',
      '.bt-toast.show{opacity:1}',
      '@media (max-width:520px){.bt-need-msg{display:none}.bt-top{padding-left:8px;top:auto;right:auto;left:12px;bottom:78px;max-width:calc(100vw - 170px)}.bt-fab{right:12px;bottom:78px;padding:9px 13px}.bt-box{padding:14px}}',
      '@media (prefers-reduced-motion:reduce){.bt-sheet,.bt-sheet.open,.bt-toast{transition:none}}',
      '@media print{.bt-top,.bt-fab,.bt-over,.bt-sheet,.bt-modal,.bt-toast,.bt-redo-wrap{display:none!important}}'
    ].join('\n');
    var st = document.createElement('style');
    st.setAttribute('data-bt', 'css');
    st.textContent = css;
    document.head.appendChild(st);
  }

  var toastTimer = null;
  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2600);
  }

  // ───────── 상단 학습자 표시 ─────────
  function todayMin() { return L && L.days ? Math.floor((L.days[todayStr()] || 0) / 60) : 0; }
  var STATUS_TITLE = { ok: '저장됨', busy: '저장 중', local: '이 기기에만 저장됨 (서버 저장 실패)', none: '' };
  function renderTop() {
    var t = els.top;
    if (!t) return;
    t.textContent = '';
    if (!who) {
      t.className = 'bt-top need';
      t.appendChild(h('span', { class: 'bt-need-msg', text: '학습자를 고르면 학습 기록이 시작됩니다' }));
      t.appendChild(h('button', { class: 'bt-chip', type: 'button', text: '학습자 선택', onclick: openPicker }));
      return;
    }
    t.className = 'bt-top';
    t.appendChild(h('span', { class: 'bt-lbl', text: '학습자' }));
    t.appendChild(h('button', { class: 'bt-chip', type: 'button', title: '학습자 바꾸기', 'aria-label': '학습자 ' + who + ' (눌러서 바꾸기)', text: who, onclick: openPicker }));
    t.appendChild(h('span', { class: 'bt-dot ' + status, role: 'img', 'aria-label': STATUS_TITLE[status] || '', title: STATUS_TITLE[status] || '' }));
    t.appendChild(h('span', { class: 'bt-today', text: '오늘 ' + todayMin() + '분' }));
    if (PAGE !== 'my.html') t.appendChild(h('a', { class: 'bt-plan', href: 'my.html', title: '편성한 주별 계획 보기', text: '내 계획' }));
  }

  // ───────── 열고 닫기 ─────────
  function openOverlay() { els.over.classList.add('open'); }
  function closeAll() {
    if (els.sheet) els.sheet.classList.remove('open');
    if (els.modal) els.modal.classList.remove('open');
    if (els.over) els.over.classList.remove('open');
    var r = els.restore;
    els.restore = null;
    if (r && r.focus) { try { r.focus(); } catch (e) {} }
  }
  function isOpen() { return (els.sheet && els.sheet.classList.contains('open')) || (els.modal && els.modal.classList.contains('open')); }

  // ───────── 학습자 고르기 ─────────
  async function openPicker() {
    els.restore = document.activeElement;
    var m = els.modal;
    m.textContent = '';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', '학습자 선택');
    m.appendChild(h('h3', null, '학습자 선택', h('button', { class: 'bt-x', type: 'button', 'aria-label': '닫기', text: '×', onclick: closeAll })));
    var listBox = h('div', { class: 'bt-names' }, h('span', { class: 'bt-meta', text: '명단 불러오는 중…' }));
    m.appendChild(listBox);
    var input = h('input', { class: 'bt-in', type: 'text', maxlength: '30', placeholder: '이름', 'aria-label': '새로 시작할 이름' });
    var msg = h('p', { class: 'bt-meta', role: 'status' });
    var go = h('button', { class: 'bt-btn main', type: 'button', text: '새로 시작' });
    var known = [];
    var SAME = '이미 있는 학습자입니다. 그 기록에 이어서 할까요?';
    async function pick(name) {
      closeAll();
      await pushNow();
      storeWho(name);
      await loadLearner(name);
      toast(name + ' 님으로 기록합니다.');
    }
    go.addEventListener('click', async function () {
      var name = input.value.trim();
      if (!name) { msg.textContent = '이름을 적어 주세요.'; return; }
      if (known.indexOf(name) >= 0) {
        if (confirm(SAME)) pick(name);
        return;
      }
      go.disabled = true; msg.textContent = '확인 중…';
      var r = await createTrainee(name);
      go.disabled = false;
      if (!r.ok) { msg.textContent = '등록하지 못했습니다. 인터넷 연결을 확인해 주세요.'; return; }
      msg.textContent = '';
      if (r.existed && !confirm(SAME)) return;
      pick(name);
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
    m.appendChild(h('p', { class: 'bt-lbl', text: '처음이라면 이름을 적고 「새로 시작」' }));
    m.appendChild(input);
    m.appendChild(h('div', { class: 'bt-actions' }, go));
    m.appendChild(msg);
    openOverlay(); m.classList.add('open');
    input.focus();
    var r = await listTrainees();
    listBox.textContent = '';
    if (!r.ok) { listBox.appendChild(h('span', { class: 'bt-meta', text: '명단을 불러오지 못했습니다. 아래에서 이름으로 시작할 수 있습니다.' })); return; }
    if (!r.rows.length) { listBox.appendChild(h('span', { class: 'bt-meta', text: '아직 등록된 이름이 없습니다.' })); return; }
    known = r.rows.map(function (row) { return row.name; });
    r.rows.forEach(function (row) {
      listBox.appendChild(h('button', { class: 'bt-btn' + (row.name === who ? ' on' : ''), type: 'button', text: row.name, onclick: function () { pick(row.name); } }));
    });
  }

  // ───────── 단원 상자 ─────────
  function casesFor(u) {
    var C = window.CASES || [];
    if (!u.topics || !u.topics.length || !C.length) return [];
    var m = C.filter(function (c) { return c && c.tp && c.tp.some(function (t) { return u.topics.indexOf(t) >= 0; }); });
    var dated = m.filter(function (c) { return c.d; }).sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
    var undated = m.filter(function (c) { return !c.d; });
    return dated.concat(undated).slice(0, 3);
  }
  function whenText(d) {
    var p = /^(\d{4})-(\d{2})$/.exec(d || '');
    return p ? p[1] + '년 ' + (+p[2]) + '월' : '시기 미기재';
  }
  function safeUrl(u) { return /^https:\/\/busungtk\.website\//.test(u || '') ? u : null; }
  function unitState(id) { return (L && L.units && L.units[id]) || null; }

  function buildUnits() {
    PAGE_UNITS.forEach(function (u) {
      var el = document.getElementById(u.anchor);
      if (!el || el.querySelector('[data-bt="why"]')) return;
      var info = { u: u, el: el };
      // 1) 왜 배우나
      var theory = CUR.theoryMin(u);
      var timeTxt = (theory > 0 ? '숙지 예상 약 ' + fmtMin(theory) : '숙지 시간은 내용이 채워지면 계산됩니다')
        + ' · ' + (u.practiceH > 0 ? '교재 표기 실습 ' + u.practiceH + '시간' : '교재 표기 실습 없음');
      info.spent = h('span', { class: 'bt-meta' });
      var why = h('div', { class: 'bt-box', 'data-bt': 'why', 'data-unit': u.id },
        h('h4', null, '왜 배우나', h('span', { class: 'bt-badge ' + (PRIO_CLASS[u.prio] || 'rec'), text: u.prio })),
        h('p', { text: u.why }),
        h('div', { class: 'bt-meta' }, timeTxt + ' · ', info.spent));
      // 단원 칸 안에 폭을 잡는 .wrap 이 있으면 그 안에 넣는다 (refs·products — 밖에 넣으면 화면 끝에 붙는다)
      var box = el.querySelector(':scope > .wrap') || el;
      var head = box.querySelector(':scope > .sec-head') || box.querySelector(':scope > .section-header') || box.querySelector(':scope > .section-desc') || box.querySelector(':scope > h2, :scope > h3');
      if (head) box.insertBefore(why, head.nextSibling); else box.insertBefore(why, box.firstChild);
      info.why = why;
      // 2) 현장 사례 + 다 봤어요
      var end = h('div', { class: 'bt-box', 'data-bt': 'end', 'data-unit': u.id });
      var cs = casesFor(u);
      if (cs.length) {
        end.appendChild(h('h4', { text: '실제 현장 사례' }));
        var ul = h('ul', { class: 'bt-cases' });
        cs.forEach(function (c) {
          var url = safeUrl(c.u);
          var title = url ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: c.ti }) : h('span', { text: c.ti });
          ul.appendChild(h('li', null, title, h('span', { class: 'bt-meta', text: '  ' + (KIND_LABEL[c.t] || c.t) + ' · ' + whenText(c.d) })));
        });
        end.appendChild(ul);
        end.appendChild(h('p', { class: 'bt-meta' }, '이 사례에서 왜 이렇게 했을지 한 줄로 적어 보세요 → ',
          h('button', { class: 'bt-btn small', type: 'button', text: '헷갈림 기록', onclick: function () { openSheet({ unit: u.id }); } })));
      }
      info.doneBtn = h('button', { class: 'bt-btn', type: 'button', onclick: function () { toggleDone(u.id); } });
      end.appendChild(h('div', { class: 'bt-actions' }, info.doneBtn));
      if (box !== el) box.appendChild(end);
      else if (el.children.length >= 2) el.appendChild(end);
      else {
        // 제목 하나뿐인 앵커: 같은 부모 안에서 다음 단원 앞에 넣는다
        var nx = null;
        PAGE_UNITS.forEach(function (o) {
          var oe = document.getElementById(o.anchor);
          if (oe && oe !== el && oe.parentNode === el.parentNode && (el.compareDocumentPosition(oe) & 4) && (!nx || (nx.compareDocumentPosition(oe) & 2))) nx = oe;
        });
        el.parentNode.insertBefore(end, nx);
      }
      info.end = end;
      unitInfo.push(info);
    });
    refreshUnits();
  }
  function spentText(st) { return who ? '내가 여기서 보낸 시간 ' + fmtMin(Math.round(((st && st.sec) || 0) / 60)) : '학습자를 고르면 내 시간이 기록됩니다'; }
  function refreshUnits() {
    unitInfo.forEach(function (i) {
      var st = unitState(i.u.id);
      var done = !!(st && st.done);
      i.doneBtn.className = 'bt-btn' + (done ? ' on' : ' main');
      i.doneBtn.textContent = done ? '다 봤음 ✓ (취소)' : '이 단원 다 봤어요';
      i.doneBtn.setAttribute('aria-pressed', done ? 'true' : 'false');
      i.spent.textContent = spentText(st);
    });
  }
  function unitRec(l, id) { return l.units[id] || (l.units[id] = { sec: 0, first: null, last: null, done: false, doneAt: null }); }
  function toggleDone(id) {
    if (!who) { openPicker(); return; }
    mutate(function (l) {
      var r = unitRec(l, id), now = iso();
      if (r.done) { r.done = false; r.undoneAt = now; }
      else { r.done = true; r.doneAt = now; r.first = r.first || now; r.last = now; }
      autoStart(l);
    }, 1500);
    refreshUnits();
    toast(unitState(id) && unitState(id).done ? '다 봤음으로 기록했습니다.' : '다 봤음을 취소했습니다.');
  }

  // 지금 화면 중앙선에 걸린 단원
  function currentUnitId() {
    var mid = window.innerHeight / 2, best = null, bestTop = -Infinity;
    unitInfo.forEach(function (i) {
      if (!i.el.getClientRects().length) return;
      var r = i.el.getBoundingClientRect();
      var container = i.el.children.length >= 2;
      if (r.top <= mid && (!container || mid < r.bottom) && r.top > bestTop) { best = i; bestTop = r.top; }
    });
    return best ? best.u.id : null;
  }
  function unitOfNode(node) {
    var best = null;
    for (var n = 0; n < unitInfo.length; n++) {
      var i = unitInfo[n];
      if (i.el.contains(node)) return i.u.id;
      if ((i.el.compareDocumentPosition(node) & 4) && (!best || (best.el.compareDocumentPosition(i.el) & 4))) best = i;
    }
    return best ? best.u.id : null;
  }

  // ───────── 시간 측정 ─────────
  function tick() {
    if (!who || !L) return;
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastInput > 90000) return;
    var uid = currentUnitId(), t = todayStr(), now = iso();
    mutate(function (l) {
      var dd = l.daysDev[t] || (l.daysDev[t] = devMap(null, l.days[t] || 0));
      dd[DEVICE] = (dd[DEVICE] || 0) + 5;
      l.days[t] = sumVals(dd);
      autoStart(l);
      if (uid) {
        var r = unitRec(l, uid);
        var dv = r.dev || (r.dev = devMap(null, r.sec || 0));
        dv[DEVICE] = (dv[DEVICE] || 0) + 5;
        r.sec = sumVals(dv); r.first = r.first || now; r.last = now;
      }
    });
    renderTop();
    if (uid) {
      var inf = unitInfo.filter(function (i) { return i.u.id === uid; })[0];
      if (inf) inf.spent.textContent = spentText(unitState(uid));
    }
  }

  // ───────── 문제 기록과 다시 풀기 ─────────
  var CHECK_RE = /checkQuiz\s*\(\s*this\s*,\s*(true|false)\s*,\s*['"]([^'"]+)['"]/;
  function wrapperOf(box) { return (box.closest && box.closest('.quiz-box,.quiz-card,.quiz-block')) || box; }
  function onQuizClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('.quiz-opt') : null;
    if (!btn || btn.disabled) return;
    var m = CHECK_RE.exec(btn.getAttribute('onclick') || '');
    setTimeout(function () {
      var ok = btn.classList.contains('correct') ? true : btn.classList.contains('wrong') ? false : (m ? m[1] === 'true' : null);
      if (ok === null) return;
      var boxEl = m ? document.getElementById(m[2]) : btn.closest('[id]');
      var qid = m ? m[2] : (boxEl ? boxEl.id : 'q');
      var uid = unitOfNode(btn) || PAGE;
      var key = uid + '#' + qid;
      showRedo(boxEl || btn.parentNode);
      if (!who) { toast('학습자를 고르면 문제 기록이 남습니다.'); return; }
      mutate(function (l) {
        var q = l.quiz[key] || (l.quiz[key] = { ok: false, tries: 0, last: null, unit: uid });
        q.tries = (q.tries || 0) + 1; q.ok = ok; q.last = iso(); q.unit = uid;
        autoStart(l);
      }, 3000);
    }, 50);
  }
  function addRedo() {
    document.querySelectorAll('.quiz-opt').forEach(function (opt) {
      var m = CHECK_RE.exec(opt.getAttribute('onclick') || '');
      var box = m ? document.getElementById(m[2]) : opt.parentNode;
      if (!box) return;
      var w = wrapperOf(box);
      if (w.nextElementSibling && w.nextElementSibling.getAttribute('data-bt') === 'redo') return;
      var wrap = h('div', { class: 'bt-redo-wrap', 'data-bt': 'redo', hidden: true });
      wrap.appendChild(h('button', { class: 'bt-btn small', type: 'button', text: '다시 풀기', onclick: function () { resetQuiz(box, wrap); } }));
      w.parentNode.insertBefore(wrap, w.nextSibling);
    });
  }
  function showRedo(box) {
    var n = wrapperOf(box).nextElementSibling;
    if (n && n.getAttribute('data-bt') === 'redo') n.hidden = false;
  }
  function resetQuiz(box, wrap) {
    box.querySelectorAll('.quiz-opt').forEach(function (o) {
      o.disabled = false; o.style.pointerEvents = ''; o.classList.remove('correct', 'wrong');
    });
    var id = box.id;
    if (id) wrapperOf(box).querySelectorAll('[id^="' + id + '-"]').forEach(function (f) {
      f.classList.remove('show');
      if (/-fail-\d+$/.test(f.id)) f.style.display = '';
    });
    wrap.hidden = true;
    var first = box.querySelector('.quiz-opt');
    if (first) first.focus();
  }

  // ───────── 헷갈림 기록 시트 ─────────
  function selectionText() {
    var s = window.getSelection ? window.getSelection() : null;
    var t = s ? s.toString().trim() : '';
    if (t) return t.slice(0, 300);
    if (lastSel && Date.now() - lastSel.at < 180000) return lastSel.text;
    return '';
  }
  function onSelectionChange() {
    var s = window.getSelection ? window.getSelection() : null;
    if (!s || !s.rangeCount) return;
    var t = s.toString().trim();
    if (!t) return;
    var n = s.anchorNode, el = n && (n.nodeType === 1 ? n : n.parentElement);
    if (el && el.closest && el.closest('.bt-sheet,.bt-modal')) return;
    lastSel = { text: t.slice(0, 300), at: Date.now() };
  }
  function buildSheet() {
    var quote = h('textarea', { class: 'bt-in bt-quote', rows: '2', maxlength: '300', 'aria-label': '인용(선택한 글자)', placeholder: '교재에서 글자를 선택하고 이 버튼을 누르면 여기에 들어옵니다' });
    var text = h('textarea', { class: 'bt-in', rows: '4', maxlength: '600', 'aria-label': '내용', placeholder: '무엇이 헷갈렸는지, 무엇을 알고 싶은지 한두 줄로' });
    var unit = h('select', { class: 'bt-in', 'aria-label': '단원' });
    unit.appendChild(h('option', { value: '', text: '(단원 없음)' }));
    PAGE_UNITS.forEach(function (u) { unit.appendChild(h('option', { value: u.id, text: u.title })); });
    var kinds = h('div', { class: 'bt-kinds', role: 'radiogroup', 'aria-label': '종류' });
    ['헷갈림', '질문', '찾아볼 것'].forEach(function (k, i) {
      var r = h('input', { type: 'radio', name: 'bt-kind', value: k });
      if (i === 0) r.checked = true;
      kinds.appendChild(h('label', { class: 'bt-radio' }, r, h('span', { text: k })));
    });
    var msg = h('p', { class: 'bt-meta', role: 'status' });
    var list = h('ul', { class: 'bt-list' });
    var head = h('p', { class: 'bt-lbl' });
    sheetRefs = { quote: quote, text: text, unit: unit, kinds: kinds, msg: msg, list: list, head: head };
    var s = els.sheet;
    s.setAttribute('role', 'dialog'); s.setAttribute('aria-modal', 'true'); s.setAttribute('aria-label', '헷갈림 기록');
    s.appendChild(h('h3', null, '헷갈림 기록', h('button', { class: 'bt-x', type: 'button', 'aria-label': '닫기', text: '×', onclick: closeAll })));
    s.appendChild(h('p', { class: 'bt-lbl', text: '인용 (선택한 글자)' })); s.appendChild(quote);
    s.appendChild(h('p', { class: 'bt-lbl', text: '종류' })); s.appendChild(kinds);
    s.appendChild(h('p', { class: 'bt-lbl', text: '내용' })); s.appendChild(text);
    s.appendChild(h('p', { class: 'bt-lbl', text: '단원' })); s.appendChild(unit);
    s.appendChild(h('div', { class: 'bt-actions' },
      h('button', { class: 'bt-btn main', type: 'button', text: '저장', onclick: saveNote }),
      h('button', { class: 'bt-btn', type: 'button', text: '닫기', onclick: closeAll })));
    s.appendChild(msg);
    s.appendChild(head); s.appendChild(list);
    s.appendChild(h('a', { class: 'bt-meta', href: 'report.html#notes', text: '전체 보기 → report.html#notes' }));
  }
  function renderNoteList() {
    var r = sheetRefs;
    r.list.textContent = '';
    var mine = who && L ? L.notes.filter(function (n) { return n.page === PAGE; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; }) : [];
    r.head.textContent = '이 페이지에서 남긴 기록 ' + mine.length + '개';
    mine.slice(0, 5).forEach(function (n) {
      r.list.appendChild(h('li', null, h('span', { class: 'k', text: n.kind }),
        (n.text || '').slice(0, 60) + ((n.text || '').length > 60 ? '…' : ''),
        h('span', { class: 's', text: n.status === 'resolved' ? '해결됨' : '미해결' })));
    });
  }
  function openSheet(opts) {
    opts = opts || {};
    els.restore = document.activeElement;
    if (!sheetRefs) buildSheet();
    var r = sheetRefs;
    r.quote.value = opts.quote != null ? opts.quote : selectionText();
    r.text.value = '';
    r.msg.textContent = who ? '' : '먼저 학습자를 골라야 저장됩니다. 위쪽 「학습자 선택」을 눌러 주세요.';
    var uid = opts.unit || currentUnitId() || '';
    r.unit.value = PAGE_UNITS.some(function (u) { return u.id === uid; }) ? uid : '';
    var kind = opts.kind || '헷갈림';
    r.kinds.querySelectorAll('input').forEach(function (i) { i.checked = i.value === kind; });
    renderNoteList();
    openOverlay(); els.sheet.classList.add('open');
    setTimeout(function () { r.text.focus(); }, 30);
  }
  function saveNote() {
    var r = sheetRefs, text = r.text.value.trim();
    if (!text) { r.msg.textContent = '내용을 적어 주세요.'; r.text.focus(); return; }
    if (!who) { r.msg.textContent = '먼저 학습자를 골라야 저장됩니다.'; return; }
    var kindEl = r.kinds.querySelector('input:checked');
    var now = iso();
    var note = { id: newId(), unit: r.unit.value || null, page: PAGE, quote: r.quote.value.trim(), text: text,
      kind: kindEl ? kindEl.value : '헷갈림', status: 'open', answer: '', answeredBy: '', at: now, updatedAt: now };
    mutate(function (l) { autoStart(l); l.notes.push(note); }, 800);
    lastSel = null;
    r.text.value = ''; r.quote.value = '';
    r.msg.textContent = '저장했습니다.';
    renderNoteList();
    toast('헷갈림을 기록했습니다.');
  }

  // ───────── 키보드 (Esc 닫기, Tab 가두기) ─────────
  function onKey(e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); closeAll(); return; }
    if (e.key !== 'Tab') return;
    var box = els.sheet.classList.contains('open') ? els.sheet : els.modal;
    var f = Array.prototype.filter.call(box.querySelectorAll('button,a[href],input,textarea,select'), function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ───────── 시작 ─────────
  function init() {
    injectCss();
    els.top = h('div', { class: 'bt-top', 'data-bt': 'top' });
    els.fab = h('button', { class: 'bt-fab', type: 'button', 'data-bt': 'fab', text: '❓ 헷갈림 기록', onclick: function () { openSheet(); } });
    els.over = h('div', { class: 'bt-over', 'data-bt': 'over', onclick: closeAll });
    els.sheet = h('div', { class: 'bt-sheet', 'data-bt': 'sheet' });
    els.modal = h('div', { class: 'bt-modal', 'data-bt': 'modal' });
    els.toast = h('div', { class: 'bt-toast', 'data-bt': 'toast', role: 'status', 'aria-live': 'polite' });
    [els.top, els.fab, els.over, els.sheet, els.modal, els.toast].forEach(function (e) { document.body.appendChild(e); });
    renderTop();
    if (!getWho()) { var asked = null; try { asked = sessionStorage.getItem('bt_pick_asked'); } catch (e) {} if (!asked) { try { sessionStorage.setItem('bt_pick_asked', '1'); } catch (e) {} setTimeout(function () { if (!who) openPicker(); }, 700); } }
    if (CUR) buildUnits();
    addRedo();
    setTimeout(addRedo, 800);   // 나중에 만들어지는 문제 상자도 잡는다

    ['scroll', 'mousemove', 'keydown', 'touchstart', 'click', 'wheel'].forEach(function (ev) {
      window.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true });
    });
    document.addEventListener('click', onQuizClick, true);
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('keydown', onKey);
    setInterval(tick, 5000);
    setInterval(function () { if (dirty) pushNow(); }, 30000);
    function flush() { if (dirty) pushNow(); }
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

    var w = getWho();
    if (w) loadLearner(w);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
