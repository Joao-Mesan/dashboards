/*!
 * Motor de Dashboards de Mídia Paga
 * Um único arquivo para todos os clientes. Cada página define window.DASH
 * (cliente, fontes, PIN, idioma, moeda) e carrega este arquivo.
 */
(function () {
'use strict';

var VERSION = '1.1.1';
var D = window.DASH || {};
var ROOT = document.getElementById(D.elemento || 'dash');
if (!ROOT) return;

/* ============================== ARMAZENAMENTO ============================== */
var CLIENT_KEY = String(D.cliente || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W+/g, '_').toLowerCase();
var store = {
  k: function (n) { return 'dash_' + CLIENT_KEY + '_' + n; },
  get: function (n, def) { try { var v = localStorage.getItem(this.k(n)); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set: function (n, v) { try { localStorage.setItem(this.k(n), JSON.stringify(v)); } catch (e) {} },
  del: function (n) { try { localStorage.removeItem(this.k(n)); } catch (e) {} }
};

/* ============================== IDIOMA E FORMATO ============================== */
var LANGS = (D.idiomas && D.idiomas.length) ? D.idiomas : ['pt'];
var LANG = store.get('lang', LANGS[0]);
if (LANGS.indexOf(LANG) < 0) LANG = LANGS[0];
function L(pt, es) { return (LANG === 'es' && es != null) ? es : pt; }
function LOC() { return LANG === 'es' ? 'es-AR' : 'pt-BR'; }
var CUR = D.moeda || 'BRL';

function ok(v) { return v != null && isFinite(v); }
function nf(v, d) { d = d || 0; return new Intl.NumberFormat(LOC(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v || 0); }
function money(v) {
  if (!ok(v)) return '—';
  var a = Math.abs(v), d = a < 100 ? 2 : 0;
  try { return new Intl.NumberFormat(LOC(), { style: 'currency', currency: CUR, minimumFractionDigits: d, maximumFractionDigits: d }).format(v); }
  catch (e) { return CUR + ' ' + nf(v, d); }
}
function moneyShort(v) {
  if (!ok(v)) return '—';
  var a = Math.abs(v);
  if (a >= 1e6) return money(v / 1e6).replace(/[,.]00(?=\D*$)/, '') + 'M';
  if (a >= 1e4) return money(Math.round(v / 1e3)).replace(/[,.]00(?=\D*$)/, '') + 'k';
  return money(v);
}
function count(v) { if (!ok(v)) return '—'; return nf(v, (Math.abs(v - Math.round(v)) > 0.05 && Math.abs(v) < 100) ? 1 : 0); }
function pctf(v, d) { if (!ok(v)) return '—'; if (d == null) d = Math.abs(v) < 0.1 ? 2 : 1; return nf(v * 100, d) + '%'; }
function xf(v) { return ok(v) ? nf(v, 2) + 'x' : '—'; }
function deltaTxt(c, p) {
  if (!ok(c) || !ok(p) || p === 0) return null;
  var d = (c - p) / Math.abs(p);
  return { v: d, txt: (d > 0 ? '+' : '') + nf(d * 100, 0) + '%' };
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function $(s, c) { return (c || ROOT).querySelector(s); }
function $$(s, c) { return Array.prototype.slice.call((c || ROOT).querySelectorAll(s)); }

/* ============================== DATAS (sempre ISO AAAA-MM-DD) ============================== */
function p2(n) { return String(n).padStart(2, '0'); }
function isoOf(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
function todayISO() { return isoOf(new Date()); }
function addDays(iso, n) { var a = iso.split('-').map(Number); return isoOf(new Date(a[0], a[1] - 1, a[2] + n)); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); }
function monthStart(iso) { return iso.slice(0, 8) + '01'; }
function monthEnd(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7); return iso.slice(0, 8) + p2(new Date(y, m, 0).getDate()); }
function prevMonthStart(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7); return isoOf(new Date(y, m - 2, 1)); }
function fmtD(iso, year) { if (!iso) return '—'; var s = iso.slice(8, 10) + '/' + iso.slice(5, 7); return year ? s + '/' + iso.slice(0, 4) : s; }
function parseDate(v) {
  if (v == null) return null;
  var s = String(v).trim(), m;
  if (!s) return null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + p2(m[2]) + '-' + p2(m[3]);
  if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))) { var y = +m[3]; if (y < 100) y += 2000; return y + '-' + p2(m[2]) + '-' + p2(m[1]); }
  var d = new Date(s);
  return isNaN(d) ? null : isoOf(d);
}

/* ============================== ESTILO ============================== */
var AC = D.cor || '#c9a96a';
function injectStyle() {
  if (!document.getElementById('dz-font')) {
    var l = document.createElement('link'); l.id = 'dz-font'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap';
    document.head.appendChild(l);
  }
  var css = '\
.dz{--bg:#0c0c0e;--card:#18181c;--card2:#1f1f24;--line:#28282e;--tx:#f3f3f5;--mut:#9a9aa6;--ac:' + AC + ';--ok:#3ecf8e;--bad:#ff6b6b;--warn:#f5b94a;\
container-type:inline-size;background:var(--bg);color:var(--tx);font-family:Poppins,system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.45;padding:20px;border-radius:14px;position:relative;min-height:300px;box-sizing:border-box}\
.dz *{box-sizing:border-box}\
.dz h1{font-size:22px;font-weight:600;margin:0}.dz h2{font-size:17px;font-weight:600;margin:0 0 4px}.dz h3{font-size:15px;font-weight:600;margin:0 0 6px}\
.dz p{margin:0 0 8px}.dz small,.dz .mut{color:var(--mut)}\
.dz button{font-family:inherit;cursor:pointer}\
.dz .head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;margin-bottom:16px}\
.dz .brand{display:flex;gap:12px;align-items:center}.dz .logo{width:38px;height:38px;border-radius:10px;border:1px solid var(--ac);color:var(--ac);display:grid;place-items:center;font-weight:600;font-size:18px}\
.dz .btn{background:var(--card);color:var(--tx);border:1px solid var(--line);border-radius:10px;padding:9px 14px;font-size:13px;font-weight:500}\
.dz .btn.pri{background:var(--ac);color:#111;border-color:var(--ac)}.dz .btn:hover{filter:brightness(1.15)}\
.dz .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:14px}\
.dz .card.hl{border-top:3px solid var(--ac)}\
.dz .bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}\
.dz .pills{display:flex;flex-wrap:wrap;gap:6px}\
.dz .pill{background:transparent;color:var(--tx);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:12.5px}\
.dz .pill.on{border-color:var(--ac);color:var(--ac);background:color-mix(in srgb,var(--ac) 12%,transparent)}\
.dz select,.dz input[type=date],.dz input[type=number],.dz input[type=text],.dz input[type=password],.dz textarea{background:var(--card2);color:var(--tx);border:1px solid var(--line);border-radius:8px;padding:7px 10px;font-family:inherit;font-size:13px}\
.dz textarea{width:100%;min-height:90px}\
.dz .tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin:16px 0;scrollbar-width:none}\
.dz .tabs button{background:none;border:0;color:var(--mut);padding:11px 13px;font-size:13.5px;font-weight:500;white-space:nowrap;border-bottom:2px solid transparent}\
.dz .tabs button.on{color:var(--tx);border-bottom-color:var(--ac)}\
.dz .view{display:none}.dz .view.on{display:block}\
.dz .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}\
.dz .grid.g2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}\
.dz .kpi{background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:14px}\
.dz .kpi .n{font-size:12px;color:var(--mut)}.dz .kpi .v{font-size:21px;font-weight:600;margin-top:4px}\
.dz .kpi .c{font-size:12px;color:var(--mut);margin-top:4px;display:flex;justify-content:space-between;gap:6px}\
.dz .up{color:var(--ok)}.dz .down{color:var(--bad)}.dz .warn{color:var(--warn)}\
.dz .tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--mut);margin-right:6px;white-space:nowrap}\
.dz .tag.real{border-color:var(--ok);color:var(--ok)}.dz .tag.hip{border-color:var(--warn);color:var(--warn)}.dz .tag.ac{border-color:var(--ac);color:var(--ac)}\
.dz .legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12.5px;color:var(--mut);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:12px}\
.dz .legend b{color:var(--tx)}.dz .ll{display:inline-block;width:22px;border-top:2px dashed #6c6c76;vertical-align:middle;margin-right:6px}.dz .ll.now{border-top:2.5px solid var(--ac)}.dz .ll.proj{border-top:2px dotted var(--ac)}\
.dz .note{font-size:12.5px;border:1px solid color-mix(in srgb,var(--warn) 40%,transparent);background:color-mix(in srgb,var(--warn) 8%,transparent);color:#e9d3a3;border-radius:10px;padding:10px 14px;margin-bottom:12px}\
.dz .tw{overflow-x:auto;border:1px solid var(--line);border-radius:12px}\
.dz table{border-collapse:collapse;width:100%;font-size:13px}\
.dz th,.dz td{padding:9px 11px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}\
.dz th:first-child,.dz td:first-child{text-align:left;white-space:normal;min-width:180px}\
.dz th{color:var(--mut);font-weight:500;font-size:12px;cursor:default;background:var(--card2)}\
.dz th[data-col]{cursor:pointer}.dz tr:last-child td{border-bottom:0}\
.dz td.prev,.dz th.prev{color:var(--mut)}\
.dz .stage{display:grid;grid-template-columns:1.3fr repeat(4,1fr);gap:8px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin-bottom:6px;background:var(--card2)}\
.dz .stage .lab{font-weight:500}.dz .stage .sub{font-size:11.5px;color:var(--mut)}\
.dz .stage.miss{background:transparent;border-style:dashed;grid-template-columns:1fr}\
.dz .stage.miss .lab{color:var(--mut)}\
.dz .ladder{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}\
.dz .step{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12px;color:var(--mut)}\
.dz .step.done{border-color:var(--ac);color:var(--tx);background:color-mix(in srgb,var(--ac) 10%,transparent)}\
.dz .ins{border-left:3px solid var(--line);padding:10px 14px;margin-bottom:8px;background:var(--card2);border-radius:0 10px 10px 0}\
.dz .ins.att{border-left-color:var(--bad)}.dz .ins.pos{border-left-color:var(--ok)}.dz .ins.dado{border-left-color:var(--warn)}\
.dz .ins b{display:block;margin-bottom:3px}.dz .ins .act{font-size:12.5px;color:var(--mut);margin-top:4px}\
.dz .form{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}\
.dz .form label{font-size:12px;color:var(--mut);display:block}.dz .form input,.dz .form select{width:100%;margin-top:4px}\
.dz .chart svg{width:100%;height:auto;display:block}.dz .chart{position:relative}\
.dz .axis{fill:#7d7d88;font-size:11px;font-family:inherit}.dz .grid-l{stroke:#26262c}\
.dz .tipbg{fill:#0b0b0d;stroke:#3a3a42}.dz .tiptx{fill:#fff;font-size:12px;font-family:inherit}\
.dz .paceBar{height:12px;background:var(--card2);border-radius:999px;overflow:hidden;display:flex;margin:8px 0}\
.dz .paceBar span{display:block;height:100%}\
.dz .lock{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:var(--bg);border-radius:14px}\
.dz .lock .box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:26px;text-align:center;width:min(340px,90%)}\
.dz .lock input{width:100%;font-size:20px;text-align:center;letter-spacing:6px;margin:14px 0 8px}\
.dz .empty{color:var(--mut);padding:24px;text-align:center}\
.dz .foot{color:var(--mut);font-size:11px;margin-top:18px;text-align:right}\
.dz .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}\
@container (max-width:640px){.dz{padding:12px}.dz h1{font-size:18px}.dz .stage{grid-template-columns:1fr 1fr}.dz .stage .lab{grid-column:1/-1}.dz .ladder{grid-template-columns:1fr 1fr}.dz .kpi .v{font-size:18px}}\
';
  var st = document.getElementById('dz-style');
  if (!st) { st = document.createElement('style'); st.id = 'dz-style'; document.head.appendChild(st); }
  st.textContent = css;
}

function reportHeight() {
  try { window.parent && window.parent !== window && window.parent.postMessage({ type: 'dash-height', height: document.documentElement.scrollHeight }, '*'); } catch (e) {}
}

/* ============================== CSV ============================== */
function detectDelim(text) {
  var lines = text.split(/\r?\n/).slice(0, 8), best = ',', bestScore = -1;
  [',', ';', '\t'].forEach(function (d) {
    var counts = lines.map(function (l) { return l.split(d).length - 1; }).filter(function (n) { return n > 0; });
    var score = counts.length ? counts.reduce(function (a, b) { return a + b; }, 0) / counts.length : 0;
    if (score > bestScore) { bestScore = score; best = d; }
  });
  return best;
}
function csvRows(text, delim) {
  var rows = [], row = [], cell = '', q = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i], n = text[i + 1];
    if (q) { if (c === '"' && n === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && n === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell); if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
}

/* ============================== MAPA DE COLUNAS ============================== */
var NOT_COST = /custo|cost|costo|\bcpc\b|\bcpm\b|\bctr\b|taxa|tasa|\brate\b|\/ /;
var RULES = {
  date: { exact: ['dia', 'data', 'fecha', 'day', 'date', 'data real', 'created time', 'created_time', 'data de cadastro', 'data de inscricao', 'timestamp', 'horario de envio', 'submitted at'], re: [/^(dia|data|fecha|date|day)\b/, /created|timestamp|cadastro|inscri|envio/], not: [/atualiz|nascim/] },
  campaign: { exact: ['campanha', 'nome da campanha', 'campana', 'nombre de la campana', 'campaign', 'campaign name'], re: [/campanha|campana|campaign/], not: [/^id|\bid\b|tipo|objetiv|objective|status|estado|orcamento|budget/] },
  account: { exact: ['conta', 'nome da conta', 'nome da conta de anuncios', 'account', 'account name', 'cuenta', 'nombre de la cuenta'], re: [/nome da conta|account name|nombre de la cuenta/], not: [/\bid\b/] },
  objective: { exact: ['objetivo', 'objective', 'objetivo da campanha', 'objetivo de la campana'], re: [/^objetivo/, /objective/] },
  adset: { exact: ['nome do conjunto de anuncios', 'conjunto de anuncios', 'nombre del conjunto de anuncios', 'ad set name', 'grupo de anuncios'], re: [/conjunto de anuncio|ad set name|grupo de anuncio/], not: [/\bid\b/] },
  ad: { exact: ['nome do anuncio', 'anuncio', 'nombre del anuncio', 'ad name'], re: [/nome do anuncio|nombre del anuncio|^ad name$/], not: [/\bid\b/] },
  spend: { exact: ['valor gasto', 'valor gasto (brl)', 'valor gasto (ars)', 'valor usado', 'valor usado (brl)', 'importe gastado', 'importe gastado (ars)', 'amount spent', 'custo', 'cost', 'investimento', 'inversion'], re: [/^valor (gasto|usado)/, /^importe gastado/, /^custo$/, /^cost$/, /amount spent/, /^investimento$/], not: [/por |\/|cpc|cpm|conv|lead|resultado/] },
  impressions: { exact: ['impr', 'impr.', 'impressoes', 'impresiones', 'impressions'], re: [/^impr/, /impression/], not: [/%|ctr|custo|cost|cpm|taxa|parcela|share/] },
  clicks: { exact: ['cliques no link', 'clics en el enlace', 'link clicks', 'cliques', 'clics', 'clicks'], re: [/cliques no link|clics en el enlace|link clicks/, /^cliques/, /^clics/, /^clicks/], not: [/unicos|unique|ctr|custo|costo|cost|cpc|taxa|saida|outbound/] },
  reach: { exact: ['alcance', 'reach'], re: [/^alcance/, /^reach/], not: [/custo|cost|costo|por /] },
  frequency: { exact: ['frequencia', 'frecuencia', 'frequency'], re: [/^frequen|^frecuen/] },
  lpv: { exact: ['visualizacoes da pagina de destino', 'visualizaciones de la pagina de destino', 'landing page views'], re: [/pagina de destino|landing page view/], not: [NOT_COST] },
  conversations: { exact: ['conversas por mensagem iniciadas', 'conversas por mensagens iniciadas', 'conversas iniciadas por mensagem', 'conversas iniciadas por mensagens', 'conversas iniciadas', 'conversas', 'messaging conversations started', 'messaging conversation started', 'conversations started', 'conversaciones con mensajes iniciadas', 'conversaciones iniciadas'], re: [/conversa|mensag|messaging conv/], not: [NOT_COST] },
  leads: { exact: ['leads', 'lead', 'cadastros', 'leads de formulario', 'leads no formulario', 'form leads', 'clientes potenciales', 'registros'], re: [/^leads?\b/, /cadastro/, /clientes? potencial/], not: [NOT_COST, /qualific|conversa|mensag/] },
  purchases: { exact: ['compras', 'purchases', 'conversoes', 'conversiones', 'conversions', 'conv.'], re: [/^compras$/, /^purchases$/, /^conversoes$/, /^conversiones$/, /^conversions$/, /^conv\.?$/], not: [NOT_COST, /valor|value|vista|view/] },
  revenue: { exact: ['valor conv', 'valor conv.', 'valor de conversao', 'valor de conversao da compra', 'valor de conversion de compras', 'conversion value', 'purchase conversion value', 'receita'], re: [/valor (de )?conv/, /conversion value/, /^receita$/], not: [/carrinho|carrito|cart|finaliza|checkout|\/ ?cust|\/ ?cost|por cust|pagina|page/] },
  cart: { exact: ['adicoes ao carrinho', 'articulos agregados al carrito', 'adds to cart', 'agregar al carrito'], re: [/carrinho|carrito|add to cart|adds to cart/], not: [/valor|custo|costo|cost|por /] },
  checkout: { exact: ['finalizacoes de compra iniciadas', 'pagos iniciados', 'checkouts initiated', 'inicio de pago'], re: [/finaliza|checkout|pagos iniciados/], not: [/valor|custo|costo|cost|por /] },
  convAction: { exact: ['acao de conversao', 'tipo de conversao', 'accion de conversion', 'tipo de conversion', 'conversion action', 'conversion type'], re: [/acao de conv|tipo de conv|accion de conv|conversion (action|type)/] }
};
var MEDIA_FIELDS = ['date', 'campaign', 'account', 'objective', 'adset', 'ad', 'spend', 'impressions', 'clicks', 'reach', 'frequency', 'lpv', 'conversations', 'leads', 'purchases', 'revenue', 'cart', 'checkout'];
var NUM_FIELDS = ['spend', 'impressions', 'clicks', 'reach', 'frequency', 'lpv', 'conversations', 'leads', 'purchases', 'revenue', 'cart', 'checkout'];

function mapColumns(header, wanted) {
  var normed = header.map(norm), map = {}, used = {};
  wanted.forEach(function (f) {
    var rule = RULES[f]; if (!rule) return;
    var idx = -1;
    for (var i = 0; i < rule.exact.length && idx < 0; i++) { var j = normed.indexOf(rule.exact[i]); if (j > -1 && !used[j]) idx = j; }
    if (idx < 0) for (var r = 0; r < rule.re.length && idx < 0; r++) {
      for (var k = 0; k < normed.length; k++) {
        if (used[k]) continue;
        if (rule.re[r].test(normed[k]) && !(rule.not || []).some(function (nr) { return nr.test(normed[k]); })) { idx = k; break; }
      }
    }
    if (idx > -1) { map[f] = idx; used[idx] = 1; }
  });
  return map;
}
function findHeaderRow(rows) {
  for (var i = 0; i < Math.min(rows.length, 12); i++) {
    var normed = rows[i].map(norm), filled = normed.filter(Boolean).length;
    if (filled >= 2 && normed.some(function (h) { return RULES.date.exact.indexOf(h) > -1 || /^(dia|data|fecha|date|day)\b|created|timestamp/.test(h); })) return i;
  }
  return 0;
}
function detectLocale(values) {
  var comma = 0, dot = 0;
  values.forEach(function (v) {
    var s = String(v).replace(/[^\d,.\-]/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) || /^-?\d+,\d{1,2}$/.test(s) || /^-?\d+,\d{4,}$/.test(s)) comma++;
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) || /^-?\d+\.\d{1,2}$/.test(s) || /^-?\d+\.\d{4,}$/.test(s)) dot++;
  });
  return comma > dot ? 'comma' : 'dot';
}
function makeNum(locale) {
  return function (v) {
    if (v == null) return 0;
    var s = String(v).trim(); if (!s || s === '-' || s === '--') return 0;
    s = s.replace(/[^\d,.\-]/g, '');
    if (locale === 'comma') s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
    var n = parseFloat(s); return isFinite(n) ? n : 0;
  };
}

