/* 竞赛雷达 · 公网刷新代理（Cloudflare Workers，免费）
   部署：Cloudflare 控制台 → Workers & Pages → Create Worker → Edit code → 全文粘贴 → Deploy
   作用：帮浏览器跨域抓取南信大官网与各赛事官网，返回 /api/ping /api/status /api/refresh /api/scan
   安全：只允许访问白名单域名，避免被当成开放代理滥用。
*/

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SOURCES = [
  { id: 'nuist-cxcy', name: '南信大信息公告栏 · 创新创业', url: 'https://bulletin.nuist.edu.cn/cxcy.htm' },
  { id: 'nuist-wjgg', name: '南信大信息公告栏 · 文件公告', url: 'https://bulletin.nuist.edu.cn/wjgg/255.htm' },
  { id: 'ofxy', name: '藕舫学院 · 通知公告', url: 'https://ofxy.nuist.edu.cn/3456/list.htm' },
  { id: 'ofxy-list2', name: '藕舫学院 · 通知公告（第2页）', url: 'https://ofxy.nuist.edu.cn/3456/list2.htm' },
  { id: 'cxcysj', name: '创新创业学院 · 竞赛目录', url: 'https://ofxy.nuist.edu.cn/3454/list.htm' }
];

/* 允许被抓取的域名后缀（学校 + 竞赛官网） */
const ALLOW = [
  'nuist.edu.cn', 'ncss.cn', 'tiaozhanbei.net', 'icpc.pku.edu.cn', 'mcm.edu.cn',
  'comap.org', 'cmathc.org.cn', 'xjtu.edu.cn', 'smartcarrace.com', 'cnsoftbei.com',
  'blcu.edu.cn', 'gcxl.edu.cn', 'huawei.com', 'g-ican.com', 'drct-caa.org.cn',
  'lanqiao.cn', 'ccf.org.cn', 'mtcup.cn', 'china-cssc.org', 'giscup.com',
  'structurecontest.com', 'bjtu.edu.cn', 'chinagxjob.com', 'c4best.cn', 'cumt.edu.cn'
];

const TODAY = new Date('2026-10-29T00:00:00');
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
function daysFromNow(d) { return Math.round((d - TODAY) / 86400000); }
function allowed(u) {
  let x; try { x = new URL(u); } catch (e) { return false; }
  if (!/^https?:$/.test(x.protocol)) return false;
  const h = x.hostname.toLowerCase();
  return ALLOW.some(s => h === s || h.endsWith('.' + s));
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Cache-Control': 'no-store'
    }
  });
}

async function fetchText(target, ms = 20000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(target, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9', 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow', signal: ctl.signal
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = await r.arrayBuffer();
    let html;
    try { html = new TextDecoder('utf-8').decode(buf); }
    catch (e) { html = new TextDecoder().decode(buf); }
    if (/环境异常|安全验证|滑动验证|captcha/i.test(html.slice(0, 3000))) throw new Error('目标站点反爬拦截');
    return html;
  } finally { clearTimeout(t); }
}

function clean(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim();
}
function parseNotices(html, base) {
  const out = [], seen = new Set();
  let blocks = html.split(/<li[\s>]/i).slice(1).map(x => '<li ' + x);
  if (blocks.length < 2) blocks = html.split(/<tr[\s>]/i).slice(1).map(x => '<tr ' + x);
  for (const b of blocks) {
    const d = /(20\d\d-\d\d-\d\d)/.exec(b);
    if (!d) continue;
    let title = '', link = '';
    const anchors = [...b.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,400}?)<\/a>/gi)];
    let best = null;
    for (const a of anchors) {
      const txt = clean(a[2]);
      if (!txt || txt.length < 6 || ['学院首页', '返回', '更多'].includes(txt)) continue;
      if (!best || txt.length > best.txt.length) best = { txt, href: a[1] };
    }
    if (best) { title = best.txt; link = best.href; }
    if (!title) {
      const cands = [...b.matchAll(/title=["']([^"']{6,160})["']/gi)].map(m => clean(m[1]));
      if (cands.length) title = cands.sort((x, y) => y.length - x.length)[0];
    }
    if (!title || title.length < 6 || seen.has(title)) continue;
    seen.add(title);
    const orgM = /class=["']news_org["'][^>]*>([\s\S]{0,240}?)<\/span>/i.exec(b) || /class=["']arti_bm["'][^>]*>([\s\S]{0,240}?)<\/span>/i.exec(b);
    let full = ''; try { full = link ? new URL(link, base).href : ''; } catch (e) {}
    out.push({ title, date: d[1], link: full, org: orgM ? clean(orgM[1]) : '' });
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

function scanDates(html) {
  const set = new Set();
  const add = (y, m, d) => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return;
    const dt = new Date(y, m - 1, d);
    const off = daysFromNow(dt);
    if (off >= -7 && off <= 550) set.add(iso(dt));
  };
  for (const m of html.matchAll(/(20\d\d)\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})/g)) add(+m[1], +m[2], +m[3]);
  for (const m of html.matchAll(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)) {
    for (const y of [2026, 2027]) add(y, +m[1], +m[2]);
  }
  return Array.from(set).sort();
}

