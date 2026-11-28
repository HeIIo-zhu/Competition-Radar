/* 竞赛雷达 · 公网刷新代理（Cloudflare Workers，免费）
   部署：Cloudflare 控制台 → Workers & Pages → Create Worker → Edit code → 全文粘贴 → Deploy
   接口：
     /api/ping          健康检查
     /api/status        上次校内通知刷新结果
     /api/refresh       抓南信大 5 个官方栏目的最新通知
     /api/schedules POST 抓一组赛事官网，提取报名状态与日程（body: {targets:[{id,name,url}]}）
     /api/scan?url=     抓单个官网并跟进子页，列出日期
   安全：所有目标网址必须在白名单内，避免被当成开放代理。
*/
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SOURCES = [
  { id: 'nuist-cxcy', name: '南信大信息公告栏 · 创新创业', url: 'https://bulletin.nuist.edu.cn/cxcy.htm' },
  { id: 'nuist-wjgg', name: '南信大信息公告栏 · 文件公告', url: 'https://bulletin.nuist.edu.cn/wjgg/255.htm' },
  { id: 'ofxy', name: '藕舫学院 · 通知公告', url: 'https://ofxy.nuist.edu.cn/3456/list.htm' },
  { id: 'ofxy-list2', name: '藕舫学院 · 通知公告（第2页）', url: 'https://ofxy.nuist.edu.cn/3456/list2.htm' },
  { id: 'cxcysj', name: '创新创业学院 · 竞赛目录', url: 'https://ofxy.nuist.edu.cn/3454/list.htm' }
];