/* ============================== CLASSIFICAÇÃO POR OBJETIVO ============================== */
var FUNNEL_ORDER = ['vendas', 'cadastro', 'whatsapp', 'trafego', 'outros'];
function funnelFromText(t) {
  var n = norm(t);
  if (!n) return null;
  if (/whats|wpp|\bzap\b|mensag|messag|conversa|direct|\bdm\b|\bmsg\b/.test(n)) return 'whatsapp';
  if (/lead|cadastro|formul|potencial|registro|captac/.test(n)) return 'cadastro';
  if (/engag|engaj|interac|awareness|reconhec|alcance|reach|video|view|seguidor|perfil|brand|branding/.test(n)) return 'outros';
  if (/traffic|trafego|trafico|landing|visita/.test(n)) return 'trafego';
  if (/sales|\bvendas\b|\bventas\b|compras?\b|catalog|shopping|pmax|performance max|ecommerce|e-commerce|conversion|conversao|conversiones/.test(n)) return 'vendas';
  return null;
}
/* Funis que fazem sentido para este cliente: lista em DASH.funis, ou automático pelas colunas existentes. */
function allowedFunnels() {
  if (D.funis && D.funis.length) return D.funis.concat(['outros']);
  var a = ['cadastro', 'whatsapp', 'outros'];
  if (STATE.has.purchases) a.push('vendas');
  if (STATE.has.lpv) a.push('trafego');
  return a;
}
function classifyCampaigns(rows) {
  var agg = {};
  rows.forEach(function (r) {
    var k = r.key, a = agg[k] || (agg[k] = { campaign: r.campaign, platform: r.platform, objective: '', purchases: 0, leads: 0, conversations: 0, lpv: 0, clicks: 0, forced: r.forcedFunnel || null });
    a.purchases += r.purchases; a.leads += r.leads; a.conversations += r.conversations; a.lpv += r.lpv; a.clicks += r.clicks;
    if (r.objective) a.objective = r.objective;
  });
  var overrides = D.objetivos || {}, out = {}, allow = allowedFunnels();
  Object.keys(agg).forEach(function (k) {
    var a = agg[k], f = null, why = '';
    // 1) regra manual  2) fonte  3) resultado que a campanha gerou  4) nome  5) objetivo da planilha
    Object.keys(overrides).some(function (sub) { if (norm(a.campaign).indexOf(norm(sub)) > -1) { f = overrides[sub]; why = 'regra da configuração'; return true; } });
    if (!f && a.forced) { f = a.forced; why = 'definido na fonte'; }
    if (!f) {
      var res = [['vendas', a.purchases], ['cadastro', a.leads], ['whatsapp', a.conversations]].filter(function (x) { return allow.indexOf(x[0]) > -1; }).sort(function (x, y) { return y[1] - x[1]; });
      if (res.length && res[0][1] > 0) { f = res[0][0]; why = 'resultado gerado'; }
    }
    if (!f) { f = funnelFromText(a.campaign); if (f) why = 'nome da campanha'; }
    if (!f) { f = funnelFromText(a.objective); if (f) why = 'objetivo da campanha'; }
    if (!f) { f = a.lpv > 0 ? 'trafego' : 'outros'; why = 'sem resultado de conversão'; }
    if (allow.indexOf(f) < 0) { why += ' → ' + FNAME(f) + ' não se aplica a este cliente'; f = 'outros'; }
    out[k] = { funnel: f, why: why };
  });
  return out;
}

/* ============================== ESTADO ============================== */
var STATE = {
  sources: [], rows: [], crm: [], gconv: [], has: {}, camp: {},
  preset: store.get('preset', 'mtd'), from: null, to: null, incToday: false,
  plat: 'all', acct: 'all', chartMetric: 'spend', sort: { col: 'spendNow', dir: -1 },
  loadedAt: null
};

/* ============================== PROCESSAMENTO POR FONTE ============================== */
function processMedia(src, text) {
  var st = src.status;
  var rows = csvRows(text, detectDelim(text));
  if (!rows.length) { st.error = L('Planilha vazia.', 'Planilla vacía.'); return []; }
  var h = findHeaderRow(rows), header = rows[h], map = mapColumns(header, MEDIA_FIELDS);
  st.headers = header; st.map = map; st.headerRow = h;
  var miss = ['date', 'campaign', 'spend'].filter(function (f) { return map[f] == null; });
  if (miss.length) { st.error = L('Colunas essenciais não encontradas: ', 'Columnas esenciales no encontradas: ') + miss.join(', '); return []; }
  var body = rows.slice(h + 1), sample = [];
  NUM_FIELDS.forEach(function (f) { if (map[f] != null) body.slice(0, 300).forEach(function (r) { if (r[map[f]]) sample.push(r[map[f]]); }); });
  st.locale = src.decimal || detectLocale(sample);
  var num = makeNum(st.locale), out = [], seen = {}, dup = 0, skipped = 0;
  var platform = src.plataforma || 'meta', have = {};
  NUM_FIELDS.forEach(function (f) { have[f] = map[f] != null; });
  if (src.conversaoComo === 'cadastro') { have.leads = have.leads || have.purchases; have.purchases = false; have.revenue = false; }
  body.forEach(function (r) {
    var date = parseDate(r[map.date]);
    if (!date) { skipped++; return; }
    var o = {
      date: date, platform: platform,
      account: (map.account != null && r[map.account]) ? String(r[map.account]).trim() : (src.conta || (platform === 'google' ? 'Google Ads' : 'Meta Ads')),
      campaign: String(r[map.campaign] || '(sem nome)').trim(),
      objective: map.objective != null ? String(r[map.objective] || '') : '',
      adset: map.adset != null ? String(r[map.adset] || '') : '',
      ad: map.ad != null ? String(r[map.ad] || '') : '',
      forcedFunnel: src.funil || null, _h: have
    };
    NUM_FIELDS.forEach(function (f) { o[f] = map[f] != null ? num(r[map[f]]) : 0; });
    if (src.conversaoComo === 'cadastro') { o.leads += o.purchases; o.purchases = 0; o.revenue = 0; }
    o.key = o.platform + '||' + o.account + '||' + o.campaign;
    var dk = [date, o.key, o.adset, o.ad].join('|'), sig = NUM_FIELDS.map(function (f) { return Math.round(o[f] * 100); }).join(',');
    if (seen[dk] === sig) { dup++; return; }
    seen[dk] = sig;
    out.push(o);
  });
  NUM_FIELDS.forEach(function (f) { if (map[f] != null) STATE.has[f] = true; });
  if (src.conversaoComo === 'cadastro' && map.purchases != null) STATE.has.leads = true;
  st.rows = out.length; st.dup = dup; st.skipped = skipped;
  return out;
}
var SALE_RE = /vend|vendid|fechad|ganh|\bwon\b|compr|contrat|matricul|cerrad|cliente fechado/;
var QUAL_RE = /qualific|visita|agend|proposta|negoci|oportun|reuni|atendid|interesse|calificad/;
function processCRM(src, text) {
  var st = src.status;
  var rows = csvRows(text, detectDelim(text));
  if (!rows.length) { st.error = L('Planilha vazia.', 'Planilla vacía.'); return []; }
  var h = findHeaderRow(rows), header = rows[h], normed = header.map(norm);
  var map = mapColumns(header, ['date']);
  var statusIdx = src.colunaStatus ? normed.indexOf(norm(src.colunaStatus)) : normed.findIndex(function (x) { return /status|etapa|situac|fase|stage|qualific|resultado/.test(x); });
  var valueIdx = src.colunaValor ? normed.indexOf(norm(src.colunaValor)) : normed.findIndex(function (x) { return /valor da venda|valor venda|receita|ticket|valor fechado/.test(x); });
  st.headers = header; st.map = { date: map.date, status: statusIdx > -1 ? statusIdx : undefined, value: valueIdx > -1 ? valueIdx : undefined }; st.headerRow = h;
  if (map.date == null) { st.error = L('Nenhuma coluna de data encontrada.', 'No se encontró columna de fecha.'); return []; }
  var num = makeNum(detectLocale(rows.slice(h + 1, h + 200).map(function (r) { return valueIdx > -1 ? r[valueIdx] : ''; })));
  var out = [];
  rows.slice(h + 1).forEach(function (r) {
    var d = parseDate(r[map.date]); if (!d) return;
    var s = statusIdx > -1 ? norm(r[statusIdx]) : '';
    var sale = statusIdx > -1 && SALE_RE.test(s), qual = sale || (statusIdx > -1 && QUAL_RE.test(s));
    var raw = {}; header.forEach(function (hh, j) { raw[hh] = r[j] == null ? '' : r[j]; });
    out.push({ date: d, funnel: src.funil || 'cadastro', sale: sale, qual: qual, value: (sale && valueIdx > -1) ? num(r[valueIdx]) : 0, status: statusIdx > -1 ? String(r[statusIdx]).trim() : '', raw: raw, src: src.nome || '' });
  });
  st.rows = out.length; st.hasStatus = statusIdx > -1;
  return out;
}
function processGConv(src, text) {
  var st = src.status, rows = csvRows(text, detectDelim(text));
  if (!rows.length) { st.error = L('Planilha vazia.', 'Planilla vacía.'); return []; }
  var h = findHeaderRow(rows), header = rows[h], map = mapColumns(header, ['date', 'campaign', 'convAction', 'purchases', 'revenue']);
  st.headers = header; st.map = map; st.headerRow = h;
  if (map.date == null || map.convAction == null) { st.error = L('Faltam colunas de data ou ação de conversão.', 'Faltan columnas de fecha o acción de conversión.'); return []; }
  var body = rows.slice(h + 1), num = makeNum(detectLocale(body.slice(0, 300).map(function (r) { return r[map.purchases]; })));
  var out = [];
  body.forEach(function (r) { var d = parseDate(r[map.date]); if (!d) return; out.push({ date: d, action: String(r[map.convAction] || '—').trim(), conv: map.purchases != null ? num(r[map.purchases]) : 0, value: map.revenue != null ? num(r[map.revenue]) : 0 }); });
  st.rows = out.length;
  return out;
}

