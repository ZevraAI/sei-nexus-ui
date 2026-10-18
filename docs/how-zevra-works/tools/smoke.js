// Smoke test for the built guide: loads it in a simulated browser (jsdom), clicks every tab, step,
// picker and simulator, and fails on any script error or empty section.
//
//   cd docs/how-zevra-works/tools && npm install && node smoke.js            (tests ../built/how-zevra-works.html)
//   node smoke.js path/to/other.html
//   SANDBOX=1 node smoke.js        (also proves it works inside zevra-ui's sandboxed iframe: no storage, no history)
//
// Counts are read from the page's own data (window.ZG), so adding steps, examples, rows or tabs
// never needs this file to change. It does NOT judge visual layout or factual accuracy: use
// verify_facts.py for the facts and look at the page for the layout.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '..', 'built', 'how-zevra-works.html');
const html = fs.readFileSync(file, 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('script error: ' + ((e.detail && e.detail.stack) || e.message)));
vc.on('error', e => errors.push('console.error: ' + e));

const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://example.test/',
  beforeParse(w) {
    w.scrollTo = () => {};
    w.Element.prototype.scrollIntoView = function () {};
    w.matchMedia = w.matchMedia || (() => ({ matches: false }));
    if (process.env.SANDBOX) {
      // Emulate the sandboxed iframe zevra-ui embeds the guide in: no storage, no history changes.
      const deny = () => { throw new w.DOMException('denied', 'SecurityError'); };
      Object.defineProperty(w, 'localStorage', { get: deny });
      Object.defineProperty(w, 'sessionStorage', { get: deny });
      w.history.replaceState = deny;
    }
  }
});
const w = dom.window, d = w.document;
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const $ = (s, r) => (r || d).querySelector(s);
const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
const check = (ok, msg) => { if (!ok) errors.push('FAIL: ' + msg); };

setTimeout(() => {
  const ZG = w.ZG;
  check(!!ZG, 'window.ZG exists');
  const tabs = $$('.tab');
  check(tabs.length === $$('.panel').length, 'one tab per panel');

  // every tab; every step of every flow opens and has content; player buttons work
  tabs.forEach(t => {
    click(t);
    const id = t.dataset.tab, on = $$('.panel.on');
    check(on.length === 1 && on[0].id === 'p-' + id, 'tab ' + id + ' shows only its panel');
    $$('.step', on[0]).forEach((s, i) => {
      click($('.srow', s));
      check(s.classList.contains('open'), id + ' step ' + (i + 1) + ' opens');
      check($('.detail', s).textContent.trim().length > 40, id + ' step ' + (i + 1) + ' has content');
    });
    const nx = $('[data-a="next"]', on[0]), pv = $('[data-a="prev"]', on[0]), pl = $('[data-a="play"]', on[0]);
    if (nx) click(nx);
    if (pv) click(pv);
    if (pl) { click(pl); check(/Pause/.test(pl.textContent), id + ' play toggles to pause'); click(pl); }
  });
  Object.keys(ZG.flows).forEach(k => check($$('#flow-' + k + ' .step').length === ZG.flows[k].steps.length, 'flow ' + k + ' renders every step'));

  // overview
  click($('[data-tab="overview"]'));
  check($$('.place').length === ZG.places.length, 'one card per place');
  $$('.place').forEach(p => { click(p); check($('#placebox').textContent.length > 80, 'place details filled'); });
  check($$('#aiTable tbody tr').length === ZG.aiUses.length, 'AI table lists every AI use');
  $$('#aiFilter .chip').forEach(c => {
    click(c);
    const f = c.dataset.f, want = f === 'All' ? ZG.aiUses.length : ZG.aiUses.filter(r => r.area === f).length;
    check($$('#aiTable tbody tr').length === want, 'AI filter ' + f);
  });
  check($$('#flowcards .card').length === ZG.flowCards.length, 'one card per flow');
  click($('#flowcards [data-goto="f3"]'));
  check($('#p-f3').classList.contains('on'), 'flow card navigates');

  // chat examples
  const ex = ZG.flows.f3.examples, picks = $$('#qpick .chip');
  check(picks.length === ex.length, 'one chip per example');
  picks.forEach((c, i) => {
    click(c);
    check($('#qintro').textContent.includes('Outcome'), 'example ' + i + ' shows an outcome');
    check($$('#ledger .lrow').length === ex[i].ledger.length, 'example ' + i + ' ledger rows');
    const skipped = $$('#flow-f3 .step.skip').length;
    check(skipped === Object.keys(ex[i].skip || {}).length, 'example ' + i + ' skipped steps');
  });

  // data-boundary widget (trust tab and flow 2)
  click($('[data-tab="trust"]'));
  check($$('#bnd-trust .chip').length === ZG.bnd.length, 'one chip per boundary moment');
  $$('#bnd-trust .chip').forEach(c => { click(c); check($('#bnd-trust .rcv').textContent.length > 20, 'boundary shows what OpenAI receives'); });
  check($$('#bnd-f2 .chip').length === ZG.bnd.length, 'flow 2 boundary widget');
  check($$('#storeTable tbody tr').length === ZG.store.length, 'storage table');
  check($$('#guards .card').length === ZG.guards.length, 'safety checks');
  check($$('#limits .card').length === ZG.limits.length, 'known limits');
  check($$('#faq details').length === ZG.faq.length, 'faq');

  // tenant isolation widget
  click($('[data-tab="f1"]'));
  const iso = $('.widget[data-w="isolation"]');
  check(!!iso, 'isolation widget present');
  if (iso) { click($$('.chip', iso)[1]); check(/tenant_/.test(iso.textContent), 'isolation widget switches user'); }

  // agent simulator
  click($('[data-tab="f4"]'));
  const nxa = $('#agentsim [data-a="n"]');
  for (let i = 0; i < ZG.agentRun.steps.length + 3; i++) click(nxa);
  check($$('#agentsim .thought').length === ZG.agentRun.steps.length, 'agent simulator shows every step');
  check(nxa.disabled, 'agent simulator ends');
  click($('#agentsim [data-a="r"]'));
  check($$('#agentsim .thought').length === 0, 'agent simulator restarts');
  check($$('#bg .chip').length === ZG.bg.length, 'background feature chips');
  $$('#bg .chip').forEach(c => click(c));

  // learning simulator: enough reuse must lead to promotion; a floor of corrections must not go below 0
  click($('[data-tab="f5"]'));
  const L = $('#learnsim'), b = a => $('[data-a="' + a + '"]', L);
  for (let i = 0; i < 25; i++) if (!b('reuse').disabled) click(b('reuse'));
  click(b('night'));
  check(L.textContent.includes('Promoted to company vocabulary'), 'learning: heavy reuse then nightly job promotes');
  click(b('reset'));
  for (let i = 0; i < 8; i++) click(b('corr'));
  check(/0\.00/.test($('[data-s]', L).textContent), 'learning: confidence floors at 0.00');

  // theme toggle
  const tb = $('#themeBtn'), root = d.documentElement;
  click(tb); check(root.getAttribute('data-theme') === 'light', 'theme -> light');
  click(tb); check(root.getAttribute('data-theme') === 'dark', 'theme -> dark');
  click(tb); check(!root.hasAttribute('data-theme'), 'theme -> auto');

  console.log(errors.length ? 'SMOKE TEST FAILED (' + errors.length + '):\n' + errors.join('\n') : 'smoke test passed: no script errors, every section populated');
  process.exit(errors.length ? 1 : 0);
}, 400);