const ALLOW = [
  '3chuang.net',
  'acm.cumt.edu.cn',
  'bjtu.edu.cn',
  'blcu.edu.cn',
  'c4best.cn',
  'caairobot.com',
  'ccf.org.cn',
  'ccpc.ccf.org.cn',
  'cdec.org.cn',
  'cfw.cn',
  'china-cssc.org',
  'chinagxjob.com',
  'chinaus-maker.org.cn',
  'cid.nju.edu.cn',
  'ciscn.cn',
  'clpp.org.cn',
  'cmathc.org.cn',
  'cnsoftbei.com',
  'comap.org',
  'compiler.educg.net',
  'contest.comap.org',
  'contest.i21st.cn',
  'crc.drct-caa.org.cn',
  'cstam.org.cn',
  'cteic.com',
  'cugb.edu.cn',
  'cuidc.net',
  'culsc.cn',
  'cumt.edu.cn',
  'cy.ncss.cn',
  'digix.org.cn',
  'drct-caa.org.cn',
  'e.huawei.com',
  'energy.ckcest.cn',
  'fwwb.org.cn',
  'g-ican.com',
  'gcxl.edu.cn',
  'gd.p.moocollege.com',
  'giscloud.com.cn',
  'gjcxcy.bjtu.edu.cn',
  'hhu.edu.cn',
  'huacanjiang.com',
  'huawei.com',
  'ibizsim.com.cn',
  'iche.zju.edu.cn',
  'icpc.pku.edu.cn',
  'ict.sflep.com',
  'iot.sjtu.edu.cn',
  'isclab.org.cn',
  'jienengjianpai.org',
  'jingdiansxj.cn',
  'jsjds.blcu.edu.cn',
  'lalavision.com',
  'lanqiao.cn',
  'm3dds.3ddl.net',
  'match.xmkeyun.com.cn',
  'mcm.edu.cn',
  'meicc.cmes.org',
  'mit.caai.cn',
  'mse-cn.com',
  'mtcup.cn',
  'ncss.cn',
  'nju.edu.cn',
  'nuedc.xjtu.edu.cn',
  'nuist.edu.cn',
  'p.moocollege.com',
  'pku.edu.cn',
  'raicom.com.cn',
  'robotcontest.cn',
  'seentao.com',
  'siemenscup-cimc.org.cn',
  'sjtu.edu.cn',
  'sljzw.hhu.edu.cn',
  'smartcarrace.com',
  'smt.whu.edu.cn',
  'socchina.net',
  'ssfk.zufe.edu.cn',
  'star.baidu.com',
  'structurecontest.com',
  'sun-ada.net',
  'tiaozhanbei.net',
  'tjjmds.ai-learning.net',
  'uiaec.ujs.edu.cn',
  'ujs.edu.cn',
  'umic.ckcest.cn',
  'univ.ciciec.com',
  'whu.edu.cn',
  'wlsycx.moocollege.com',
  'www.3chuang.net',
  'www.c4best.cn',
  'www.caairobot.com',
  'www.cdec.org.cn',
  'www.china-cssc.org',
  'www.chinagxjob.com',
  'www.chinaus-maker.org.cn',
  'www.ciscn.cn',
  'www.clpp.org.cn',
  'www.cmathc.org.cn',
  'www.cnsoftbei.com',
  'www.cteic.com',
  'www.cuidc.net',
  'www.culsc.cn',
  'www.digix.org.cn',
  'www.fwwb.org.cn',
  'www.g-ican.com',
  'www.gcxl.edu.cn',
  'www.giscloud.com.cn',
  'www.huacanjiang.com',
  'www.ibizsim.com.cn',
  'www.isclab.org.cn',
  'www.jienengjianpai.org',
  'www.jingdiansxj.cn',
  'www.lalavision.com',
  'www.mcm.edu.cn',
  'www.mse-cn.com',
  'www.mtcup.cn',
  'www.raicom.com.cn',
  'www.robotcontest.cn',
  'www.seentao.com',
  'www.siemenscup-cimc.org.cn',
  'www.smartcarrace.com',
  'www.socchina.net',
  'www.structurecontest.com',
  'www.sun-ada.net',
  'www.tiaozhanbei.net',
  'www.xcbds.com',
  'xcbds.com',
  'xjtu.edu.cn',
  'xmkeyun.com.cn',
  'yuanxi.cugb.edu.cn',
  'zju.edu.cn',
  'zpy.cstam.org.cn',
  'zufe.edu.cn',
  'case.sppm.tsinghua.edu.cn',
  'ccsmic.scimeeting.cn',
  'cpipc.acge.org.cn',
  'cubec.org.cn',
  'dtcup.dtxiaotangren.com',
  'etic.claonline.cn',
  'qgjxjn.zjnu.edu.cn',
  'qspfw.moe.gov.cn',
  'ucc.fltrp.com',
  'wto.chinalaw.org.cn',
  'www.antgoculture.com',
  'www.brskills.com',
  'www.caanet.org.cn',
  'www.chinaneccs.cn',
  'www.cma.gov.cn',
  'www.cnrobocon.net',
  'www.moe.gov.cn',
  'www.ncda.org.cn',
  'xwkds.sdu.edu.cn',
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
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Cache-Control': 'no-store'
};
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
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

/* Cloudflare Workers 单次请求最多 6 条并发连接，超出的会排队；
   若一次性并发 12 个抓取，排在后面的连接还没建立超时计时就已走完，全变 abort。
   这里改成小并发池：只有真正拿到连接才开始计时。 */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const n = Math.min(limit, items.length);
  const workers = [];
  for (let k = 0; k < n; k++) {
    workers.push((async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    })());
  }
  await Promise.all(workers);
  return out;
}

/* 只对「超时 / 5xx / 429」再试一次；403、404、405 这类确定性失败重试也没用，直接返回。 */
async function fetchTextRetry(target, ms = 11000, deadline = 0) {
  try {
    return await fetchText(target, ms);
  } catch (e) {
    const msg = String((e && e.message) || e);
    const left = deadline ? deadline - Date.now() : 30000;
    if (!/aborted|HTTP 5\d\d|HTTP 429/i.test(msg) || left < 9000) throw e;
    await new Promise(r => setTimeout(r, 500));
    return await fetchText(target, Math.min(ms, left - 1200));
  }
}