/* ============================== CARREGAMENTO ============================== */
function initSources() {
  STATE.sources = (D.fontes || []).map(function (f, i) {
    var tipo = f.tipo || (f.plataforma ? 'midia' : 'crm');
    return Object.assign({}, f, { id: 'f' + i, tipo: tipo, status: {} });
  });
}
function fetchText(url) {
  var u = url + (url.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now();
  return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
}
function loadAll() {
  STATE.rows = []; STATE.crm = []; STATE.gconv = []; STATE.has = {};
  return Promise.all(STATE.sources.map(function (src) {
    src.status = {};
    var pasted = store.get('paste_' + src.id, '');
    var p = pasted ? Promise.resolve(pasted).then(function (t) { src.status.fromPaste = true; return t; }) : fetchText(src.url);
    return p.then(function (text) {
      if (src.tipo === 'midia') STATE.rows = STATE.rows.concat(processMedia(src, text));
      else if (src.tipo === 'conversoes_google') STATE.gconv = STATE.gconv.concat(processGConv(src, text));
      else STATE.crm = STATE.crm.concat(processCRM(src, text));
      src.status.ok = !src.status.error;
    }).catch(function (e) { src.status.ok = false; src.status.error = L('Não foi possível ler a planilha publicada: ', 'No se pudo leer la planilla publicada: ') + e.message; });
  })).then(function () {
    STATE.camp = classifyCampaigns(STATE.rows);
    STATE.rows.forEach(function (r) { r.funnel = STATE.camp[r.key].funnel; });
    STATE.loadedAt = new Date();
  });
}

/* ============================== AGREGAÇÃO ============================== */
function blank() { var o = { n: 0, freqW: 0, freqImpr: 0 }; NUM_FIELDS.forEach(function (f) { o[f] = 0; }); return o; }
function agg(rows) {
  var s = blank();
  rows.forEach(function (r) {
    NUM_FIELDS.forEach(function (f) { if (f !== 'frequency') s[f] += r[f]; });
    if (r.frequency > 0) { s.freqW += r.frequency * r.impressions; s.freqImpr += r.impressions; }
    s.n++;
  });
  s.freq = s.freqImpr > 0 ? s.freqW / s.freqImpr : null;
  s.ctr = s.impressions > 0 ? s.clicks / s.impressions : null;
  s.cpm = s.impressions > 0 ? s.spend / s.impressions * 1000 : null;
  s.cpc = s.clicks > 0 ? s.spend / s.clicks : null;
  s.roas = s.spend > 0 && s.revenue > 0 ? s.revenue / s.spend : null;
  return s;
}
function inRange(d, from, to) { return d >= from && d <= to; }
function filtered(from, to, extra) {
  return STATE.rows.filter(function (r) {
    return inRange(r.date, from, to) && (STATE.plat === 'all' || r.platform === STATE.plat) && (STATE.acct === 'all' || r.account === STATE.acct) && (!extra || extra(r));
  });
}
function crmIn(from, to, funnel) { return STATE.crm.filter(function (c) { return inRange(c.date, from, to) && (!funnel || c.funnel === funnel); }); }
function funnelsPresent() {
  var per = resolvePeriod(), set = {};
  STATE.rows.forEach(function (r) {
    if ((STATE.plat !== 'all' && r.platform !== STATE.plat) || (STATE.acct !== 'all' && r.account !== STATE.acct)) return;
    if (r.spend > 0 && (inRange(r.date, per.from, per.to) || inRange(r.date, per.pFrom, per.pTo))) set[r.funnel] = 1;
  });
  return FUNNEL_ORDER.filter(function (f) { return set[f]; });
}

/* ============================== PERÍODOS ============================== */
function lastDataDate() { var m = ''; STATE.rows.forEach(function (r) { if (r.date > m) m = r.date; }); return m || null; }
function resolvePeriod() {
  var today = todayISO(), end = STATE.incToday ? today : addDays(today, -1), p = STATE.preset, from, to, pFrom, pTo;
  if (p === 'custom' && STATE.from && STATE.to) { from = STATE.from; to = STATE.to; var n = daysBetween(from, to) + 1; pTo = addDays(from, -1); pFrom = addDays(pTo, -(n - 1)); }
  else if (p === 'mtd') { from = monthStart(today); to = end < from ? from : end; pFrom = prevMonthStart(today); pTo = addDays(from, -1); }
  else if (p === 'lastmonth') { to = addDays(monthStart(today), -1); from = monthStart(to); pTo = addDays(from, -1); pFrom = monthStart(pTo); }
  else { var len = parseInt(p, 10) || 30; to = end; from = addDays(to, -(len - 1)); pTo = addDays(from, -1); pFrom = addDays(pTo, -(len - 1)); }
  return { from: from, to: to, pFrom: pFrom, pTo: pTo, len: daysBetween(from, to) + 1, pLen: daysBetween(pFrom, pTo) + 1, isMtd: p === 'mtd' };
}
function daySeries(from, to, extra) {
  var map = {}, out = [];
  filtered(from, to, extra).forEach(function (r) { (map[r.date] = map[r.date] || []).push(r); });
  for (var d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, s: agg(map[d] || []) });
  return out;
}

/* ============================== FUNIS ============================== */
function FNAME(f) {
  return {
    vendas: L('Vendas no site', 'Ventas en el sitio'), cadastro: L('Cadastros', 'Registros'), whatsapp: 'WhatsApp',
    trafego: L('Tráfego para o site', 'Tráfico al sitio'), outros: L('Alcance e engajamento', 'Alcance e interacción')
  }[f] || f;
}
function RESULT(f) {
  return { vendas: 'purchases', cadastro: 'leads', whatsapp: 'conversations', trafego: 'lpv', outros: null }[f];
}
function RNAME(f, plural) {
  var n = { vendas: [L('compra', 'compra'), L('compras', 'compras')], cadastro: [L('cadastro', 'registro'), L('cadastros', 'registros')], whatsapp: [L('conversa', 'conversación'), L('conversas', 'conversaciones')], trafego: [L('visita', 'visita'), L('visitas', 'visitas')] }[f];
  return n ? n[plural === false ? 0 : 1] : L('resultados', 'resultados');
}
/* Referências de mercado (Meta). Faixas amplas, servem de sanidade — o histórico da conta vale mais. */
var BENCH = {
  ctr: [0.01, 0.02], lpvRate: [0.70, 0.85], cartRate: [0.04, 0.10], chkRate: [0.45, 0.70], buyRate: [0.30, 0.50],
  qualRate: [0.15, 0.30], saleRate: [0.15, 0.30]
};

/* Monta as etapas de um funil com números do período atual e anterior. */
function buildFunnel(f, per) {
  var ext = function (r) { return r.funnel === f; };
  var cur = agg(filtered(per.from, per.to, ext)), prev = agg(filtered(per.pFrom, per.pTo, ext));
  var crmSrc = STATE.sources.some(function (s) { return s.tipo === 'crm' && (s.funil || 'cadastro') === f; });
  var crmStatus = STATE.sources.some(function (s) { return s.tipo === 'crm' && (s.funil || 'cadastro') === f && s.status.hasStatus; });
  var cc = crmIn(per.from, per.to, f), cp = crmIn(per.pFrom, per.pTo, f);
  var crmCur = { n: cc.length, qual: cc.filter(function (x) { return x.qual; }).length, sale: cc.filter(function (x) { return x.sale; }).length, value: cc.reduce(function (a, x) { return a + x.value; }, 0) };
  var crmPrev = { n: cp.length, qual: cp.filter(function (x) { return x.qual; }).length, sale: cp.filter(function (x) { return x.sale; }).length, value: cp.reduce(function (a, x) { return a + x.value; }, 0) };
  var useLpv = STATE.has.lpv && cur.lpv + prev.lpv > 0 && (f === 'vendas' || f === 'trafego' || (f === 'cadastro' && cur.lpv > 0));
  var S = [];
  function st(key, label, c, p, from, bench, extra) { S.push(Object.assign({ key: key, label: label, cur: c, prev: p, from: from, bench: bench || null }, extra || {})); }
  st('impressions', L('Impressões', 'Impresiones'), cur.impressions, prev.impressions, null);
  st('clicks', L('Cliques', 'Clics'), cur.clicks, prev.clicks, 'impressions', f === 'outros' ? null : BENCH.ctr, { rateKey: 'ctr' });
  if (useLpv) st('lpv', L('Visitas à página', 'Visitas a la página'), cur.lpv, prev.lpv, 'clicks', BENCH.lpvRate, { rateKey: 'lpv' });
  var base = useLpv ? 'lpv' : 'clicks';
  if (f === 'vendas') {
    if (STATE.has.cart) st('cart', L('Adições ao carrinho', 'Agregados al carrito'), cur.cart, prev.cart, base, useLpv ? BENCH.cartRate : null, { rateKey: 'cart' });
    if (STATE.has.checkout) st('checkout', L('Checkouts iniciados', 'Pagos iniciados'), cur.checkout, prev.checkout, STATE.has.cart ? 'cart' : base, STATE.has.cart ? BENCH.chkRate : null, { rateKey: 'checkout' });
    st('purchases', L('Compras', 'Compras'), cur.purchases, prev.purchases, STATE.has.checkout ? 'checkout' : (STATE.has.cart ? 'cart' : base), STATE.has.checkout ? BENCH.buyRate : null, { rateKey: 'purchases', final: true, sale: true });
  } else if (f === 'cadastro') {
    st('leads', L('Cadastros (plataforma)', 'Registros (plataforma)'), cur.leads, prev.leads, base, null, { rateKey: 'leads', final: true });
  } else if (f === 'whatsapp') {
    st('conversations', L('Conversas iniciadas', 'Conversaciones iniciadas'), cur.conversations, prev.conversations, base, null, { rateKey: 'conversations', final: true });
  }
  var resKey = RESULT(f);
  if (f === 'cadastro' || f === 'whatsapp') {
    if (crmSrc) st('crm', L('Registros no CRM', 'Registros en el CRM'), crmCur.n, crmPrev.n, resKey, null, { rateKey: 'crm' });
    else st('crm', L('Registros no CRM', 'Registros en el CRM'), null, null, resKey, null, { missing: 'crm' });
    if (crmStatus) {
      st('qual', L('Qualificados', 'Calificados'), crmCur.qual, crmPrev.qual, 'crm', BENCH.qualRate, { rateKey: 'qual' });
      st('sale', L('Vendas', 'Ventas'), crmCur.sale, crmPrev.sale, 'qual', BENCH.saleRate, { rateKey: 'sale', sale: true });
    } else {
      st('qual', L('Qualificados', 'Calificados'), null, null, 'crm', null, { missing: 'qual' });
      st('sale', L('Vendas', 'Ventas'), null, null, 'qual', null, { missing: 'sale' });
    }
  }
  var byKey = {}; S.forEach(function (s) { byKey[s.key] = s; });
  var curRows = filtered(per.from, per.to, ext), prevRows = filtered(per.pFrom, per.pTo, ext);
  // Taxa entre duas etapas só usa linhas de fontes que medem AS DUAS etapas
  // (ex: Google sem "visitas à página" não entra no cálculo clique → visita).
  function pairRate(rows, k, b) {
    var num = 0, den = 0;
    rows.forEach(function (r) { if (r._h[k] && r._h[b]) { num += r[k]; den += r[b]; } });
    return { rate: den > 0 ? num / den : null, base: den };
  }
  var MEDIA_KEYS = { impressions: 1, clicks: 1, lpv: 1, cart: 1, checkout: 1, purchases: 1, leads: 1, conversations: 1 };
  S.forEach(function (s) {
    var b = s.from && byKey[s.from];
    if (b && MEDIA_KEYS[s.key] && MEDIA_KEYS[b.key]) {
      var c = pairRate(curRows, s.key, b.key), p = pairRate(prevRows, s.key, b.key);
      s.rate = c.rate; s.pRate = p.rate; s.base = c.base; s.pBase = p.base;
    } else {
      s.rate = b && ok(s.cur) && b.cur > 0 ? s.cur / b.cur : null;
      s.pRate = b && ok(s.prev) && b.prev > 0 ? s.prev / b.prev : null;
      s.base = b ? b.cur : null; s.pBase = b ? b.prev : null;
    }
  });
  var level = 1;
  if (resKey && cur[resKey] + prev[resKey] > 0) level = 2;
  if (crmSrc && (f === 'cadastro' || f === 'whatsapp')) level = 3;
  if (f === 'vendas' && cur.purchases + prev.purchases > 0) level = 4;
  if (crmStatus && crmCur.sale + crmPrev.sale > 0) level = 4;
  var salesReal = f === 'vendas' ? cur.purchases : (crmStatus ? crmCur.sale : null);
  var revenueReal = f === 'vendas' ? (cur.revenue || null) : (crmStatus && crmCur.value ? crmCur.value : null);
  return { f: f, cur: cur, prev: prev, stages: S, by: byKey, level: level, crmSrc: crmSrc, crmStatus: crmStatus, crmCur: crmCur, crmPrev: crmPrev, resKey: resKey, salesReal: salesReal, revenueReal: revenueReal };
}

