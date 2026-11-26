# 竞赛雷达 · GitHub Pages 版

这个文件夹已经按 GitHub Pages 的要求准备好，可以直接推到仓库并开启 Pages。

包含：`index.html`、`data/`（含 `config.js` 与 `targets.js`）、`资料/`、`.nojekyll`、`worker.js`（可选，用于在线刷新）、`推送到GitHub.cmd`。
不含：本地服务脚本（`server.js` / `start-server.*`）——这些只在本地用，公网上不需要。

## 一、发布步骤

### 1. 建一个空仓库

打开 https://github.com/new ：
- Repository name：例如 `nuist-competition-radar`
- 选 **Public**
- **不要**勾选 “Add a README file”（保持空仓库，避免 push 冲突）

### 2. 上传（二选一）

**方式 A：网页拖拽（不用装 git）**

在新建的仓库页面点 **uploading an existing file**，把这个文件夹里的**全部文件**（包括 `data`、`资料` 文件夹和隐藏的 `.nojekyll`）拖进去 → **Commit changes**。

**方式 B：命令行 push（本机已帮你 init + commit）**

在这个文件夹打开 Git Bash / PowerShell：

```bash
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

（本机已经执行过 `git init` 和第一次 commit，分支是 `main`，你只需加 remote 并 push。）

### 3. 开启 Pages

仓库顶部 **Settings → Pages**（左侧栏）：
- **Build and deployment** 下，Source 选 **Deploy from a branch**
- Branch 选 `main`，目录选 **/ (root)**
- 点 **Save**

等 1–2 分钟，网址为：

```
https://<你的用户名>.github.io/<仓库名>/
```

把这个网址发给别人即可。以后更新只需替换文件并 commit/push，Pages 会自动重新发布。

## 二、开启在线刷新（可选，免费）

默认不配接口时，刷新按钮会自动隐藏，页面照常用内置数据。要开启在线刷新：

1. 登录 https://dash.cloudflare.com → **Workers & Pages → Create → Worker → Create Worker**
2. 名字填 `nuist-radar-api` → **Deploy**
3. 点 **Edit code**，删掉原有内容，粘贴本文件夹 `worker.js` 全文 → **Deploy**
4. 复制 Worker 网址，形如 `https://nuist-radar-api.<你的子域名>.workers.dev`
5. 编辑 `data/config.js`，把网址填进引号：

   ```js
   const API_BASE = 'https://nuist-radar-api.<你的子域名>.workers.dev';
   ```

6. commit + push 到 GitHub（Pages 会自动更新）

配好之后，**打开页面自动刷新一次，点「刷新最新」再强制刷新一次**，抓两部分：

| 抓什么 | 数据源 | 得到什么 |
|---|---|---|
| 校内通知 | 南信大 5 个官方栏目 | 最新通知标题 / 日期 / 发布学院 / 链接 |
| 赛事官网日程 | `data/targets.js` 里 **71 个赛事官网** | 报名状态（报名中 / 已截止 / 即将开始 / 动态页 / 抓取失败）、开始报名日期、报名截止日期、页面日期、原文证据 |

- 卡片直接显示「官网实时 · 报名中 · 开始报名 X · 截止 Y」
- 点开卡片有完整官网日程区（含官网链接、跟进子页、原文证据），页面日期可点一下加入时间轴
- 刷新面板里有 71 项的抓取结果统计

按每组 12 个赛事并发（共 6 组 + 1 组校内通知），结果存浏览器本地，断网也能看上次结果。

> 报名状态是从官网文字**自动推断**的，界面有标注，正式时间以官网原文为准。官网首页没有报名信息时会自动跟进一个「报名/通知/赛程」子页；纯前端渲染的官网（蓝桥杯、软件杯等）抓不到内容，会标为「官网为动态页面」，需点官网链接人工核对。
>
> Cloudflare Worker 免费每天 10 万次请求、每个请求最多 50 个子请求（这里每组只用 12~24 个），无需信用卡；只对白名单里的南信大与 71 个赛事官网域名开放，不会被当成开放代理。这个 Worker 是公网接口，GitHub Pages / Cloudflare Pages / Netlify 都能用。
>
> **自动刷新节流**：打开页面时若距上次刷新不足 1 分钟会沿用缓存（点「刷新最新」永远强制重抓）。想严格每次打开都抓，把 `index.html` 里的 `AUTO_MIN_GAP` 改成 `0`。

## 三、注意

- `.nojekyll` 不要删，否则 GitHub Pages 可能忽略某些文件。
- 国内访问 `github.io` 偶尔不稳定；如果同学打不开，可把同样的文件夹拖到 Cloudflare Pages（网址 `*.pages.dev`）或 Netlify Drop。
- 所有资源用的是相对路径，放在 `https://<用户名>.github.io/<仓库名>/` 这种子路径下不会出问题。
