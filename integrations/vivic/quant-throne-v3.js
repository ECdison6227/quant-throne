(() => {
  'use strict';
  // 量权 × Vivic in-app bridge v3: Vivic-native entry chip, phone-ratio game stage + side panel.
  if (document.getElementById('qt-launch') || /^\/display(?:\/|$)/.test(location.pathname)) return;
  const ORIGIN = 'https://edsionc.top';
  const GAME = ORIGIN + '/game/games/quant-throne/index.html?embed=vivic';
  const ART = ORIGIN + '/game/games/quant-throne/assets/art/';
  const ICON = ORIGIN + '/quant-throne/assets/icon.webp';
  const PROFILE_KEY = 'vivic.quant-throne.pending.v2', TOKEN_KEY = 'vivic.quant-throne.transfer.v2';
  const keys = ['risk', 'market', 'style', 'info', 'judgement', 'discipline', 'literacy'];
  const roots = ['schema', 'game', 'version', 'createdAt', 'demonstration', 'dimensions', 'conflicts', 'uncertain', 'persona', 'recommendations', 'notRecommended', 'nextTask', 'revisions', 'dataSource', 'disclaimer'];

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const img = (src, cls, alt = '') => { const i = el('img', cls); i.src = src; i.alt = alt; i.decoding = 'async'; i.referrerPolicy = 'no-referrer'; return i; };

  // ---------- entry chip ----------
  const launch = el('button', 'qt-launch');
  launch.id = 'qt-launch'; launch.type = 'button'; launch.setAttribute('aria-label', '打开量权：玩一局，生成三张 Vivic 卡片');
  const dot = el('span', 'qt-launch-dot');
  launch.append(img(ICON, 'qt-launch-icon'), el('span', 'qt-launch-text', '量权'), dot);

  // ---------- overlay ----------
  const overlay = el('div', 'qt-overlay'); overlay.hidden = true;
  overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', '量权 × Vivic');
  const scrim = el('div', 'qt-scrim');
  const shell = el('div', 'qt-shell');
  const close = el('button', 'qt-close', '×'); close.type = 'button'; close.setAttribute('aria-label', '关闭量权');

  // phone stage (fixed 390:844, never stretched)
  const stage = el('div', 'qt-stage');
  const phone = el('div', 'qt-phone');
  const poster = el('button', 'qt-poster'); poster.type = 'button'; poster.setAttribute('aria-label', '开始一局量权');
  poster.style.backgroundImage = `url("${ART}home.webp")`;
  const posterInner = el('span', 'qt-poster-inner');
  posterInner.append(img(ICON, 'qt-poster-icon'), el('strong', 'qt-poster-title', '量权'), el('span', 'qt-poster-sub', '滑几张卡，找到你的第一个量化任务'), el('span', 'qt-play', '开始一局'));
  poster.append(posterInner);
  phone.append(poster);
  stage.append(phone);

  // side panel
  const panel = el('aside', 'qt-panel');
  const head = el('div', 'qt-head');
  head.append(img(ICON, 'qt-head-icon'), Object.assign(el('div', 'qt-head-text'), {}));
  head.lastChild.append(el('strong', '', '量权 × Vivic'), el('span', '', 'PandaAI 官方授权数据支持'));
  const steps = el('ol', 'qt-steps');
  const stepDefs = [['玩一局', '5–8 分钟，左右滑卡做决策'], ['得到画像', '能力与偏好分开，每项有依据'], ['存成三张卡', '画像 · 下一步任务 · 真实行情观察']];
  const stepEls = stepDefs.map(([t, d], i) => { const li = el('li', 'qt-step'); li.append(el('span', 'qt-step-n', String(i + 1)), Object.assign(el('div'), {})); li.lastChild.append(el('b', '', t), el('small', '', d)); steps.append(li); return li; });
  const persona = el('div', 'qt-persona'); persona.hidden = true;
  const personaName = el('strong', 'qt-persona-name'); const personaMeta = el('span', 'qt-persona-meta');
  persona.append(el('span', 'qt-persona-label', '你的画像'), personaName, personaMeta);
  const cards = el('div', 'qt-cards'); cards.hidden = true;
  [['画像', 'quant-throne.profile'], ['下一步任务', 'quant-throne.next-task'], ['行情观察', 'quant-throne.market-watch']].forEach(([t]) => { const c = el('div', 'qt-mini'); c.append(el('span', 'qt-mini-bar'), el('b', '', t)); cards.append(c); });
  const status = el('p', 'qt-status', '完成一局后，画像会自动出现在这里。');
  const save = el('button', 'qt-primary', '保存三张卡到 Vivic'); save.type = 'button'; save.disabled = true;
  const view = el('button', 'qt-primary', '查看我的量权 Space →'); view.type = 'button'; view.hidden = true;
  const more = el('div', 'qt-more');
  const fileButton = el('button', 'qt-link', '导入画像 JSON'); fileButton.type = 'button';
  const site = el('a', 'qt-link', '量权官网 ↗'); site.href = ORIGIN + '/quant-throne/'; site.target = '_blank'; site.rel = 'noreferrer';
  const file = el('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
  more.append(fileButton, site, file);
  const foot = el('p', 'qt-foot', '只传结构化画像，逐卡记录留在本机 · 不构成投资建议');
  panel.append(head, steps, persona, cards, status, save, view, more, foot);

  shell.append(stage, panel, close);
  overlay.append(scrim, shell);
  document.body.append(launch, overlay);

  let frame = null, pending = null, requestId = '', busy = false, pendingToken = '', poll = null, lastFocus = null;

  function setStep(n) { stepEls.forEach((s, i) => { s.classList.toggle('is-done', i < n); s.classList.toggle('is-now', i === n); }); }
  setStep(0);

  function valid(p) {
    if (!p || p.schema !== 'pandaai.profile.v1' || p.game !== 'quant-throne' || Object.keys(p).some(k => !roots.includes(k)) || typeof p.persona?.name !== 'string' || p.persona.name.length > 80 || !p.dimensions || !Array.isArray(p.recommendations) || p.recommendations.length < 1 || p.recommendations.length > 3 || JSON.stringify(p).length > 64000) return false;
    return keys.every(k => { const d = p.dimensions[k]; return d && ['preference', 'ability'].includes(d.kind) && ['low', 'mid', 'high'].includes(d.confidence) && typeof d.label === 'string' && d.label.length <= 40 && (d.score === null || typeof d.score === 'string' && d.score.length <= 100 || typeof d.score === 'number' && Number.isFinite(d.score) && d.score >= 0 && d.score <= 100); });
  }

  function receive(p) {
    if (!valid(p)) return false;
    const changed = JSON.stringify(p) !== JSON.stringify(pending);
    pending = p; if (changed || !requestId) requestId = 'qt-' + crypto.randomUUID();
    const summary = { schema: p.schema, persona: { name: p.persona.name }, createdAt: p.createdAt, dimensions: keys.map(key => { const d = p.dimensions[key]; return { key, label: d.label, kind: d.kind, score: d.score, confidence: d.confidence, uncertain: !!d.uncertain }; }) };
    try { localStorage.setItem('vivic.quant-throne.summary.v1', JSON.stringify(summary)); sessionStorage.setItem(PROFILE_KEY, JSON.stringify({ profile: p, requestId })); } catch { }
    personaName.textContent = p.persona.name;
    const task = typeof p.nextTask?.title === 'string' ? p.nextTask.title.slice(0, 40) : '';
    personaMeta.textContent = (task ? '下一步：' + task : '') + (p.demonstration ? (task ? ' · ' : '') + '模拟演示路径 ' + p.demonstration.path : '');
    persona.hidden = false; cards.hidden = false;
    status.textContent = '三张卡会存进独立的「量权」Space，不覆盖当前画布。';
    save.disabled = false; view.hidden = true; save.hidden = false;
    setStep(2); dot.classList.add('is-on'); overlay.classList.add('has-profile'); overlay.classList.remove('is-playing');
    return true;
  }

  function mountGame() {
    if (frame) return;
    frame = el('iframe', 'qt-frame');
    frame.title = '量权'; frame.src = GAME; frame.allow = 'autoplay; fullscreen'; frame.referrerPolicy = 'no-referrer';
    phone.replaceChildren(frame);
    setStep(pending ? 2 : 0);
  }

  function open({ play = false } = {}) {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    document.documentElement.classList.add('qt-lock');
    if (play) mountGame();
    (play ? close : poster.isConnected ? poster : close).focus({ preventScroll: true });
  }

  function shutdown() {
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('qt-lock');
    try { frame?.contentWindow?.postMessage({ type: 'game:pause' }, ORIGIN); } catch { }
    setTimeout(() => {
      overlay.hidden = true;
      if (frame) { frame.remove(); frame = null; phone.replaceChildren(poster); }
      (lastFocus instanceof HTMLElement ? lastFocus : launch).focus({ preventScroll: true });
    }, 220);
  }

  async function request(path, body) {
    const r = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    let data = {}; try { data = await r.json(); } catch { }
    if (!r.ok) throw Error(r.status === 401 ? '请先登录 Vivic，登录后会自动继续。' : (data.message || data.error || '服务暂不可用'));
    return data;
  }

  launch.addEventListener('click', () => { open({ play: false }); if (pendingToken) void claim(); });
  poster.addEventListener('click', () => {
    if (matchMedia('(max-width: 760px)').matches) { overlay.classList.add('is-playing'); }
    mountGame();
  });
  close.addEventListener('click', shutdown);
  scrim.addEventListener('click', shutdown);
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); shutdown(); return; }
    if (e.key !== 'Tab') return;
    const f = [...overlay.querySelectorAll('button:not([disabled]):not([hidden]),a[href],iframe')].filter(n => n.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden && overlay.classList.contains('is-open') && !overlay.contains(document.activeElement)) shutdown(); });
  fileButton.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const selected = file.files?.[0]; file.value = ''; if (!selected) return;
    try { if (selected.size > 64000) throw Error(); const p = JSON.parse(await selected.text()); if (!receive(p)) throw Error(); }
    catch { status.textContent = '需要有效的量权 profile.v1 JSON（≤64KB，不含逐卡记录）。'; }
  });

  window.addEventListener('message', e => {
    if (e.origin === ORIGIN && frame && e.source === frame.contentWindow && e.data?.type === 'pandaai.profile.v1') receive(e.data.profile);
  });

  save.addEventListener('click', async () => {
    if (!pending || busy) return;
    busy = true; save.disabled = true; save.textContent = '正在校验并读取真实行情…'; overlay.classList.add('is-busy');
    try {
      const result = await request('/api/quant-throne/import', { requestId, profile: pending, symbol: '000300.SH' });
      if (!result.ok || result.cards !== 3) throw Error('没有收到三张卡的保存回执');
      status.textContent = result.marketStatus === 'unavailable' ? '已保存。行情服务暂不可用，观察卡保留为空状态，不填假数据。' : '已保存。行情观察卡使用 Panda Data 真实快照。';
      save.hidden = true; view.hidden = false; setStep(3); cards.classList.add('is-saved');
      try { sessionStorage.removeItem(PROFILE_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch { }
      window.dispatchEvent(new Event('vivic:card-packages-changed'));
      try { const c = new BroadcastChannel('vivic.card-packages.v1'); c.postMessage('changed'); c.close(); const d = new BroadcastChannel('vivic:card-definitions:0.1'); d.postMessage('reload'); d.close(); } catch { }
      view.focus({ preventScroll: true });
    } catch (error) {
      status.textContent = '未保存：' + error.message;
    } finally {
      busy = false; save.disabled = false; save.textContent = '保存三张卡到 Vivic'; overlay.classList.remove('is-busy');
    }
  });
  view.addEventListener('click', () => location.assign('/?quant-throne=ready'));

  async function claim() {
    if (!pendingToken || busy) return;
    try {
      const session = await request('/api/space/session');
      if (!session.authenticated) { status.textContent = '画像已送达，请先登录 Vivic，登录后自动继续。'; persona.hidden = true; return; }
      busy = true;
      const result = await request('/api/quant-throne/claim', { token: pendingToken });
      if (!receive(result.profile)) throw Error('画像结构不正确');
      pendingToken = ''; try { sessionStorage.removeItem(TOKEN_KEY); } catch { }
      if (poll) { clearInterval(poll); poll = null; }
    } catch (error) { status.textContent = '暂未接收画像：' + error.message; }
    finally { busy = false; }
  }

  try {
    const saved = JSON.parse(sessionStorage.getItem(PROFILE_KEY) || 'null');
    if (saved && valid(saved.profile)) { pending = saved.profile; requestId = saved.requestId; receive(saved.profile); }
    const hash = new URLSearchParams(location.hash.slice(1));
    pendingToken = hash.get('quant-transfer') || sessionStorage.getItem(TOKEN_KEY) || '';
    if (pendingToken) {
      if (!/^[A-Za-z0-9_-]{32}$/.test(pendingToken)) pendingToken = '';
      else {
        sessionStorage.setItem(TOKEN_KEY, pendingToken);
        history.replaceState(null, '', location.pathname + location.search);
        overlay.classList.add('is-transfer'); open({ play: false }); void claim();
        poll = setInterval(() => { if (pendingToken) void claim(); else { clearInterval(poll); poll = null; } }, 3000);
      }
    }
    if (new URLSearchParams(location.search).get('quant-throne') === 'play' && !pendingToken) open({ play: true });
  } catch { }
})();