/* ============================== RECOMENDAÇÕES POR ETAPA ============================== */
function REC(key) {
  return ({
    ctr: L('Teste ganchos novos nos 3 primeiros segundos, deixe a oferta explícita no primeiro quadro e renove criativos que estão rodando há muito tempo.', 'Probá ganchos nuevos en los primeros 3 segundos, dejá la oferta explícita en el primer cuadro y renová creativos que llevan mucho tiempo activos.'),
    lpv: L('Muitos cliques não viram visita: confira a velocidade da página no celular e se o link leva ao lugar certo.', 'Muchos clics no llegan a la página: revisá la velocidad en el celular y que el enlace lleve al lugar correcto.'),
    cart: L('Quem chega não adiciona ao carrinho: alinhe anúncio e página (mesmo produto e oferta), reveja preço, fotos e prova social.', 'Quien llega no agrega al carrito: alineá anuncio y página (mismo producto y oferta), revisá precio, fotos y prueba social.'),
    checkout: L('Carrinho abandonado costuma ser frete, prazo ou custo surpresa: mostre o frete cedo e simplifique o carrinho.', 'El carrito abandonado suele ser envío, plazo o costo sorpresa: mostrá el envío antes y simplificá el carrito.'),
    purchases: L('Checkout que não fecha: meios de pagamento, parcelamento, erros no formulário e selos de confiança.', 'Pago que no se concreta: medios de pago, cuotas, errores en el formulario y sellos de confianza.'),
    leads: L('Poucos cadastros por clique: reduza campos do formulário e deixe a promessa clara na tela do formulário.', 'Pocos registros por clic: reducí campos del formulario y dejá clara la promesa en la pantalla del formulario.'),
    conversations: L('Cliques que não viram conversa: revise a mensagem pré-preenchida, o botão e o horário de atendimento.', 'Clics que no se convierten en conversación: revisá el mensaje prellenado, el botón y el horario de atención.'),
    crm: L('Cadastros da plataforma que não chegam ao CRM: confira a integração ou a planilha de leads. Lead que não chega ao comercial é verba perdida.', 'Registros que no llegan al CRM: revisá la integración o la planilla de leads. Un lead que no llega a ventas es inversión perdida.'),
    qual: L('Poucos qualificados: ajuste público e mensagem do anúncio para filtrar melhor antes do cadastro.', 'Pocos calificados: ajustá público y mensaje del anuncio para filtrar mejor antes del registro.'),
    sale: L('Qualificados que não compram: tempo de resposta do comercial e follow-up costumam ser os maiores fatores.', 'Calificados que no compran: el tiempo de respuesta de ventas y el seguimiento suelen ser los factores principales.')
  })[key] || '';
}

/* ============================== INSIGHTS ============================== */
function insights(per) {
  var out = [], fs = funnelsPresent();
  fs.forEach(function (f) {
    if (f === 'outros') return;
    var F = buildFunnel(f, per), name = FNAME(f);
    var finalStage = F.stages.filter(function (s) { return s.final; })[0];
    // 1) maior gargalo: etapa cuja taxa abaixo da referência mais custa em resultado final
    var best = null;
    F.stages.forEach(function (s) {
      if (s.rate == null || s.missing || !finalStage) return;
      var minBase = s.key === 'clicks' ? 2000 : 30;
      if ((s.base || 0) < minBase) return;
      var refs = [];
      if (s.pRate != null && (s.pBase || 0) >= minBase) refs.push({ v: s.pRate, src: L('seu período anterior', 'tu período anterior') });
      if (s.bench) refs.push({ v: s.bench[0], src: L('o piso da referência de mercado', 'el piso de referencia del mercado') });
      refs.forEach(function (ref) {
        if (s.rate >= ref.v) return;
        var chainIdx = F.stages.indexOf(s), finIdx = F.stages.indexOf(finalStage);
        if (chainIdx > finIdx) return;
        var gain = (finalStage.cur || 0) * (ref.v / s.rate - 1);
        if (!best || gain > best.gain) best = { s: s, ref: ref, gain: gain };
      });
    });
    if (best && best.gain >= 1) {
      out.push({ t: 'att', f: f, prio: 3,
        title: name + ': ' + L('maior gargalo em ', 'mayor cuello de botella en ') + best.s.label.toLowerCase(),
        body: L('A taxa até esta etapa está em ', 'La tasa hasta esta etapa está en ') + pctf(best.s.rate) + L(', contra ', ', contra ') + pctf(best.ref.v) + L(' em ', ' en ') + best.ref.src + '. ' +
          L('Se voltasse a esse nível, seriam cerca de ', 'Si volviera a ese nivel, serían cerca de ') + count(Math.round(best.gain)) + ' ' + RNAME(f) + L(' a mais no período.', ' más en el período.'),
        act: REC(best.s.rateKey || best.s.key) });
    }
    // 2) variações relevantes etapa a etapa
    F.stages.forEach(function (s) {
      if (s.missing || s.rate == null || s.pRate == null || s === (best && best.s)) return;
      var minBase = s.key === 'clicks' ? 2000 : 30;
      if ((s.base || 0) < minBase || (s.pBase || 0) < minBase) return;
      var d = (s.rate - s.pRate) / s.pRate;
      if (d <= -0.2) out.push({ t: 'att', f: f, prio: 2, title: name + ': ' + L('taxa até ', 'tasa hasta ') + s.label.toLowerCase() + L(' caiu ', ' cayó ') + nf(Math.abs(d) * 100, 0) + '%', body: L('Taxa foi de ', 'La tasa pasó de ') + pctf(s.pRate) + L(' para ', ' a ') + pctf(s.rate) + L(' em relação à etapa anterior.', ' respecto a la etapa anterior.'), act: REC(s.rateKey || s.key) });
      else if (d >= 0.2) out.push({ t: 'pos', f: f, prio: 1, title: name + ': ' + L('taxa até ', 'tasa hasta ') + s.label.toLowerCase() + L(' melhorou ', ' mejoró ') + nf(d * 100, 0) + '%', body: L('Taxa foi de ', 'La tasa pasó de ') + pctf(s.pRate) + L(' para ', ' a ') + pctf(s.rate) + '.' });
    });
    // 3) custo por resultado
    if (F.resKey) {
      var cpr = F.cur[F.resKey] > 0 ? F.cur.spend / F.cur[F.resKey] : null, ppr = F.prev[F.resKey] > 0 ? F.prev.spend / F.prev[F.resKey] : null;
      var dc = deltaTxt(cpr, ppr);
      if (dc && dc.v <= -0.1) out.push({ t: 'pos', f: f, prio: 2, title: name + ': ' + L('custo por ', 'costo por ') + RNAME(f, false) + L(' caiu ', ' bajó ') + nf(Math.abs(dc.v) * 100, 0) + '%', body: money(ppr) + ' → ' + money(cpr) + '.' });
      if (dc && dc.v >= 0.15) out.push({ t: 'att', f: f, prio: 2, title: name + ': ' + L('custo por ', 'costo por ') + RNAME(f, false) + L(' subiu ', ' subió ') + nf(dc.v * 100, 0) + '%', body: money(ppr) + ' → ' + money(cpr) + '. ' + L('Veja no funil qual etapa puxou o custo.', 'Mirá en el embudo qué etapa empujó el costo.') });
    }
    // 4) fadiga: frequência subindo com CTR caindo
    if (F.cur.freq && F.prev.freq && F.cur.ctr && F.prev.ctr && F.cur.impressions > 5000) {
      var df = (F.cur.freq - F.prev.freq) / F.prev.freq, dctr = (F.cur.ctr - F.prev.ctr) / F.prev.ctr;
      if (df > 0.15 && dctr < -0.1) out.push({ t: 'att', f: f, prio: 3, title: name + ': ' + L('sinal de fadiga de criativo', 'señal de fatiga de creativos'), body: L('Frequência subiu ', 'La frecuencia subió ') + nf(df * 100, 0) + L('% e o CTR caiu ', '% y el CTR bajó ') + nf(Math.abs(dctr) * 100, 0) + L('%: o mesmo público está vendo os mesmos anúncios.', '%: el mismo público ve los mismos anuncios.'), act: L('Renove criativos e, se possível, amplie o público.', 'Renová creativos y, si es posible, ampliá el público.') });
    }
    // 5) CPM subindo
    if (F.cur.cpm && F.prev.cpm && F.cur.impressions > 5000) {
      var dm = (F.cur.cpm - F.prev.cpm) / F.prev.cpm;
      if (dm > 0.25) out.push({ t: 'att', f: f, prio: 1, title: name + ': ' + L('CPM subiu ', 'el CPM subió ') + nf(dm * 100, 0) + '%', body: money(F.prev.cpm) + ' → ' + money(F.cur.cpm) + L(' por mil impressões.', ' por mil impresiones.'), act: L('Pode ser concorrência sazonal ou público saturado. Teste públicos mais amplos e reveja sobreposição entre conjuntos.', 'Puede ser competencia estacional o público saturado. Probá públicos más amplios y revisá superposición entre conjuntos.') });
    }
    // 6) dado que falta (didático)
    if ((f === 'cadastro' || f === 'whatsapp') && F.level < 4 && F.cur[F.resKey] > 0) {
      out.push({ t: 'dado', f: f, prio: 2, title: name + ': ' + L('sem saber quais ', 'sin saber qué ') + RNAME(f) + L(' viraram venda', ' se convirtieron en venta'),
        body: count(F.cur[F.resKey]) + ' ' + RNAME(f) + L(' no período. Sem o registro do comercial, não é possível dizer se esta campanha dá lucro — só quanto custa cada contato.', ' en el período. Sin el registro de ventas, no se puede saber si esta campaña da ganancia — solo cuánto cuesta cada contacto.'),
        act: L('Uma planilha simples (data, nome, status) já libera custo por venda e retorno real. Veja a simulação em “Projeção e metas”.', 'Una planilla simple (fecha, nombre, estado) ya habilita costo por venta y retorno real. Mirá la simulación en “Proyección y metas”.') });
    }
  });
  // 7) campanhas com verba e sem resultado
  var per2 = per, byC = {};
  filtered(per2.from, per2.to).forEach(function (r) {
    if (r.funnel === 'outros' || r.funnel === 'trafego') return;
    var k = r.key, c = byC[k] || (byC[k] = { name: r.campaign, f: r.funnel, spend: 0, res: 0 });
    c.spend += r.spend; c.res += r[RESULT(r.funnel)] || 0;
  });
  var zero = Object.keys(byC).map(function (k) { return byC[k]; }).filter(function (c) { return c.spend > 0 && c.res === 0; }).sort(function (a, b) { return b.spend - a.spend; });
  if (zero.length) out.push({ t: 'att', prio: 2, title: L('Campanhas com investimento e sem resultado', 'Campañas con inversión y sin resultado'), body: zero.slice(0, 3).map(function (c) { return esc(c.name) + ' (' + money(c.spend) + ')'; }).join(' · '), act: L('Confira se o evento de conversão está configurado e se a campanha ainda está em aprendizado.', 'Revisá si el evento de conversión está configurado y si la campaña sigue en aprendizaje.') });
  return out.sort(function (a, b) { var o = { att: 0, dado: 1, pos: 2 }; return (o[a.t] - o[b.t]) || (b.prio - a.prio); });
}

