/* 「我的竞赛」导入模块：PDF / TXT / 粘贴文本 → 赛事名 → 匹配官网
   数据只写浏览器 localStorage，不上传任何服务器。 */
(function(){
  "use strict";
  const MY_KEY = 'nuist_radar_my_v1';

  /* 归一化：去空格与标点差异，用于跨表格比对赛事名 */
  function norm(s){
    return String(s==null?'':s)
      .replace(/[\s\u00a0\u3000]/g,'')
      .replace(/[“”"‘’'·•、，,：:；;。.（）()\[\]【】—\-－_]/g,'')
      .toLowerCase();
  }

  /* 从任意目录文本里抽赛事名：优先「行首序号」锚点，失败则退化为逐行提取 */
  function parseText(raw){
    const text = String(raw||'').replace(/\f/g,'\n').replace(/\u00a0/g,' ');
    const lines = text.split('\n').map(s=>s.trim()).filter(Boolean);
    const skip = /^(附件\s*\d|目录\s*\d|序号[\s　]*竞赛名称|类别[\s　]*负责部门|类别[\s　]*主办单位|第\s*\d+\s*页|南京信息工程大学.*竞赛目录|.*大学\d{4}年.*竞赛目录)/;
    const seq = /^(\d{1,3})[\s、.．]+(.*)$/;
    const catRe = /(Ⅰ\s*类|Ⅱ\s*类\s*[AB]?|Ⅲ\s*类|I\s*类|III\s*类)/;
    const clean = lines.filter(l=>!skip.test(l));

    const out=[]; let i=0;
    while(i<clean.length){
      const m=seq.exec(clean[i]);
      if(!m){ i++; continue; }
      const no=parseInt(m[1],10);
      const parts=[m[2]]; i++;
      while(i<clean.length && !seq.test(clean[i])){ parts.push(clean[i]); i++; }
      let rawName=parts.join(' ');
      const cm=catRe.exec(rawName);
      if(cm) rawName=rawName.slice(0,cm.index);
      const name=rawName.replace(/\s+/g,'').trim();
      if(name.length>=4 && name.length<=60 && !/^\d+$/.test(name)){
        out.push({ no:no, name:name, cat:cm?cm[1].replace(/\s/g,''):'' });
      }
    }
    /* 序号锚点解析太少 → 逐行兜底（适合「一行一个赛事名」的名单） */
    if(out.length<5){
      const alt=[];
      clean.forEach(l=>{
        let s=l.replace(/^\d{1,3}[\s、.．]+/,'').replace(catRe,'').trim();
        s=s.replace(/[\s　]+/g,'');
        if(s.length>=4 && s.length<=45 && !/^[\d\s]+$/.test(s) && !skip.test(s)) alt.push({no:alt.length+1,name:s,cat:''});
      });
      return dedupe(alt);
    }
    return dedupe(out);
  }

  function dedupe(list){
    const seen=new Set(), out=[];
    list.forEach(x=>{
      const k=norm(x.name);
      if(!k || seen.has(k)) return;
      seen.add(k); out.push(x);
    });
    return out;
  }

  /* 三级匹配：精确 → 模糊 → 内置官网库；前两级继承南信大目录已有的官网 */
  function match(rows, builtin, registry){
    const index={};
    builtin.forEach(it=>{ index[norm(it.name)]=it; });
    const items = rows.map((r,idx)=>{
      const key=norm(r.name);
      const exact=index[key];
      let base=exact;
      let how='exact';
      if(!base){
        const near=Object.keys(index).find(k=>k.length>8 && (k.indexOf(key)>=0 || key.indexOf(k)>=0));
        if(near){ base=index[near]; how='fuzzy'; }
      }
      let url = base ? (base.url||'') : '';
      let src = base ? '南信大目录' : '';
      if(!url && typeof registry!=='undefined' && registry.VENUES){
        const vk=Object.keys(registry.VENUES).find(k=>{
          const nk=norm(k);
          return nk===key || (nk.length>8 && (nk.indexOf(key)>=0 || key.indexOf(nk)>=0));
        });
        if(vk && registry.VENUES[vk]){ url=registry.VENUES[vk]; src='内置赛事库'; how=how==='exact'?'exact':'registry'; }
      }
      return {
        id:'MY-'+String(idx+1).padStart(3,'0'),
        no:r.no, name:r.name,
        cat: base ? base.cat : 'EXT',
        dept: base ? base.dept : (r.dept||'待补充'),
        url:url, urlSrc:src, match:how,
        dir: base && base.dir ? base.dir : 'gen',
        note: url ? '' : '未找到官网，可手动填写'
      };
    });
    return items;
  }

  function load(){
    try{ const c=JSON.parse(localStorage.getItem(MY_KEY)||'null'); return c&&Array.isArray(c.items)?c:null; }
    catch(e){ return null; }
  }
  function save(items){
    try{ localStorage.setItem(MY_KEY, JSON.stringify({items:items, ts:Date.now()})); return true; }
    catch(e){ return false; }
  }
  function clear(){ try{ localStorage.removeItem(MY_KEY); }catch(e){} }

  function loadScript(src){
    return new Promise((ok,bad)=>{
      const s=document.createElement('script'); s.src=src; s.async=true;
      s.onload=()=>ok(); s.onerror=()=>bad(new Error('加载失败 '+src));
      document.head.appendChild(s);
    });
  }
  async function extractPdf(file, onProgress){
    const sources=[
      './js/pdf.min.js',
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    ];
    let lib=window.pdfjsLib;
    if(!lib){
      for(const u of sources){
        try{
          await loadScript(u);
          if(window.pdfjsLib){ lib=window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc=u.replace('pdf.min.js','pdf.worker.min.js'); break; }
        }catch(e){}
      }
    }
    if(!lib) throw new Error('PDF 解析组件加载失败，请改用 TXT 文件或直接粘贴文本');
    const buf=await file.arrayBuffer();
    const pdf=await lib.getDocument({data:buf, useWorkerFetch:false, isEvalSupported:false}).promise;
    let text='';
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n);
      const c=await page.getTextContent();
      const items=c.items.filter(x=>x.str&&String(x.str).trim());
      const rows=[];
      items.forEach(x=>{
        const y=Math.round(x.transform[5]/3)*3;
        let row=rows.filter(r=>Math.abs(r.y-y)<=3).sort((a,b)=>a.y-b.y)[0];
        if(!row){ row={y:y, parts:[]}; rows.push(row); }
        row.parts.push({x:x.transform[4], s:x.str});
      });
      rows.sort((a,b)=>b.y-a.y);
      rows.forEach(r=>{ r.parts.sort((a,b)=>a.x-b.x); text+=r.parts.map(p=>p.s).join(' ')+'\n'; });
      if(onProgress) onProgress(n,pdf.numPages);
    }
    return text;
  }
  async function readFile(file){
    const name=(file.name||'').toLowerCase();
    if(/\.pdf$/.test(name)) return extractPdf(file);
    if(file.text) return file.text();
    return new Promise((ok,bad)=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result||'')); r.onerror=()=>bad(new Error('文件读取失败')); r.readAsText(file); });
  }

  window.Importer={ MY_KEY:MY_KEY, norm:norm, parseText:parseText, match:match,
                    load:load, save:save, clear:clear, readFile:readFile, extractPdf:extractPdf };
})();
