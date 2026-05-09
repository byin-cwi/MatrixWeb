# personalWeb

My blog: 一个 Git 管理、GitHub Pages 可部署的个人网站模板。页面风格参考 `kexue.fm` 一类以文章为中心的技术博客：轻量、朴素、强调归档和可读性。

## 文件结构

```text
.
├── index.html
├── assets/
│   ├── main.js
│   ├── notebook.svg
│   └── styles.css
└── .github/
    └── workflows/
        └── pages.yml
```

## 本地预览

直接在浏览器打开 `index.html` 即可。也可以启动一个简单静态服务器：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 用 Git 管理

如果目录还不是 Git 仓库：

```bash
git init
git add .
git commit -m "Create personal website"
```

## 发布到 GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `personal-web`。
2. 添加远程仓库并推送：

```bash
git remote add origin git@github.com:yourname/personal-web.git
git branch -M main
git push -u origin main
```

3. 在仓库设置里启用 GitHub Pages，选择 GitHub Actions。`.github/workflows/pages.yml` 会把当前静态站发布出去。

## 下一步可替换内容

- 把 `index.html` 中的“你的名字”、邮箱、GitHub 链接替换成真实信息。
- 把示例文章替换成你的研究笔记或项目复盘。
- 如果文章变多，可以迁移到 Jekyll、Hugo 或 Astro，同时继续保留 GitHub Pages 发布流程。