/* ============================== CENÁRIOS (dados reais) ============================== */
function quantile(arr, q) { if (!arr.length) return null; var s = arr.slice().sort(function (a, b) { return a - b; }), i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
function scenarioRates(f, per) {
  var resKey = RESULT(f), ext = function (r) { return r.funnel === f; };
  var real = agg(filtered(per.from, per.to, ext));
  var R = { cpm: real.cpm, ctr: real.ctr, c2r: real.clicks > 0 ? real[resKey] / real.clicks : null };
  // semanas completas das últimas 8, para medir a variação real da conta
  var end = per.to, weeks = [];
  for (var w = 0; w < 8; w++) {
    var wt = addDays(end, -7 * w), wf = addDays(wt, -6), s = agg(filtered(wf, wt, ext));
    if (s.clicks >= 30 && s.impressions > 0) weeks.push({ cpm: s.cpm, ctr: s.ctr, c2r: s[resKey] / s.clicks });
  }
  var P, O, method;
  if (weeks.length >= 3) {
    method = L('variação das últimas ', 'variación de las últimas ') + weeks.length + L(' semanas da conta', ' semanas de la cuenta');
    // pessimista nunca melhor que o realista, otimista nunca pior
    P = { cpm: Math.max(quantile(weeks.map(function (x) { return x.cpm; }), 0.75), R.cpm), ctr: Math.min(quantile(weeks.map(function (x) { return x.ctr; }), 0.25), R.ctr), c2r: Math.min(quantile(weeks.map(function (x) { return x.c2r; }), 0.25), R.c2r) };
    O = { cpm: Math.min(quantile(weeks.map(function (x) { return x.cpm; }), 0.25), R.cpm), ctr: Math.max(quantile(weeks.map(function (x) { return x.ctr; }), 0.75), R.ctr), c2r: Math.max(quantile(weeks.map(function (x) { return x.c2r; }), 0.75), R.c2r) };
  } else {
    method = L('±20% sobre o período (pouco histórico para medir variação)', '±20% sobre el período (poco historial para medir variación)');
    P = { cpm: R.cpm * 1.2, ctr: R.ctr * 0.8, c2r: R.c2r * 0.8 };
    O = { cpm: R.cpm * 0.8, ctr: R.ctr * 1.2, c2r: R.c2r * 1.2 };
  }
  return { P: P, R: R, O: O, method: method, real: real };
}
function project(r, sim, saleRate) {
  var net = sim.verba * (1 - sim.imposto / 100);
  var impr = r.cpm > 0 ? net / r.cpm * 1000 : 0, clicks = impr * (r.ctr || 0), res = clicks * (r.c2r || 0);
  var sales = res * saleRate, hasTk = sim.ticket > 0, rev = hasTk ? sales * sim.ticket : null, marg = sim.margem / 100;
  if (!hasTk) return { net: net, impr: impr, clicks: clicks, res: res, sales: sales, rev: null, cpr: res > 0 ? sim.verba / res : null, cac: sales > 0 ? sim.verba / sales : null, roas: null, be: marg > 0 ? 1 / marg : null, profit: null, roi: null };
  return {
    net: net, impr: impr, clicks: clicks, res: res, sales: sales, rev: rev,
    cpr: res > 0 ? sim.verba / res : null, cac: sales > 0 ? sim.verba / sales : null,
    roas: sim.verba > 0 ? rev / sim.verba : null, be: marg > 0 ? 1 / marg : null,
    profit: rev * marg - sim.verba, roi: sim.verba > 0 ? (rev * marg - sim.verba) / sim.verba : null
  };
}
function reverse(r, sim, saleRate) {
  var sales = sim.meta, res = saleRate > 0 ? sales / saleRate : 0, clicks = r.c2r > 0 ? res / r.c2r : 0, impr = r.ctr > 0 ? clicks / r.ctr : 0;
  var net = impr * (r.cpm || 0) / 1000, gross = net / (1 - sim.imposto / 100), rev = sim.ticket > 0 ? sales * sim.ticket : null, marg = sim.margem / 100;
  return { res: res, clicks: clicks, impr: impr, net: net, gross: gross, cac: sales > 0 ? gross / sales : null, roas: gross > 0 && rev != null ? rev / gross : null, be: marg > 0 ? 1 / marg : null, rev: rev };
}

/* ============================== ESTRUTURA ============================== */
var TABS = [
  ['overview', function () { return L('Visão geral', 'Resumen'); }],
  ['funnels', function () { return L('Funis e insights', 'Embudos e insights'); }],
  ['sim', function () { return L('Projeção e metas', 'Proyección y metas'); }],
  ['camp', function () { return L('Campanhas', 'Campañas'); }],
  ['crm', function () { return L('Cadastros (CRM)', 'Registros (CRM)'); }],
  ['pace', function () { return L('Ritmo de verba', 'Ritmo de inversión'); }],
  ['wa', function () { return L('Resumo WhatsApp', 'Resumen WhatsApp'); }],
  ['diag', function () { return L('Diagnóstico', 'Diagnóstico'); }]
];
var CUR_TAB = 'overview';

function shell() {
  ROOT.classList.add('dz');
  var initial = String(D.cliente || 'D').trim().charAt(0).toUpperCase();
  ROOT.innerHTML =
    '<div class="head"><div><div class="brand"><div class="logo">' + esc(initial) + '</div><h1>' + esc(D.cliente || '') + ' · ' + L('Performance de mídia paga', 'Performance de medios pagos') + '</h1></div>' +
    '<small id="dzUpd"></small></div><div class="row">' +
    (LANGS.length > 1 ? '<div class="pills">' + LANGS.map(function (l) { return '<button class="pill' + (l === LANG ? ' on' : '') + '" data-lang="' + l + '">' + l.toUpperCase() + '</button>'; }).join('') + '</div>' : '') +
    '<button class="btn pri" id="dzReload">↻ ' + L('Atualizar dados', 'Actualizar datos') + '</button></div></div>' +
    '<div class="card"><div class="bar"><div class="pills" id="dzPresets">' +
    [['7', '7D'], ['14', '14D'], ['30', '30D'], ['mtd', L('Este mês', 'Este mes')], ['lastmonth', L('Mês passado', 'Mes pasado')], ['custom', L('Personalizado', 'Personalizado')]].map(function (p) { return '<button class="pill" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
    '</div><div class="row"><span id="dzCustom" style="display:none"><input type="date" id="dzFrom"> → <input type="date" id="dzTo"></span>' +
    '<label class="mut" style="font-size:12.5px"><input type="checkbox" id="dzToday"> ' + L('Incluir hoje (em andamento)', 'Incluir hoy (en curso)') + '</label>' +
    '<select id="dzPlat"></select><select id="dzAcct"></select></div></div><div id="dzPer" class="mut" style="font-size:12.5px;margin-top:10px"></div></div>' +
    '<div class="tabs" id="dzTabs">' + TABS.filter(function (t) { return t[0] !== 'crm' || (D.fontes || []).some(function (f) { return (f.tipo || (f.plataforma ? 'midia' : 'crm')) === 'crm'; }); }).map(function (t) { return '<button data-tab="' + t[0] + '">' + t[1]() + '</button>'; }).join('') + '</div>' +
    TABS.map(function (t) { return '<div class="view" id="v-' + t[0] + '"></div>'; }).join('') +
    '<div class="foot">' + L('Motor', 'Motor') + ' v' + VERSION + '</div>';
  bindShell();
}
function bindShell() {
  $('#dzReload').onclick = function () { run(); };
  $$('[data-lang]').forEach(function (b) { b.onclick = function () { LANG = b.dataset.lang; store.set('lang', LANG); shell(); renderAll(); }; });
  $$('#dzPresets .pill').forEach(function (b) {
    b.onclick = function () { STATE.preset = b.dataset.p; store.set('preset', STATE.preset); renderAll(); };
  });
  $('#dzFrom').onchange = $('#dzTo').onchange = function () { STATE.from = $('#dzFrom').value; STATE.to = $('#dzTo').value; if (STATE.from && STATE.to) renderAll(); };
  $('#dzToday').onchange = function () { STATE.incToday = this.checked; renderAll(); };
  $('#dzPlat').onchange = function () { STATE.plat = this.value; STATE.acct = 'all'; renderAll(); };
  $('#dzAcct').onchange = function () { STATE.acct = this.value; renderAll(); };
  $$('#dzTabs button').forEach(function (b) { b.onclick = function () { CUR_TAB = b.dataset.tab; showTab(); }; });
  showTab();
}
function showTab() {
  $$('#dzTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === CUR_TAB); });
  $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'v-' + CUR_TAB); });
  setTimeout(reportHeight, 30);
}

/* ============================== TRAVA ============================== */
function lockThen(cb) {
  if (!D.pin || sessionStorage.getItem('dash_ok_' + CLIENT_KEY) === '1') return cb();
  var box = document.createElement('div');
  box.className = 'lock';
  box.innerHTML = '<div class="box"><h2>🔒 ' + esc(D.cliente || '') + '</h2><p class="mut">' + L('Digite a senha para ver os números.', 'Ingresá la contraseña para ver los números.') + '</p><input type="password" inputmode="numeric" id="dzPin" autocomplete="off"><div class="down" id="dzPinErr" style="display:none;font-size:12.5px">' + L('Senha incorreta.', 'Contraseña incorrecta.') + '</div><button class="btn pri" id="dzPinBtn" style="width:100%;margin-top:8px">' + L('Entrar', 'Entrar') + '</button></div>';
  ROOT.appendChild(box);
  var inp = box.querySelector('#dzPin');
  function go() { if (inp.value === String(D.pin)) { sessionStorage.setItem('dash_ok_' + CLIENT_KEY, '1'); box.remove(); cb(); } else { box.querySelector('#dzPinErr').style.display = 'block'; inp.value = ''; } }
  box.querySelector('#dzPinBtn').onclick = go;
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  setTimeout(function () { inp.focus(); }, 100);
}

/* ============================== COMPONENTES ============================== */
function kpi(name, cur, prev, fmt, betterDown, extra) {
  var d = deltaTxt(cur, prev), cls = '';
  if (d) { var good = betterDown ? d.v < 0 : d.v > 0; cls = Math.abs(d.v) < 0.005 ? '' : (good ? 'up' : 'down'); }
  return '<div class="kpi"><div class="n">' + name + '</div><div class="v">' + fmt(cur) + '</div><div class="c"><span>' + L('antes', 'antes') + ': ' + fmt(prev) + '</span><span class="' + cls + '">' + (d ? d.txt : L('sem comparativo', 'sin comparación')) + '</span></div>' + (extra || '') + '</div>';
}
function legendHTML(per, proj) {
  return '<div class="legend"><span><span class="ll"></span>' + L('período anterior', 'período anterior') + ' <b>' + fmtD(per.pFrom, 1) + ' → ' + fmtD(per.pTo, 1) + '</b></span>' +
    '<span><span class="ll now"></span>' + L('período atual', 'período actual') + ' <b>' + fmtD(per.from, 1) + ' → ' + fmtD(per.to, 1) + '</b></span>' +
    (proj ? '<span><span class="ll proj"></span>' + L('projeção pela média diária até agora', 'proyección por el promedio diario hasta ahora') + '</span>' : '') + '</div>';
}
function insightHTML(i) {
  return '<div class="ins ' + i.t + '"><b>' + (i.t === 'att' ? '⚠ ' : i.t === 'pos' ? '✓ ' : '◐ ') + esc(i.title) + '</b><div>' + i.body + '</div>' + (i.act ? '<div class="act">→ ' + esc(i.act) + '</div>' : '') + '</div>';
}

/* ============================== GRÁFICO ============================== */
function svgEl(tag, attrs) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
function niceMax(v) { if (!(v > 0)) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function drawChart(el, o) {
  el.innerHTML = '';
  if (!o.now.length) { el.innerHTML = '<div class="empty">' + L('Sem dados no período.', 'Sin datos en el período.') + '</div>'; return; }
  var W = 1100, H = 300, Lm = 70, R = 14, T = 14, B = 32, PW = W - Lm - R, PH = H - T - B;
  var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }); el.appendChild(svg);
  var vals = o.now.concat(o.prev, o.proj || []).filter(function (v) { return ok(v); });
  var max = niceMax(Math.max.apply(null, vals.length ? vals : [1]) * 1.08);
  for (var i = 0; i <= 4; i++) {
    var val = max * i / 4, y = T + PH - (val / max) * PH;
    svg.appendChild(svgEl('line', { class: 'grid-l', x1: Lm, y1: y, x2: W - R, y2: y }));
    var tx = svgEl('text', { class: 'axis', x: Lm - 8, y: y + 4, 'text-anchor': 'end' }); tx.textContent = o.fmtAxis(val); svg.appendChild(tx);
  }
  var n = o.labels.length, X = function (i) { return n <= 1 ? Lm + PW / 2 : Lm + PW * i / (n - 1); }, Y = function (v) { return T + PH - (v / max) * PH; };
  o.labels.forEach(function (l, i) { if (i % Math.ceil(n / 9) !== 0 && i !== n - 1) return; var t = svgEl('text', { class: 'axis', x: X(i), y: H - 10, 'text-anchor': 'middle' }); t.textContent = l; svg.appendChild(t); });
  function path(s) { var d = '', on = false; s.forEach(function (v, i) { if (!ok(v)) { on = false; return; } d += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; on = true; }); return d; }
  svg.appendChild(svgEl('path', { d: path(o.prev), fill: 'none', stroke: '#6c6c76', 'stroke-width': 2, 'stroke-dasharray': '5 5' }));
  if (o.proj) svg.appendChild(svgEl('path', { d: path(o.proj), fill: 'none', stroke: AC, 'stroke-width': 2, 'stroke-dasharray': '2 5', opacity: 0.85 }));
  svg.appendChild(svgEl('path', { d: path(o.now), fill: 'none', stroke: AC, 'stroke-width': 2.5 }));
  var tip = svgEl('g', { style: 'visibility:hidden;pointer-events:none' }), bg = svgEl('rect', { class: 'tipbg', rx: 6, ry: 6 }), t1 = svgEl('text', { class: 'tiptx', 'font-weight': 600 }), t2 = svgEl('text', { class: 'tiptx' });
  tip.appendChild(bg); tip.appendChild(t1); tip.appendChild(t2);
  function show(x, y, a, b) {
    t1.textContent = a; t2.textContent = b; tip.style.visibility = 'visible';
    var w = Math.max(t1.getComputedTextLength ? t1.getComputedTextLength() : a.length * 7, t2.getComputedTextLength ? t2.getComputedTextLength() : b.length * 7) + 20, h = 42;
    var tx = Math.min(Math.max(x - w / 2, Lm), W - R - w), ty = y - h - 10 < T ? y + 12 : y - h - 10;
    bg.setAttribute('x', tx); bg.setAttribute('y', ty); bg.setAttribute('width', w); bg.setAttribute('height', h);
    t1.setAttribute('x', tx + 10); t1.setAttribute('y', ty + 17); t2.setAttribute('x', tx + 10); t2.setAttribute('y', ty + 33);
  }
  function hide() { tip.style.visibility = 'hidden'; }
  [['prev', o.prev, o.prevLabels, '#8a8a94', L('anterior', 'anterior')], ['now', o.now, o.labels, AC, L('atual', 'actual')], ['proj', o.proj || [], o.labels, AC, L('projeção', 'proyección')]].forEach(function (set) {
    set[1].forEach(function (v, i) {
      if (!ok(v)) return;
      if (set[0] === 'proj' && ok(o.now[i])) return;
      var c = svgEl('circle', { cx: X(i), cy: Y(v), r: set[0] === 'proj' ? 2.5 : 3.5, fill: set[3], style: 'cursor:pointer' });
      var lab = (set[2][i] || '') + ' · ' + set[4];
      c.addEventListener('mouseenter', function () { show(X(i), Y(v), lab, o.fmt(v)); });
      c.addEventListener('mouseleave', hide);
      c.addEventListener('touchstart', function (ev) { ev.preventDefault(); show(X(i), Y(v), lab, o.fmt(v)); }, { passive: false });
      svg.appendChild(c);
    });
  });
  svg.appendChild(tip);
}
function chartMetrics() {
  var list = [
    { k: 'spend', n: L('Investimento', 'Inversión'), get: function (s) { return s.spend; }, fmt: money, add: true },
    { k: 'clicks', n: L('Cliques', 'Clics'), get: function (s) { return s.clicks; }, fmt: count, add: true },
    { k: 'ctr', n: 'CTR', get: function (s) { return s.ctr; }, fmt: function (v) { return pctf(v); }, ratio: function (s) { return s.ctr; } },
    { k: 'cpm', n: 'CPM', get: function (s) { return s.cpm; }, fmt: money, ratio: function (s) { return s.cpm; } }
  ];
  funnelsPresent().forEach(function (f) {
    var rk = RESULT(f); if (!rk || f === 'trafego') return;
    list.push({ k: 'res_' + f, n: RNAME(f).charAt(0).toUpperCase() + RNAME(f).slice(1), get: function (s) { return s[rk]; }, fmt: count, add: true, f: f });
    list.push({ k: 'cpr_' + f, n: L('Custo por ', 'Costo por ') + RNAME(f, false), get: function (s) { return s[rk] > 0 ? s.spend / s[rk] : null; }, fmt: money, f: f, ratio: function (s) { return s[rk] > 0 ? s.spend / s[rk] : null; } });
  });
  if (STATE.has.revenue && funnelsPresent().indexOf('vendas') > -1) list.push({ k: 'roas', n: 'ROAS', get: function (s) { return s.roas; }, fmt: xf, f: 'vendas', ratio: function (s) { return s.roas; } });
  return list;
}
function renderChart(host, per) {
  var ms = chartMetrics(), m = ms.filter(function (x) { return x.k === STATE.chartMetric; })[0] || ms[0];
  STATE.chartMetric = m.k;
  var ext = m.f ? function (r) { return r.funnel === m.f; } : null;
  var a = daySeries(per.from, per.to, ext), b = daySeries(per.pFrom, per.pTo, ext);
  var labels = a.map(function (x) { return fmtD(x.date); }), now = a.map(function (x) { return m.get(x.s); });
  var prev = a.map(function (_, i) { return b[i] ? m.get(b[i].s) : null; }), prevLabels = a.map(function (_, i) { return b[i] ? fmtD(b[i].date) : ''; });
  // mês cheio anterior pode ser mais longo que o período atual: mostra os dias restantes do anterior também
  for (var i = a.length; i < b.length; i++) { prev.push(m.get(b[i].s)); prevLabels.push(fmtD(b[i].date)); labels.push(''); now.push(null); }
  var proj = null;
  if (per.isMtd && per.to < monthEnd(per.from)) {
    var tot = agg(filtered(per.from, per.to, ext)), avg = m.add ? m.get(tot) / per.len : (m.ratio ? m.ratio(tot) : null);
    var extra = [], d = addDays(per.to, 1), me = monthEnd(per.from);
    while (d <= me) { extra.push(fmtD(d)); d = addDays(d, 1); }
    var realN = a.length;
    for (var j = 0; j < extra.length; j++) { var idx = realN + j; if (idx < labels.length) labels[idx] = extra[j]; else { labels.push(extra[j]); now.push(null); prev.push(null); prevLabels.push(''); } }
    proj = labels.map(function (_, i) { return i >= realN - 1 && ok(avg) ? avg : null; });
    if (ok(now[realN - 1])) proj[realN - 1] = now[realN - 1];
  }
  host.innerHTML = '<div class="pills" style="margin-bottom:10px">' + ms.map(function (x) { return '<button class="pill' + (x.k === m.k ? ' on' : '') + '" data-m="' + x.k + '">' + x.n + '</button>'; }).join('') + '</div>' + legendHTML(per, !!proj) + '<div class="chart"></div>';
  $$('[data-m]', host).forEach(function (b) { b.onclick = function () { STATE.chartMetric = b.dataset.m; renderChart(host, per); }; });
  drawChart($('.chart', host), { labels: labels, prevLabels: prevLabels, now: now, prev: prev, proj: proj, fmt: m.fmt, fmtAxis: m.fmt === money ? moneyShort : m.fmt });
}

