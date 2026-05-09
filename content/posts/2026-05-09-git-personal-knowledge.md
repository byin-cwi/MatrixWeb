---
title: 从 Git 到个人知识库：一个轻量网站工作流
date: 2026-05-09
slug: git-personal-knowledge
summary: 用 Git 管理公开笔记的好处不只是版本控制，还包括清晰的变更历史、可审阅的草稿、稳定的发布入口，以及未来迁移到任意静态站框架的自由度。
tags: Git, Personal Web
readTime: 6 min read
---

# 从 Git 到个人知识库：一个轻量网站工作流

用 Git 管理公开笔记的好处不只是版本控制，还包括清晰的变更历史、可审阅的草稿、稳定的发布入口，以及未来迁移到任意静态站框架的自由度。

## 为什么先从静态文件开始

个人网站的第一目标不是复杂，而是可持续。静态文件有几个直接好处：

- 写作入口稳定。
- 迁移成本低。
- 每一次修改都能被 Git 记录。
- GitHub Pages 可以直接托管。

## 一个基本流程

先在 `content/posts/` 里写 Markdown，再运行构建脚本生成页面：

```bash
node scripts/build.js
git add .
git commit -m "Add new post"
git push
```

这套流程足够轻，不会在写作之前引入太多工具摩擦。