/* 把底层报错翻译成人话，避免界面上只显示 HTTP 530 这种看不懂的东西 */
function friendlyErr(e) {
  const msg = String((e && e.message) || e);
  if (/aborted/i.test(msg)) return '官网响应超时，很久没返回（对方服务器慢，或屏蔽了境外的抓取请求）';
  if (/HTTP 5\d\d/.test(msg)) return '官网服务器故障（' + msg + '），暂时抓不到';
  if (/HTTP 40[35]/.test(msg)) return '官网拒绝程序访问（' + msg + '），请点官网链接人工查看';
  if (/HTTP 404/.test(msg)) return '官网链接已失效（404），需要更新网址';
  if (/反爬/.test(msg)) return '官网有反爬验证，抓不到内容';
  return msg.slice(0, 80);
}

function clean(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim();
}
function stripTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ').trim();
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

/* ── 从赛事官网页面提取「报名状态 / 开始 / 截止」及原文证据 ───── */
const DATE_RE = /(20\d\d)\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})/g;
const KW_CTX = /报名|截止|开始|启动|开通|初赛|复赛|决赛|提交|作品|赛程|时间安排|征集/;
const RE_START = /(报名|征集|申报)\s*(开始|启动|开启|开通)|(开始|启动|开通)\s*(报名|征集|申报)/;
const RE_END = /(报名|提交|作品|申报)\s*(截止|截至|结束|关闭)|(截止|截至|关闭)\s*(报名|提交|申报)/;
function extractSchedule(html) {
  const text = stripTags(String(html || '').slice(0, 500000));
  const hasCN = /[\u4e00-\u9fff]/.test(text);
  const dates = [], evidence = [];
  let start = null, deadline = null;
  // 按句处理，避免相邻句子的「截止」污染前面那句的「开始」
  const sentences = text.split(/[。；;！!\n]+/).map(x => x.trim()).filter(x => x.length > 3);
  for (const sent of sentences) {
    const ms = [...sent.matchAll(DATE_RE)];
    if (!ms.length) continue;
    if (KW_CTX.test(sent) && evidence.length < 5) {
      const sn = sent.slice(0, 150);
      if (!evidence.includes(sn)) evidence.push(sn);
    }
    for (const m of ms) {
      const y = +m[1], mo = +m[2], d = +m[3];
      if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
      const day = y + '-' + pad(mo) + '-' + pad(d);
      dates.push(day);
      const before = sent.slice(Math.max(0, m.index - 30), m.index);
      const after = sent.slice(m.index + m[0].length, m.index + m[0].length + 20);
      if (!start && (RE_START.test(before) || (/报名/.test(before) && /(开放|开启|启动|开始)/.test(after)))) start = day;
      if (!deadline && RE_END.test(before)) deadline = day;
    }
  }
  // 状态推断（保守，配合证据让用户自行核对）
  let status = '未见报名信息';
  const hasOpen = /正在报名|报名中|立即报名|我要报名|点击报名|报名入口|在线报名|报名系统/.test(text);
  const hasClosed = /报名\s*(已经|已)?\s*(结束|截止|关闭)|报名通道关闭|报名已截止|报名已结束/.test(text);
  if (hasOpen) status = '报名中';
  else if (hasClosed) status = '报名已截止';
  if (status === '未见报名信息' && start && new Date(start) > new Date()) status = '即将开始报名';
  if ((!hasCN && dates.length === 0) || (text.length < 80 && dates.length === 0)) status = '官网为动态页面';
  // 若开始/截止撞成同一天，用证据里更晚的日期修正截止
  if (start && deadline && start === deadline) {
    const later = dates.find(x => x > start);
    if (later) deadline = later;
  }
  return {
    status, start, deadline,
    dates: Array.from(new Set(dates)).sort().slice(0, 12),
    evidence
  };
}
/* 首页无报名信息时，挑一个含「报名/通知/赛程」的同域子页再抓一次 */
function pickSubPage(html, baseUrl) {
  const base = new URL(baseUrl);
  let best = null;
  for (const m of html.matchAll(/<a[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const t = clean(m[2]);
    if (!/报名|赛程|通知|公告|赛事|竞赛|安排|时间/.test(t + ' ' + m[1])) continue;
    let abs; try { abs = new URL(m[1], base); } catch (e) { continue; }
    if (abs.hostname !== base.hostname || !allowed(abs.href)) continue;
    const score = /报名|赛程|通知|竞赛|大赛/.test(t) ? 2 : 1;
    if (!best || score > best.score) best = { url: abs.href, score };
  }
  return best ? best.url : null;
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



/* 发现赛事官网：抓 Bing 搜索结果页，取第一条非搜索引擎的官网链接。
   免费、不需要 Web Search API、不需要绑卡；结果仅作为候选，前端标注「自动发现」供人工核对。 */
const BAD_HOST = /(^|\.)(bing\.com|microsoft\.com|baidu\.com|so\.com|sogou\.com|360\.cn|zhihu\.com|baike\.baidu\.com|csdn\.net|jianshu\.com|weixin\.qq\.com|qq\.com|weibo\.com|douban\.com|bilibili\.com|xiaohongshu\.com|xueshu\.com|cnki\.net|doc88\.com|wenku\.baidu\.com|51cto\.com|blog\.csdn\.net)$/i;
async function discoverUrl(name, ms = 12000) {
  const q = encodeURIComponent(String(name || '').slice(0, 60) + ' 官网');
  const url = 'https://www.bing.com/search?q=' + q + '&setlang=zh-CN&count=10';
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
      redirect: 'follow', signal: ctl.signal
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const html = await r.text();
    const re = /<h2[^>]*>[\s\S]{0,800}?<a[^>]+href="(https?:\/\/[^"]+)"/g;
    let m;
    while ((m = re.exec(html))) {
      let u; try { u = new URL(m[1].replace(/&amp;/g, '&')); } catch (e) { continue; }
      if (BAD_HOST.test(u.hostname)) continue;
      if (u.hostname === 'bing.com' || u.hostname.endsWith('.bing.com')) continue;
      return u.origin + u.pathname + u.search;
    }
    return null;
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
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
      if (p === '/api/findurl' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const names = (Array.isArray(body.names) ? body.names : []).slice(0, 8).map(String);
        const results = await mapLimit(names, 3, async name => ({ name, url: await discoverUrl(name) }));
        return json({ ok: true, results });
      }
      if (p === '/api/schedules' && request.method === 'POST') {
        const body = await request.json();
        const targets = Array.isArray(body.targets) ? body.targets.slice(0, 15) : [];
        // 并发 5：留一条余量给「跟进子页」的请求，避免自己把自己挤到超时
        const batchDeadline = Date.now() + 40000;   // 单批最多用 40 秒，别把前端 60 秒预算耗光
        const results = await mapLimit(targets, 5, async t => {
          const base = { id: t.id, name: t.name, url: t.url };
          if (!allowed(t.url)) return { ...base, ok: false, status: '网址不在白名单' };
          const t0 = Date.now();
          try {
            const html = await fetchTextRetry(t.url, 11000, batchDeadline);
            let info = extractSchedule(html);
            let followed = null;
            if (info.status === '未见报名信息' || info.status === '官网为动态页面') {
              const sub = pickSubPage(html, t.url);
              if (sub) {
                try {
                  const html2 = await fetchTextRetry(sub, 7000, batchDeadline + 7000);
                  const info2 = extractSchedule(html2);
                  if (info2.evidence.length > info.evidence.length || info2.status === '报名中' || info2.status === '报名已截止') {
                    info = info2; followed = sub;
                  }
                } catch (e) { /* 子页失败不影响首页结果 */ }
              }
            }
            return { ...base, ok: true, ...info, followed, ms: Date.now() - t0, fetchedAt: new Date().toISOString() };
          } catch (e) {
            return { ...base, ok: false, status: '抓取失败', error: friendlyErr(e), ms: Date.now() - t0 };
          }
        });
        return json({ ok: true, results });
      }
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