/* ============================== VISÃO GERAL ============================== */
function renderOverview(per) {
  var v = $('#v-overview'), cur = agg(filtered(per.from, per.to)), prev = agg(filtered(per.pFrom, per.pTo)), fs = funnelsPresent();
  var html = '';
  if (per.isMtd) html += '<div class="note">' + L('“Este mês” é comparado com o mês anterior completo. Resultados de cadastros e conversas dos últimos dias ainda podem amadurecer.', '“Este mes” se compara con el mes anterior completo. Los resultados de los últimos días todavía pueden madurar.') + '</div>';
  html += '<div class="card"><h2>' + L('Mídia', 'Medios') + '</h2><p class="mut">' + L('Tudo o que foi investido no período, somando plataformas e contas do filtro.', 'Todo lo invertido en el período, sumando plataformas y cuentas del filtro.') + '</p><div class="grid">' +
    kpi(L('Investimento', 'Inversión'), cur.spend, prev.spend, money) + kpi(L('Impressões', 'Impresiones'), cur.impressions, prev.impressions, count) +
    kpi(L('Cliques', 'Clics'), cur.clicks, prev.clicks, count) + kpi('CTR', cur.ctr, prev.ctr, pctf) + kpi('CPC', cur.cpc, prev.cpc, money, true) + kpi('CPM', cur.cpm, prev.cpm, money, true) + '</div></div>';
  fs.forEach(function (f) {
    if (f === 'outros') return;
    var F = buildFunnel(f, per), rk = F.resKey, c = F.cur, p = F.prev;
    var cpr = c[rk] > 0 ? c.spend / c[rk] : null, ppr = p[rk] > 0 ? p.spend / p[rk] : null;
    html += '<div class="card hl"><div class="bar"><h2>' + FNAME(f) + '</h2><span class="tag ac">' + L('nível de dados ', 'nivel de datos ') + F.level + '/4</span></div><p class="mut">' + L('Só as campanhas com este objetivo — o custo por resultado usa apenas a verba delas.', 'Solo las campañas con este objetivo — el costo por resultado usa solo su inversión.') + '</p><div class="grid">' +
      kpi(L('Investimento', 'Inversión'), c.spend, p.spend, money) +
      kpi(RNAME(f).charAt(0).toUpperCase() + RNAME(f).slice(1), c[rk], p[rk], count) +
      kpi(L('Custo por ', 'Costo por ') + RNAME(f, false), cpr, ppr, money, true);
    if (f === 'vendas' && STATE.has.revenue) html += kpi(L('Receita', 'Ingresos'), c.revenue, p.revenue, money) + kpi('ROAS', c.roas, p.roas, xf);
    if ((f === 'cadastro' || f === 'whatsapp') && F.crmSrc) html += kpi(L('Registros no CRM', 'Registros en el CRM'), F.crmCur.n, F.crmPrev.n, count);
    if (F.crmStatus) html += kpi(L('Vendas (CRM)', 'Ventas (CRM)'), F.crmCur.sale, F.crmPrev.sale, count) + kpi(L('Custo por venda', 'Costo por venta'), F.crmCur.sale ? c.spend / F.crmCur.sale : null, F.crmPrev.sale ? p.spend / F.crmPrev.sale : null, money, true);
    html += '</div></div>';
  });
  var ins = insights(per).slice(0, 4);
  html += '<div class="card"><div class="bar"><h2>' + L('Destaques do período', 'Destacados del período') + '</h2><button class="btn" id="dzGoFun">' + L('Ver funis e todos os insights →', 'Ver embudos y todos los insights →') + '</button></div><div style="margin-top:10px">' +
    (ins.length ? ins.map(insightHTML).join('') : '<div class="empty">' + L('Sem variações relevantes no período.', 'Sin variaciones relevantes en el período.') + '</div>') + '</div></div>';
  html += '<div class="card"><h2>' + L('Evolução diária', 'Evolución diaria') + '</h2><div id="dzChart"></div></div>';
  v.innerHTML = html;
  $('#dzGoFun').onclick = function () { CUR_TAB = 'funnels'; showTab(); };
  renderChart($('#dzChart'), per);
}

/* ============================== FUNIS E INSIGHTS ============================== */
var LEVELS = function () { return [L('Mídia', 'Medios'), L('Resultado na plataforma', 'Resultado en la plataforma'), L('Registro no CRM', 'Registro en el CRM'), L('Venda registrada', 'Venta registrada')]; };
function missingText(key, f) {
  return ({
    crm: L('Os cadastros da plataforma não são conferidos com uma lista própria. Conectar a planilha de leads mostra quantos realmente chegaram ao comercial.', 'Los registros no se comparan con una lista propia. Conectar la planilla de leads muestra cuántos llegaron realmente a ventas.'),
    qual: L('Sem uma coluna de status (ex: “qualificado”, “visita agendada”), não dá para saber quantos contatos eram bons. Isso separa problema de público de problema de atendimento.', 'Sin una columna de estado (ej: “calificado”, “visita agendada”), no se sabe cuántos contactos eran buenos. Eso separa problema de público de problema de atención.'),
    sale: L('Sem o registro de vendas, não existe custo por venda nem retorno sobre o investimento — só custo por contato. É o dado que mais muda decisões de verba.', 'Sin el registro de ventas no hay costo por venta ni retorno de la inversión — solo costo por contacto. Es el dato que más cambia las decisiones de inversión.')
  })[key] || '';
}
function renderFunnels(per) {
  var v = $('#v-funnels'), fs = funnelsPresent().filter(function (f) { return f !== 'outros'; }), html = '';
  var ins = insights(per);
  html += '<div class="card"><h2>' + L('Insights', 'Insights') + '</h2><p class="mut">' + L('Gerados por regras a partir dos números: apontam onde está a perda e hipóteses de ação, não certezas.', 'Generados por reglas a partir de los números: señalan dónde está la pérdida e hipótesis de acción, no certezas.') + '</p>' +
    (ins.length ? ins.map(insightHTML).join('') : '<div class="empty">' + L('Sem pontos de atenção no período.', 'Sin puntos de atención en el período.') + '</div>') + '</div>';
  if (!fs.length) html += '<div class="card empty">' + L('Nenhuma campanha com objetivo de conversão no filtro atual.', 'Ninguna campaña con objetivo de conversión en el filtro actual.') + '</div>';
  fs.forEach(function (f) {
    var F = buildFunnel(f, per);
    html += '<div class="card hl"><div class="bar"><h2>' + FNAME(f) + '</h2><span class="mut" style="font-size:12px">' + L('Investimento', 'Inversión') + ': <b style="color:var(--tx)">' + money(F.cur.spend) + '</b></span></div>';
    html += '<div class="ladder">' + LEVELS().map(function (l, i) { return '<div class="step' + (F.level > i ? ' done' : '') + '">' + (i + 1) + '. ' + l + '</div>'; }).join('') + '</div>';
    if (F.level < 4) html += '<p class="mut" style="font-size:12.5px">' + (F.level < 3 ? L('Próximo degrau: conectar a lista de contatos do comercial (CRM ou planilha).', 'Próximo paso: conectar la lista de contactos de ventas (CRM o planilla).') : L('Próximo degrau: registrar o status de cada contato até a venda.', 'Próximo paso: registrar el estado de cada contacto hasta la venta.')) + '</p>';
    html += '<div class="stage" style="background:transparent;border:0;padding:4px 12px"><span class="sub">' + L('Etapa', 'Etapa') + '</span><span class="sub">' + L('Anterior', 'Anterior') + '</span><span class="sub">' + L('Atual', 'Actual') + '</span><span class="sub">' + L('Taxa atual', 'Tasa actual') + '</span><span class="sub">' + L('Referência', 'Referencia') + '</span></div>';
    F.stages.forEach(function (s) {
      if (s.missing) { html += '<div class="stage miss"><div><div class="lab">○ ' + s.label + ' · <span class="tag hip">' + L('sem dado', 'sin dato') + '</span></div><div class="sub" style="margin-top:4px">' + missingText(s.missing, f) + '</div></div></div>'; return; }
      var d = deltaTxt(s.cur, s.prev), rs = s.rate != null ? pctf(s.rate) : '—', rp = s.pRate != null ? pctf(s.pRate) : '—';
      var bc = '';
      if (s.bench && s.rate != null) bc = s.rate < s.bench[0] ? 'down' : (s.rate > s.bench[1] ? 'up' : '');
      html += '<div class="stage"><div><div class="lab">' + s.label + '</div>' + (d ? '<div class="sub ' + (d.v >= 0 ? 'up' : 'down') + '">' + d.txt + '</div>' : '') + '</div><div class="mut">' + count(s.prev) + '</div><div>' + count(s.cur) + '</div><div>' + rs + '<div class="sub">' + L('antes', 'antes') + ' ' + rp + '</div></div><div class="' + bc + '">' + (s.bench ? pctf(s.bench[0], 0) + '–' + pctf(s.bench[1], 0) : '—') + '</div></div>';
    });
    html += '</div>';
  });
  v.innerHTML = html;
}