let CACHE = null;

async function refreshAll() {
  const started = new Date().toISOString();
  const results = await Promise.all(SOURCES.map(async s => {
    const t0 = Date.now();
    try {
      const html = await fetchText(s.url);
      return { id: s.id, name: s.name, url: s.url, ok: true, count: parseNotices(html, s.url).length, ms: Date.now() - t0, _html: html };
    } catch (e) {
      return { id: s.id, name: s.name, url: s.url, ok: false, count: 0, ms: Date.now() - t0, error: String(e.message || e), _html: '' };
    }
  }));
  const notices = [];
  for (const r of results) {
    if (!r.ok) continue;
    for (const n of parseNotices(r._html, r.url)) {
      if (!notices.some(x => x.title === n.title && x.date === n.date)) notices.push(n);
    }
  }
  results.forEach(r => { delete r._html; });
  notices.sort((a, b) => b.date.localeCompare(a.date));
  const payload = { refreshedAt: started, results, notices: notices.slice(0, 120) };
  CACHE = payload;
  return payload;
}

const LINK_KEY = /(赛程|日程|时间|安排|报名|通知|公告|赛事|大赛|竞赛|规则|news|notice|schedule|list)/i;
async function scanOne(target, depth, pages, all, budgetMs) {
  const t0 = Date.now();
  try {
    const html = await fetchText(target, Math.min(budgetMs, 15000));
    scanDates(html).forEach(d => all.add(d));
    pages.push({ url: target, ok: true, dates: scanDates(html).length });
    if (depth > 0) {
      const base = new URL(target), seen = new Set(), cands = [];
      for (const m of html.matchAll(/<a[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,160}?)<\/a>/gi)) {
        let abs; try { abs = new URL(m[1], base); } catch (e) { continue; }
        if (!allowed(abs.href) || abs.hostname !== base.hostname) continue;
        const text = clean(m[2]);
        if (!LINK_KEY.test(abs.href + ' ' + text)) continue;
        const key = abs.pathname + abs.search;
        if (seen.has(key)) continue; seen.add(key);
        cands.push({ url: abs.href, score: /赛程|日程|时间|安排|报名|通知|公告/.test(text) ? 2 : 1 });
      }
      cands.sort((a, b) => b.score - a.score);
      for (const c of cands.slice(0, 4)) {
        if (Date.now() - t0 > budgetMs) break;
        await scanOne(c.url, depth - 1, pages, all, budgetMs - (Date.now() - t0));
      }
    }
  } catch (e) {
    pages.push({ url: target, ok: false, error: String(e.message || e).slice(0, 120) });
  }
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return json({}, 204);
    const u = new URL(request.url);
    const p = u.pathname;
    try {
      if (p === '/api/ping') return json({ ok: true, service: 'nuist-radar-worker', time: new Date().toISOString() });
      if (p === '/api/status') return json({
        ok: true, hasLive: !!CACHE,
        refreshedAt: CACHE ? CACHE.refreshedAt : null,
        sources: CACHE ? CACHE.results : [],
        notices: CACHE ? CACHE.notices.slice(0, 40) : []
      });
      if (p === '/api/refresh') return json({ ok: true, ...await refreshAll() });
      if (p === '/api/scan' || p === '/api/scan-one') {
        const target = (u.searchParams.get('url') || '').trim();
        if (!allowed(target)) return json({ ok: false, error: '网址不在允许范围内（仅支持南信大与白名单赛事官网）' });
        const pages = [], all = new Set();
        await scanOne(target, p === '/api/scan' ? 1 : 0, pages, all, 45000);
        return json({ ok: true, url: target, dates: Array.from(all).sort(), pages });
      }
      return json({ ok: false, error: 'not found' }, 404);
    } catch (e) {
      return json({ ok: false, error: String(e.message || e) }, 500);
    }
  }
};
