# MatrixWeb

MatrixWeb is a lightweight academic personal website for Bojian Yin, built with plain HTML, CSS, Markdown, Git, and GitHub Pages.

The site uses a compact academic layout: a profile sidebar on the homepage, research-oriented sections, publication lists, and separate writing streams for English `Blog` posts and Chinese `想法` essays. Articles are written as Markdown files under `content/posts/`; the build script generates the homepage lists and standalone pages under `posts/`.

Live site:

```text
https://byin-cwi.github.io/MatrixWeb/
```

## Structure

```text
.
├── index.html                    # Generated homepage
├── content/
│   └── posts/                    # Source Markdown posts
├── posts/                        # Generated article HTML
├── scripts/
│   └── build.js                  # Static site generator
├── assets/
│   ├── styles.css                # Site styling
│   ├── main.js                   # Theme toggle
│   ├── profile.jpg               # Profile photo
│   ├── cv_DM.pdf                 # CV
│   └── *.svg / *.jpg             # Article images
└── .github/
    └── workflows/
        └── pages.yml             # GitHub Pages deployment
```

## Local Development

Build the generated pages:

```bash
npm run build
```

Serve the site locally:

```bash
npm run serve
```

Then open:

```text
http://localhost:8080
```

If a server is already using port `8080`, run another static server manually, for example:

```bash
python3 -m http.server 8081
```

## Writing Posts

Create a Markdown file in `content/posts/`:

```text
content/posts/YYYY-MM-DD-my-post-slug.md
```

Use front matter like this:

```markdown
---
title: Post Title
date: 2026-06-05
slug: my-post-slug
summary: One-sentence summary shown on the homepage.
tags: AI, Learning, Notes
readTime: 8 min read
section: blog
---

# Post Title

Body text goes here.
```

Supported `section` values:

```text
blog   # English posts shown under Blog
idea   # Chinese essays shown under 想法
```

After editing or adding posts, rebuild:

```bash
npm run build
```

The build script will:

- regenerate `index.html`;
- generate `posts/<slug>.html`;
- split posts into `Blog` and `想法`;
- number each stream independently;
- show newer posts first on the homepage.

Numbering rule:

```text
Earlier post in the same stream -> smaller number
Newer post in the same stream   -> larger number and appears first
```

For example:

```text
Blog 02
Blog 01

想法 02
想法 01
```

## Images

Article images should live in `assets/` and be referenced from Markdown with a path relative to the generated post page:

```markdown
![Figure description](../assets/my-figure.jpg)
```

The current stylesheet keeps article figures responsive. Wide figures follow the article width and shrink with the device viewport.

## Homepage Content

Most homepage content is maintained in `scripts/build.js`, including:

- profile links;
- About Me;
- Research Interests;
- Publications;
- Miscs;
- CV link;
- navigation labels.

After editing homepage content in `scripts/build.js`, run:

```bash
npm run build
```

## Deploy

Commit and push to `main`:

```bash
git add .
git commit -m "Update website"
git push origin main
```

The GitHub Actions workflow in `.github/workflows/pages.yml` builds and deploys the site to GitHub Pages.

For the first deployment, enable Pages in the repository:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

Then push to `main` or manually run the workflow from the `Actions` tab.

## Maintenance Checklist

Before publishing:

```bash
npm run build
git status --short
```

Then preview locally and check:

- homepage navigation;
- Blog and 想法 order;
- article images;
- CV link;
- mobile layout.

## License

This repository includes a `LICENSE` file. Site content, images, CV, and writing may have different reuse expectations than the code; review before redistributing.