/* ============================== PROJEÇÃO E METAS ============================== */
function simDefaults(per) {
  var fs = funnelsPresent().filter(function (f) { return f === 'vendas' || f === 'cadastro' || f === 'whatsapp'; });
  var f0 = fs[0] || 'vendas', F = fs.length ? buildFunnel(f0, per) : null;
  var last30 = agg(filtered(addDays(per.to, -29), per.to));
  var tk = F && F.f === 'vendas' && F.cur.purchases > 0 && F.cur.revenue > 0 ? Math.round(F.cur.revenue / F.cur.purchases) : 0;
  return { funil: f0, verba: Math.round(last30.spend) || 1000, imposto: CUR === 'BRL' ? 12.15 : 0, ticket: tk, margem: 30, meta: 20, hipCad: 4, hipWa: 5 };
}
function renderSim(per) {
  var v = $('#v-sim'), fs = funnelsPresent().filter(function (f) { return f === 'vendas' || f === 'cadastro' || f === 'whatsapp'; });
  if (!fs.length) { v.innerHTML = '<div class="card empty">' + L('Nenhum funil de conversão no filtro atual para projetar.', 'Ningún embudo de conversión en el filtro actual para proyectar.') + '</div>'; return; }
  var sim = Object.assign(simDefaults(per), store.get('sim', {}));
  if (fs.indexOf(sim.funil) < 0) sim.funil = fs[0];
  var F = buildFunnel(sim.funil, per), SR = scenarioRates(sim.funil, per);
  var saleRate, saleReal = false;
  if (sim.funil === 'vendas') { saleRate = 1; saleReal = true; }
  else if (F.crmStatus && F.cur[F.resKey] > 0 && F.crmCur.sale > 0) { saleRate = F.crmCur.sale / F.cur[F.resKey]; saleReal = true; }
  else saleRate = (sim.funil === 'cadastro' ? sim.hipCad : sim.hipWa) / 100;
  var tkReal = sim.funil === 'vendas' && F.cur.purchases > 0 && F.cur.revenue > 0 ? F.cur.revenue / F.cur.purchases : null;
  var rn = RNAME(sim.funil), rn1 = RNAME(sim.funil, false);
  function inp(id, label, val, step, hint) { return '<div><label>' + label + '<input type="number" step="' + (step || 'any') + '" data-s="' + id + '" value="' + (val == null ? '' : val) + '"></label>' + (hint ? '<small>' + hint + '</small>' : '') + '</div>'; }
  var html = '<div class="card"><h2>' + L('Premissas do negócio', 'Supuestos del negocio') + '</h2><p class="mut">' + L('Preencha com os números do seu negócio. Eles ficam salvos só neste navegador e não alteram os dados das campanhas.', 'Completá con los números de tu negocio. Quedan guardados solo en este navegador y no cambian los datos de las campañas.') + '</p><div class="form">' +
    '<div><label>' + L('Funil base da projeção', 'Embudo base de la proyección') + '<select data-s="funil">' + fs.map(function (f) { return '<option value="' + f + '"' + (f === sim.funil ? ' selected' : '') + '>' + FNAME(f) + '</option>'; }).join('') + '</select></label></div>' +
    inp('verba', L('Verba mensal', 'Inversión mensual') + ' (' + CUR + ')', sim.verba, 1) +
    inp('imposto', L('Imposto sobre a mídia (%)', 'Impuesto sobre medios (%)'), sim.imposto, 0.01, L('Meta no Brasil ≈ 12,15%. Google não cobra.', 'Varía por país y plataforma.')) +
    inp('ticket', L('Ticket médio', 'Ticket promedio') + ' (' + CUR + ')', sim.ticket, 1, tkReal ? L('Ticket real no período: ', 'Ticket real en el período: ') + money(tkReal) : '') +
    inp('margem', L('Margem de contribuição (%)', 'Margen de contribución (%)'), sim.margem, 0.1, L('Quanto sobra de cada venda depois do custo do produto, impostos e taxas.', 'Cuánto queda de cada venta después del costo del producto, impuestos y comisiones.')) +
    inp('meta', L('Meta de vendas no mês', 'Meta de ventas del mes'), sim.meta, 1);
  if (!saleReal) html += inp(sim.funil === 'cadastro' ? 'hipCad' : 'hipWa', L('Hipótese: % de ', 'Hipótesis: % de ') + rn + L(' que vira venda', ' que se convierte en venta'), sim.funil === 'cadastro' ? sim.hipCad : sim.hipWa, 0.1, L('Sem dado do comercial. Ajuste para simular.', 'Sin dato de ventas. Ajustá para simular.'));
  html += '</div></div>';
  if (!saleReal) html += '<div class="note"><b>' + L('Esta projeção usa uma hipótese.', 'Esta proyección usa una hipótesis.') + '</b> ' + L('As etapas até “', 'Las etapas hasta “') + rn + L('” são dados reais das campanhas. Daí até a venda, o número é o que você digitou acima. Com o registro das vendas (uma planilha com data, nome e status já basta), este quadro passa a usar a taxa real — e o ROAS e o lucro deixam de ser estimativa.', '” son datos reales de las campañas. De ahí a la venta, el número es el que ingresaste arriba. Con el registro de ventas (una planilla con fecha, nombre y estado alcanza), este cuadro usa la tasa real — y el ROAS y la ganancia dejan de ser estimación.') + '</div>';
  if (!(sim.ticket > 0)) html += '<div class="note">' + L('Informe o ticket médio para ver faturamento, ROAS, lucro e ROI.', 'Informá el ticket promedio para ver facturación, ROAS, ganancia y ROI.') + '</div>';
  var P = project(SR.P, sim, saleRate), R = project(SR.R, sim, saleRate), O = project(SR.O, sim, saleRate);
  var chip = function (real) { return '<span class="tag ' + (real ? 'real' : 'hip') + '">' + (real ? L('real', 'real') : L('hipótese', 'hipótesis')) + '</span>'; };
  function row(label, a, b, c, fmt, tag) { return '<tr><td>' + label + (tag || '') + '</td><td>' + fmt(a) + '</td><td>' + fmt(b) + '</td><td>' + fmt(c) + '</td></tr>'; }
  html += '<div class="card"><h2>' + L('Projeção do mês com a verba informada', 'Proyección del mes con la inversión informada') + '</h2><p class="mut">' + L('Realista = taxas reais do período selecionado. Pessimista e otimista = ', 'Realista = tasas reales del período seleccionado. Pesimista y optimista = ') + SR.method + '.</p><div class="tw"><table><thead><tr><th></th><th>' + L('Pessimista', 'Pesimista') + '</th><th>' + L('Realista', 'Realista') + '</th><th>' + L('Otimista', 'Optimista') + '</th></tr></thead><tbody>' +
    row('CPM', SR.P.cpm, SR.R.cpm, SR.O.cpm, money, chip(true)) + row('CTR', SR.P.ctr, SR.R.ctr, SR.O.ctr, pctf, chip(true)) +
    row(L('Clique → ', 'Clic → ') + rn1, SR.P.c2r, SR.R.c2r, SR.O.c2r, pctf, chip(true)) +
    row(L('Mídia líquida', 'Medios netos'), P.net, R.net, O.net, money) + row(L('Impressões', 'Impresiones'), P.impr, R.impr, O.impr, count) + row(L('Cliques', 'Clics'), P.clicks, R.clicks, O.clicks, count) +
    row(rn.charAt(0).toUpperCase() + rn.slice(1), P.res, R.res, O.res, count) + row(L('Custo por ', 'Costo por ') + rn1, P.cpr, R.cpr, O.cpr, money) +
    (sim.funil !== 'vendas' ? row(rn.charAt(0).toUpperCase() + rn.slice(1) + L(' → venda', ' → venta'), saleRate, saleRate, saleRate, pctf, chip(saleReal)) : '') +
    row(L('Vendas', 'Ventas'), P.sales, R.sales, O.sales, count, chip(saleReal)) + row(L('Faturamento', 'Facturación'), P.rev, R.rev, O.rev, money) +
    row(L('CAC (custo por venda)', 'CAC (costo por venta)'), P.cac, R.cac, O.cac, money) + row('ROAS', P.roas, R.roas, O.roas, xf) +
    row(L('ROAS de equilíbrio', 'ROAS de equilibrio'), P.be, R.be, O.be, xf) + row(L('Lucro líquido', 'Ganancia neta'), P.profit, R.profit, O.profit, money) +
    row('ROI', P.roi, R.roi, O.roi, function (x) { return pctf(x, 0); }) + '</tbody></table></div>' +
    '<p class="mut" style="margin-top:10px;font-size:12.5px">' + L('ROAS de equilíbrio = 1 ÷ margem. Abaixo dele, a mídia não se paga.', 'ROAS de equilibrio = 1 ÷ margen. Por debajo, la inversión no se paga.') + '</p></div>';
  var RV = reverse(SR.R, sim, saleRate), okRoas = RV.roas != null && RV.be != null && RV.roas >= RV.be;
  html += '<div class="card"><h2>' + L('Da meta para a verba', 'De la meta a la inversión') + '</h2><p class="mut">' + L('Quanto precisaria investir para bater ', 'Cuánto habría que invertir para alcanzar ') + count(sim.meta) + L(' vendas no mês, com as taxas realistas.', ' ventas en el mes, con las tasas realistas.') + '</p><div class="grid">' +
    kpiSimple(rn.charAt(0).toUpperCase() + rn.slice(1) + L(' para a meta', ' para la meta'), count(RV.res)) + kpiSimple(L('Cliques necessários', 'Clics necesarios'), count(RV.clicks)) +
    kpiSimple(L('Verba necessária', 'Inversión necesaria'), money(RV.gross)) + kpiSimple('CAC', money(RV.cac)) +
    kpiSimple('ROAS', xf(RV.roas), RV.roas == null ? '' : okRoas ? 'up' : 'down', RV.roas == null ? L('informe o ticket', 'informá el ticket') : okRoas ? L('acima do equilíbrio', 'por encima del equilibrio') : L('abaixo do equilíbrio', 'por debajo del equilibrio')) + '</div></div>';
  var ms = monthStart(per.to), me = monthEnd(ms), end = STATE.incToday ? todayISO() : addDays(todayISO(), -1);
  if (end >= ms) {
    var mtd = buildFunnel(sim.funil, { from: ms, to: end, pFrom: ms, pTo: end });
    var days = daysBetween(ms, end) + 1, left = daysBetween(end, me);
    var done = sim.funil === 'vendas' ? mtd.cur.purchases : (saleReal && mtd.crmStatus ? mtd.crmCur.sale : mtd.cur[mtd.resKey] * saleRate);
    var pace = done / days, proj = done + pace * left, need = left > 0 ? Math.max(sim.meta - done, 0) / left : 0;
    html += '<div class="card"><h2>' + L('Ritmo da meta neste mês', 'Ritmo de la meta este mes') + ' ' + chip(saleReal) + '</h2><div class="grid">' +
      kpiSimple(L('Vendas até agora', 'Ventas hasta ahora'), count(done)) + kpiSimple(L('Meta', 'Meta'), count(sim.meta)) +
      kpiSimple(L('Ritmo atual por dia', 'Ritmo actual por día'), nf(pace, 1)) + kpiSimple(L('Necessário por dia', 'Necesario por día'), nf(need, 1), need > pace ? 'down' : 'up') +
      kpiSimple(L('Projeção de fechamento', 'Proyección de cierre'), count(Math.round(proj)), proj >= sim.meta ? 'up' : 'down', proj >= sim.meta ? L('bate a meta', 'alcanza la meta') : L('abaixo da meta', 'debajo de la meta')) + '</div></div>';
  }
  v.innerHTML = html;
  $$('[data-s]', v).forEach(function (el) {
    el.onchange = function () {
      var s = store.get('sim', {}); s[el.dataset.s] = el.tagName === 'SELECT' ? el.value : parseFloat(el.value) || 0; store.set('sim', s); renderSim(resolvePeriod());
    };
  });
}
function kpiSimple(n, v, cls, sub) { return '<div class="kpi"><div class="n">' + n + '</div><div class="v ' + (cls || '') + '">' + v + '</div>' + (sub ? '<div class="c"><span class="' + (cls || '') + '">' + sub + '</span></div>' : '') + '</div>'; }

