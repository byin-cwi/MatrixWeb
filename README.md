# MatrixWeb

一个 Git 管理、GitHub Pages 可部署的学术个人主页。首页采用 AcademicPages 风格：顶部导航、左侧 profile 侧栏、右侧 About / Research / Publications / Blogs 内容区。文章使用 Markdown 写在 `content/posts/`，构建脚本会生成首页博客列表和 `posts/*.html` 文章页。

## 文件结构

```text
.
├── index.html
├── content/
│   └── posts/
│       └── 2026-05-09-git-personal-knowledge.md
├── posts/
│   └── git-personal-knowledge.html
├── scripts/
│   └── build.js
├── assets/
│   ├── main.js
│   ├── notebook.svg
│   ├── profile.jpg
│   ├── cv_DM.pdf
│   └── styles.css
└── .github/
    └── workflows/
        └── pages.yml
```

## 本地预览

先构建，再启动一个简单静态服务器：

```bash
npm run build
npm run serve
```

然后访问 `http://localhost:8080`。

## 新增文章

在 `content/posts/` 新建 Markdown 文件，并写入 front matter：

```markdown
---
title: 文章标题
date: 2026-05-09
slug: article-slug
summary: 首页显示的一句话摘要。
tags: Tag A, Tag B
readTime: 5 min read
---

# 文章标题

这里写正文。
```

然后运行：

```bash
npm run build
```

脚本会更新 `index.html`，并生成 `posts/article-slug.html`。

## 用 Git 管理

如果目录还不是 Git 仓库：

```bash
git init
git add .
git commit -m "Create personal website"
```

## 发布到 GitHub Pages

1. 在 GitHub 新建或重命名仓库为 `MatrixWeb`。
2. 添加远程仓库并推送：

```bash
git remote add origin https://github.com/byin-cwi/MatrixWeb.git
git branch -M main
git push -u origin main
```

3. 在仓库设置里启用 GitHub Pages，选择 GitHub Actions。`.github/workflows/pages.yml` 会自动运行 `npm run build`，并发布到 `https://byin-cwi.github.io/MatrixWeb/`。

## 下一步可替换内容

- 在 `scripts/build.js` 中继续维护 profile、About Me、Research Interests、Publications、Teaching、CV 等主页内容。
- 把示例文章替换成你的研究笔记或项目复盘。
- 如果文章变多，可以继续增强 `scripts/build.js`，或者迁移到 Jekyll、Hugo、Astro。
