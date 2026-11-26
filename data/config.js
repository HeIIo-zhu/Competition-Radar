/* 公网刷新接口配置（同域方案下 GitHub Pages 版）
   GitHub Pages 不能跑 Worker，所以指向 Cloudflare Pages 上 _worker.js 提供的同域接口。
   等 nuist-radar.pages.dev 部署成功后即可跨域刷新（接口带 Access-Control-Allow-Origin: *）。
   留空 '' 则隐藏刷新按钮，只使用内置数据。
*/
const API_BASE = 'https://competition-radar-dzd.pages.dev';