/* ============================== CAMPANHAS ============================== */
function renderCamp(per) {
  var v = $('#v-camp');
  function byCamp(rows) { var m = {}; rows.forEach(function (r) { var c = m[r.key] || (m[r.key] = { key: r.key, name: r.campaign, acct: r.account, plat: r.platform, f: r.funnel, spend: 0, res: 0, rev: 0 }); c.spend += r.spend; var rk = RESULT(r.funnel); c.res += rk ? r[rk] : 0; c.rev += r.revenue; }); return m; }
  var now = byCamp(filtered(per.from, per.to)), prev = byCamp(filtered(per.pFrom, per.pTo)), keys = {};
  Object.keys(now).concat(Object.keys(prev)).forEach(function (k) { keys[k] = 1; });
  var rows = Object.keys(keys).map(function (k) {
    var n = now[k] || { spend: 0, res: 0, rev: 0 }, p = prev[k] || { spend: 0, res: 0, rev: 0 }, b = now[k] || prev[k];
    return { name: b.name, acct: b.acct, plat: b.plat, f: b.f, spendPrev: p.spend, spendNow: n.spend, resPrev: p.res, resNow: n.res, cprPrev: p.res ? p.spend / p.res : null, cprNow: n.res ? n.spend / n.res : null, roasNow: n.spend && n.rev ? n.rev / n.spend : null, isNew: !prev[k], ended: !now[k], why: (STATE.camp[k] || {}).why };
  });
  var c = STATE.sort.col, d = STATE.sort.dir;
  rows.sort(function (a, b) { var x = a[c], y = b[c]; if (typeof x === 'string') return x.localeCompare(y) * d; x = ok(x) ? x : -Infinity; y = ok(y) ? y : -Infinity; return (x - y) * d; });
  var hasRev = STATE.has.revenue;
  var html = '<div class="card"><h2>' + L('Campanhas', 'Campañas') + '</h2><p class="mut">' + L('Cada campanha é classificada pelo objetivo (passe o mouse no rótulo para ver o critério). O resultado e o custo por resultado seguem esse objetivo.', 'Cada campaña se clasifica por objetivo (pasá el mouse sobre la etiqueta para ver el criterio). El resultado y el costo por resultado siguen ese objetivo.') + '</p>' + legendHTML(per) +
    '<div class="tw"><table><thead><tr><th data-col="name">' + L('Campanha', 'Campaña') + '</th><th class="prev" data-col="spendPrev">' + L('Invest. ant.', 'Inv. ant.') + '</th><th data-col="spendNow">' + L('Invest. atual', 'Inv. actual') + '</th><th class="prev" data-col="resPrev">' + L('Result. ant.', 'Result. ant.') + '</th><th data-col="resNow">' + L('Result. atual', 'Result. actual') + '</th><th class="prev" data-col="cprPrev">' + L('Custo/res. ant.', 'Costo/res. ant.') + '</th><th data-col="cprNow">' + L('Custo/res. atual', 'Costo/res. actual') + '</th>' + (hasRev ? '<th data-col="roasNow">ROAS</th>' : '') + '</tr></thead><tbody>' +
    (rows.length ? rows.map(function (r) {
      var rn = RESULT(r.f) ? ' <small class="mut">' + RNAME(r.f) + '</small>' : '';
      return '<tr><td><span class="tag">' + (r.plat === 'google' ? 'Google' : 'Meta') + ' · ' + esc(r.acct) + '</span><span class="tag ac" title="' + esc(L('Critério: ', 'Criterio: ') + (r.why || '')) + '">' + FNAME(r.f) + '</span>' + (r.isNew ? '<span class="tag real">' + L('nova', 'nueva') + '</span>' : '') + (r.ended ? '<span class="tag">' + L('só anterior', 'solo anterior') + '</span>' : '') + '<div>' + esc(r.name) + '</div></td>' +
        '<td class="prev">' + money(r.spendPrev) + '</td><td>' + money(r.spendNow) + '</td><td class="prev">' + (RESULT(r.f) ? count(r.resPrev) : '—') + '</td><td>' + (RESULT(r.f) ? count(r.resNow) + rn : '—') + '</td><td class="prev">' + money(r.cprPrev) + '</td><td>' + money(r.cprNow) + '</td>' + (hasRev ? '<td>' + xf(r.roasNow) + '</td>' : '') + '</tr>';
    }).join('') : '<tr><td colspan="8" class="empty">' + L('Sem campanhas no período.', 'Sin campañas en el período.') + '</td></tr>') + '</tbody></table></div></div>';
  if (STATE.gconv.length) {
    var gm = {};
    STATE.gconv.filter(function (g) { return inRange(g.date, per.from, per.to); }).forEach(function (g) { var a = gm[g.action] || (gm[g.action] = { conv: 0, value: 0 }); a.conv += g.conv; a.value += g.value; });
    var gl = Object.keys(gm).map(function (k) { return [k, gm[k]]; }).sort(function (a, b) { return b[1].conv - a[1].conv; });
    html += '<div class="card"><h2>' + L('Google Ads · conversões por tipo', 'Google Ads · conversiones por tipo') + '</h2><div class="tw"><table><thead><tr><th>' + L('Ação de conversão', 'Acción de conversión') + '</th><th>' + L('Conversões', 'Conversiones') + '</th><th>' + L('Valor', 'Valor') + '</th></tr></thead><tbody>' +
      (gl.length ? gl.map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td>' + nf(x[1].conv, 1) + '</td><td>' + money(x[1].value) + '</td></tr>'; }).join('') : '<tr><td colspan="3" class="empty">—</td></tr>') + '</tbody></table></div></div>';
  }
  v.innerHTML = html;
  $$('th[data-col]', v).forEach(function (th) { th.onclick = function () { if (STATE.sort.col === th.dataset.col) STATE.sort.dir *= -1; else { STATE.sort.col = th.dataset.col; STATE.sort.dir = -1; } renderCamp(per); }; });
}


/* ============================== CADASTROS (CRM) ============================== */
function isQuestionField(h) {
  var n = norm(h); if (!n) return false;
  var skip = ['nome', 'nome completo', 'name', 'full name', 'email', 'e-mail', 'telefone', 'phone', 'celular', 'whatsapp', 'data', 'dia', 'date', 'timestamp', 'created time', 'created at', 'data de cadastro', 'data de inscricao', 'horario de envio', 'id', 'lead id', 'form id', 'campanha', 'campaign', 'conjunto de anuncios', 'ad set', 'adset', 'anuncio', 'ad name', 'conta', 'account', 'plataforma', 'platform'];
  if (skip.indexOf(n) > -1) return false;
  if (/utm|fbclid|gclid|\bid\b|pixel|posicionamento|placement|criativo|creative|permalink|url|link|\bip\b|user agent|dispositivo|device|e-?mail|telefone|phone|celular|whatsapp|nome|name/.test(n)) return false;
  return true;
}
function renderCRM(per) {
  var v = $('#v-crm'); if (!v) return;
  var now = STATE.crm.filter(function (c) { return inRange(c.date, per.from, per.to); }), prev = STATE.crm.filter(function (c) { return inRange(c.date, per.pFrom, per.pTo); });
  var html = '<div class="note">' + L('Esta aba mostra só os cadastros registrados nas planilhas de formulário/CRM. Conversas de WhatsApp não entram aqui.', 'Esta pestaña muestra solo los registros de las planillas de formulario/CRM. Las conversaciones de WhatsApp no entran aquí.') + '</div>' + legendHTML(per) +
    '<div class="grid" style="margin-bottom:14px">' + kpi(L('Cadastros recebidos', 'Registros recibidos'), now.length, prev.length, count) +
    kpi(L('Média por dia', 'Promedio por día'), now.length / per.len, prev.length / per.pLen, function (x) { return nf(x, 1); });
  var q = now.filter(function (c) { return c.qual; }).length, s = now.filter(function (c) { return c.sale; }).length;
  if (STATE.sources.some(function (x) { return x.tipo === 'crm' && x.status.hasStatus; })) html += kpi(L('Qualificados', 'Calificados'), q, prev.filter(function (c) { return c.qual; }).length, count) + kpi(L('Vendas', 'Ventas'), s, prev.filter(function (c) { return c.sale; }).length, count);
  html += '</div>';
  if (!now.length) { v.innerHTML = html + '<div class="card empty">' + L('Nenhum cadastro no período selecionado.', 'Ningún registro en el período seleccionado.') + '</div>'; return; }
  var fields = {}, order = [];
  now.forEach(function (c) { Object.keys(c.raw || {}).forEach(function (k) { if (!fields[k]) { fields[k] = []; order.push(k); } fields[k].push(c.raw[k]); }); });
  order.forEach(function (k) {
    if (!isQuestionField(k)) return;
    var counts = {}, answered = 0;
    fields[k].forEach(function (x) { var t = String(x == null ? '' : x).trim(); if (!t || t === '-' || parseDate(t) && /\d{4}|\d\/\d/.test(t)) return; answered++; counts[t] = (counts[t] || 0) + 1; });
    var e = Object.keys(counts).map(function (x) { return [x, counts[x]]; }).sort(function (a, b) { return b[1] - a[1]; });
    if (!e.length || e.length > 15 || e.length === answered && answered > 3) return;
    var max = e[0][1];
    html += '<div class="card"><h3>' + esc(k) + '</h3><p class="mut" style="font-size:12.5px">' + answered + L(' respostas entre ', ' respuestas entre ') + now.length + L(' cadastros do período.', ' registros del período.') + '</p>' +
      e.map(function (x) { var pc = answered ? x[1] / answered : 0; return '<div style="display:grid;grid-template-columns:minmax(120px,1.2fr) 3fr auto;gap:10px;align-items:center;margin:6px 0;font-size:13px"><span>' + esc(x[0]) + '</span><div class="paceBar" style="margin:0"><span style="width:' + (x[1] / max * 100) + '%;background:var(--ac)"></span></div><span class="mut">' + x[1] + ' · ' + pctf(pc, 0) + '</span></div>'; }).join('') + '</div>';
  });
  v.innerHTML = html;
}

/* ============================== RITMO DE VERBA ============================== */
function renderPace() {
  var v = $('#v-pace'), today = todayISO(), end = STATE.incToday ? today : addDays(today, -1), ms = monthStart(today), me = monthEnd(today);
  if (end < ms) end = ms;
  var accts = {}; STATE.rows.forEach(function (r) { if (STATE.plat === 'all' || r.platform === STATE.plat) accts[r.account] = r.platform; });
  var budgets = Object.assign({}, D.verbas || {}, store.get('verbas', {}));
  var days = daysBetween(ms, end) + 1, left = daysBetween(end, me), total = { b: 0, s: 0, p: 0 };
  var html = '<div class="card"><h2>' + L('Ritmo de verba no mês', 'Ritmo de inversión del mes') + '</h2><p class="mut">' + L('Informe a verba mensal de cada conta. O valor fica salvo neste navegador. Dias considerados: ', 'Informá la inversión mensual de cada cuenta. Queda guardada en este navegador. Días considerados: ') + days + L(' de ', ' de ') + (days + left) + '.</p></div>';
  Object.keys(accts).sort().forEach(function (a) {
    var s = agg(STATE.rows.filter(function (r) { return r.account === a && inRange(r.date, ms, end); })).spend;
    var b = +budgets[a] || 0, avg = s / days, proj = s + avg * left, need = left > 0 ? Math.max(b - s, 0) / left : 0;
    total.b += b; total.s += s; total.p += proj;
    var sp = b ? Math.min(s / b * 100, 100) : 0, pp = b ? Math.min(Math.max(proj - s, 0) / b * 100, 100 - sp) : 0, over = b && proj > b * 1.02, under = b && proj < b * 0.9;
    html += '<div class="card"><div class="bar"><h3>' + (accts[a] === 'google' ? 'Google · ' : 'Meta · ') + esc(a) + '</h3><label class="mut" style="font-size:12.5px">' + L('Verba do mês', 'Inversión del mes') + ' <input type="number" data-b="' + esc(a) + '" value="' + (b || '') + '" style="width:120px"></label></div>' +
      '<div class="paceBar"><span style="width:' + sp + '%;background:var(--ac)"></span><span style="width:' + pp + '%;background:color-mix(in srgb,var(--ac) 35%,transparent)"></span></div><div class="grid">' +
      kpiSimple(L('Gasto no mês', 'Gastado en el mes'), money(s)) + kpiSimple(L('Média por dia', 'Promedio por día'), money(avg)) +
      kpiSimple(L('Projeção de fechamento', 'Proyección de cierre'), money(proj), over ? 'down' : under ? 'warn' : 'up', !b ? L('informe a verba', 'informá la inversión') : over ? L('acima da verba', 'por encima de la inversión') : under ? L('abaixo da verba', 'por debajo de la inversión') : L('dentro do planejado', 'dentro de lo planificado')) +
      kpiSimple(L('Necessário por dia até o fim', 'Necesario por día hasta el fin'), b ? money(need) : '—') + '</div></div>';
  });
  if (!Object.keys(accts).length) html += '<div class="card empty">' + L('Sem contas no filtro.', 'Sin cuentas en el filtro.') + '</div>';
  v.innerHTML = html;
  $$('[data-b]', v).forEach(function (el) { el.onchange = function () { var s = store.get('verbas', {}); s[el.dataset.b] = parseFloat(el.value) || 0; store.set('verbas', s); renderPace(); }; });
}

/* ============================== RESUMO WHATSAPP ============================== */
function renderWa(per) {
  var v = $('#v-wa'), cur = agg(filtered(per.from, per.to)), prev = agg(filtered(per.pFrom, per.pTo));
  var lines = ['*' + (D.cliente || '') + ' · ' + L('Resumo de mídia paga', 'Resumen de medios pagos') + '*', fmtD(per.from, 1) + ' → ' + fmtD(per.to, 1), ''];
  function dl(c, p, down) { var d = deltaTxt(c, p); if (!d) return ''; return ' (' + d.txt + ')'; }
  lines.push('💰 ' + L('Investimento', 'Inversión') + ': ' + money(cur.spend) + dl(cur.spend, prev.spend));
  lines.push('👀 ' + L('Impressões', 'Impresiones') + ': ' + count(cur.impressions) + ' · ' + L('Cliques', 'Clics') + ': ' + count(cur.clicks));
  funnelsPresent().forEach(function (f) {
    if (f === 'outros' || f === 'trafego') return;
    var F = buildFunnel(f, per), rk = F.resKey, c = F.cur[rk], p = F.prev[rk], cpr = c ? F.cur.spend / c : null, ppr = p ? F.prev.spend / p : null;
    lines.push(''); lines.push('▸ *' + FNAME(f) + '*');
    lines.push(RNAME(f).charAt(0).toUpperCase() + RNAME(f).slice(1) + ': ' + count(c) + dl(c, p) + ' · ' + L('custo por ', 'costo por ') + RNAME(f, false) + ': ' + money(cpr) + dl(cpr, ppr));
    if (f === 'vendas' && STATE.has.revenue) lines.push(L('Receita', 'Ingresos') + ': ' + money(F.cur.revenue) + ' · ROAS ' + xf(F.cur.roas));
  });
  var ins = insights(per).filter(function (i) { return i.t !== 'dado'; }).slice(0, 3);
  if (ins.length) { lines.push(''); lines.push('*' + L('Destaques', 'Destacados') + '*'); ins.forEach(function (i) { lines.push((i.t === 'pos' ? '✅ ' : '⚠️ ') + i.title); }); }
  var text = lines.join('\n');
  v.innerHTML = '<div class="card"><div class="bar"><h2>' + L('Resumo para WhatsApp', 'Resumen para WhatsApp') + '</h2><button class="btn pri" id="dzCopy">' + L('Copiar texto', 'Copiar texto') + '</button></div><p class="mut">' + L('Texto pronto com o período e os filtros atuais.', 'Texto listo con el período y los filtros actuales.') + '</p><textarea id="dzWaTxt" style="min-height:280px">' + esc(text) + '</textarea></div>';
  $('#dzCopy').onclick = function () { var t = $('#dzWaTxt'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } this.textContent = '✓ ' + L('Copiado', 'Copiado'); };
}

/* ============================== DIAGNÓSTICO ============================== */
function renderDiag() {
  var v = $('#v-diag'), html = '<div class="card"><h2>' + L('Saúde das fontes', 'Salud de las fuentes') + '</h2><p class="mut">' + L('Se uma planilha não carregar, cole o conteúdo CSV no campo da fonte como alternativa temporária.', 'Si una planilla no carga, pegá el contenido CSV en el campo de la fuente como alternativa temporal.') + '</p></div>';
  STATE.sources.forEach(function (s) {
    var st = s.status || {}, map = st.map || {}, h = st.headers || [];
    html += '<div class="card"><div class="bar"><h3>' + (st.ok ? '✓ ' : '✗ ') + esc(s.nome || s.conta || s.plataforma || s.tipo) + ' <span class="tag">' + esc(s.tipo) + (s.funil ? ' · ' + esc(s.funil) : '') + '</span></h3><span class="' + (st.ok ? 'up' : 'down') + '" style="font-size:12.5px">' + (st.ok ? count(st.rows) + L(' linhas', ' filas') + (st.dup ? ' · ' + st.dup + L(' duplicadas ignoradas', ' duplicadas ignoradas') : '') + (st.fromPaste ? ' · ' + L('usando CSV colado', 'usando CSV pegado') : '') : esc(st.error || '')) + '</span></div>';
    if (h.length) html += '<p class="mut" style="font-size:12px;margin-top:8px">' + L('Colunas reconhecidas: ', 'Columnas reconocidas: ') + Object.keys(map).filter(function (k) { return map[k] != null; }).map(function (k) { return '<b style="color:var(--tx)">' + k + '</b> ← ' + esc(h[map[k]]); }).join(' · ') + (st.locale ? ' · ' + L('decimal: ', 'decimal: ') + (st.locale === 'comma' ? '1.234,56' : '1,234.56') : '') + (s.tipo === 'crm' ? ' · ' + (st.hasStatus ? L('coluna de status encontrada', 'columna de estado encontrada') : L('sem coluna de status', 'sin columna de estado')) : '') + '</p>';
    html += '<details style="margin-top:8px"><summary class="mut" style="cursor:pointer;font-size:12.5px">' + L('Colar CSV manualmente', 'Pegar CSV manualmente') + '</summary><textarea data-paste="' + s.id + '" placeholder="CSV">' + esc(store.get('paste_' + s.id, '')) + '</textarea><div class="row" style="margin-top:6px"><button class="btn" data-save="' + s.id + '">' + L('Usar este CSV', 'Usar este CSV') + '</button><button class="btn" data-clear="' + s.id + '">' + L('Voltar à leitura automática', 'Volver a la lectura automática') + '</button></div></details></div>';
  });
  var cls = Object.keys(STATE.camp);
  if (cls.length) html += '<div class="card"><h3>' + L('Classificação das campanhas', 'Clasificación de campañas') + '</h3><p class="mut" style="font-size:12.5px">' + L('Se alguma estiver errada, ajuste em window.DASH.objetivos (trecho do nome → funil).', 'Si alguna está mal, ajustá en window.DASH.objetivos (parte del nombre → embudo).') + '</p><div class="tw"><table><tbody>' + cls.sort().map(function (k) { var p = k.split('||'); return '<tr><td>' + esc(p[2]) + ' <small class="mut">' + esc(p[1]) + '</small></td><td>' + FNAME(STATE.camp[k].funnel) + '</td><td class="prev">' + esc(STATE.camp[k].why) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  v.innerHTML = html;
  $$('[data-save]', v).forEach(function (b) { b.onclick = function () { store.set('paste_' + b.dataset.save, $('[data-paste="' + b.dataset.save + '"]', v).value); run(); }; });
  $$('[data-clear]', v).forEach(function (b) { b.onclick = function () { store.del('paste_' + b.dataset.clear); run(); }; });
}

/* ============================== ORQUESTRAÇÃO ============================== */
function syncBar(per) {
  $$('#dzPresets .pill').forEach(function (b) { b.classList.toggle('on', b.dataset.p === STATE.preset); });
  $('#dzCustom').style.display = STATE.preset === 'custom' ? '' : 'none';
  $('#dzToday').checked = STATE.incToday;
  var plats = {}; STATE.rows.forEach(function (r) { plats[r.platform] = 1; });
  var pl = Object.keys(plats);
  $('#dzPlat').style.display = pl.length > 1 ? '' : 'none';
  $('#dzPlat').innerHTML = '<option value="all">' + L('Todas as plataformas', 'Todas las plataformas') + '</option>' + pl.map(function (p) { return '<option value="' + p + '"' + (STATE.plat === p ? ' selected' : '') + '>' + (p === 'google' ? 'Google Ads' : 'Meta Ads') + '</option>'; }).join('');
  var ac = {}; STATE.rows.forEach(function (r) { if (STATE.plat === 'all' || r.platform === STATE.plat) ac[r.account] = 1; });
  var al = Object.keys(ac).sort();
  $('#dzAcct').style.display = al.length > 1 ? '' : 'none';
  $('#dzAcct').innerHTML = '<option value="all">' + L('Todas as contas', 'Todas las cuentas') + '</option>' + al.map(function (a) { return '<option' + (STATE.acct === a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('');
  $('#dzPer').innerHTML = L('Período atual', 'Período actual') + ': <b style="color:var(--tx)">' + fmtD(per.from, 1) + ' → ' + fmtD(per.to, 1) + '</b> · ' + L('comparado com', 'comparado con') + ' <b style="color:var(--tx)">' + fmtD(per.pFrom, 1) + ' → ' + fmtD(per.pTo, 1) + '</b>' + (per.isMtd ? ' (' + L('mês anterior completo', 'mes anterior completo') + ')' : '');
  $('#dzUpd').textContent = STATE.loadedAt ? L('Dados lidos em ', 'Datos leídos el ') + STATE.loadedAt.toLocaleString(LOC()) + (lastDataDate() ? ' · ' + L('último dia com dados: ', 'último día con datos: ') + fmtD(lastDataDate(), 1) : '') : '';
}
function renderAll() {
  var per = resolvePeriod();
  syncBar(per);
  [['overview', function () { renderOverview(per); }], ['funnels', function () { renderFunnels(per); }], ['sim', function () { renderSim(per); }], ['camp', function () { renderCamp(per); }], ['crm', function () { renderCRM(per); }], ['pace', renderPace], ['wa', function () { renderWa(per); }], ['diag', renderDiag]].forEach(function (x) {
    try { x[1](); } catch (e) { var el = $('#v-' + x[0]); if (el) el.innerHTML = '<div class="card down">' + L('Erro ao montar esta aba: ', 'Error al armar esta pestaña: ') + esc(e.message) + '</div>'; if (window.console) console.error(e); }
  });
  setTimeout(reportHeight, 50);
}
function run() {
  $('#dzUpd').textContent = L('Lendo as planilhas publicadas…', 'Leyendo las planillas publicadas…');
  return loadAll().then(renderAll);
}
function init() {
  injectStyle();
  initSources();
  shell();
  lockThen(run);
  window.addEventListener('resize', function () { setTimeout(reportHeight, 100); });
}
window.DASH_MOTOR = { version: VERSION, state: STATE, run: run, _test: { resolvePeriod: resolvePeriod, buildFunnel: buildFunnel, insights: insights, scenarioRates: scenarioRates, agg: agg, filtered: filtered, classifyCampaigns: classifyCampaigns } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
