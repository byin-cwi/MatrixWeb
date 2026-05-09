const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content", "posts");
const postsDir = path.join(root, "posts");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function parseFrontMatter(source, fileName) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`${fileName} is missing front matter`);
  }

  const data = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    data[key] = key === "tags" ? value.split(",").map((tag) => tag.trim()) : value;
  }

  for (const key of ["title", "date", "slug", "summary"]) {
    if (!data[key]) {
      throw new Error(`${fileName} is missing ${key}`);
    }
  }

  data.tags = data.tags || [];
  data.readTime = data.readTime || "1 min read";
  return { data, markdown: match[2].trim() };
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = null;
  let inCode = false;
  let codeLanguage = "";
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    html.push(`<${list.type}>${list.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${list.type}>`);
    list = null;
  };

  for (const line of lines) {
    const codeFence = line.match(/^```(\w+)?\s*$/);
    if (codeFence) {
      if (inCode) {
        html.push(`<pre><code class="language-${escapeHtml(codeLanguage)}">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        inCode = false;
        codeLanguage = "";
        codeLines = [];
      } else {
        flushParagraph();
        flushList();
        inCode = true;
        codeLanguage = codeFence[1] || "text";
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^-\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(unordered[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) {
    html.push(`<pre><code class="language-${escapeHtml(codeLanguage)}">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  flushParagraph();
  flushList();
  return html.join("\n");
}

function postDateParts(date) {
  const [year, month, day] = date.split("-");
  return { year, short: `${month}-${day}` };
}

function siteHeader(prefix = "") {
  const home = prefix ? `${prefix}index.html` : "#top";
  return `    <header class="site-header">
      <div class="wrap header-grid">
        <a class="brand" href="${home}" aria-label="回到首页">
          <span class="brand-mark" aria-hidden="true">∑</span>
          <span>
            <strong>MATRIX93</strong>
            <small>分享一些浅见，欢迎大家交流</small>
          </span>
        </a>
        <nav class="nav" aria-label="主导航">
          <a href="${prefix}index.html#articles"><span class="nav-cn">道法</span><br><span class="nav-en">Dao</span></a>
          <a href="${prefix}index.html#projects"><span class="nav-cn">想法</span><br><span class="nav-en">IDEA</span></a>
          <a href="${prefix}index.html#archive"><span class="nav-cn">做法</span><br><span class="nav-en">METHOD</span></a>
          <a href="${prefix}index.html#about"><span class="nav-cn">关于“我”</span><br><span class="nav-en">ME</span></a>
        </nav>
      </div>
    </header>`;
}

function documentShell({ title, description, cssPath, body, scriptPath }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="stylesheet" href="${cssPath}">
  </head>
  <body>
${body}
${scriptPath ? `    <script src="${scriptPath}"></script>\n` : ""}  </body>
</html>
`;
}

function postCard(post) {
  const date = postDateParts(post.date);
  return `          <article class="post">
            <div class="post-date">
              <span>${date.year}</span>
              <strong>${date.short}</strong>
            </div>
            <div class="post-body">
              <h3><a href="posts/${post.slug}.html">${escapeHtml(post.title)}</a></h3>
              <p>${escapeHtml(post.summary)}</p>
              <div class="meta">
                ${post.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("\n                ")}
                <span>${escapeHtml(post.readTime)}</span>
              </div>
            </div>
          </article>`;
}

function sidebar() {
  return `      <aside class="sidebar" aria-label="站点侧栏">
        <section class="profile">
          <div class="avatar" aria-hidden="true">
            <img src="assets/notebook.svg" alt="">
          </div>
          <h2>MATRIX93</h2>
          <p>研究、工程、写作。把零散想法整理成可以复查的公开记录。</p>
        </section>

        <section class="side-block">
          <h2>分类</h2>
          <ul class="tag-list">
            <li><a href="#">机器学习 <span>12</span></a></li>
            <li><a href="#">工程实践 <span>9</span></a></li>
            <li><a href="#">数学笔记 <span>7</span></a></li>
            <li><a href="#">读书摘记 <span>5</span></a></li>
          </ul>
        </section>

        <section class="side-block">
          <h2>检索</h2>
          <form class="search" role="search">
            <label class="sr-only" for="query">搜索文章</label>
            <input id="query" type="search" placeholder="关键词">
            <button type="submit">搜索</button>
          </form>
        </section>

        <section class="side-block">
          <h2>链接</h2>
          <ul class="links">
            <li><a href="https://kexue.fm/" target="_blank" rel="noreferrer">科学空间</a></li>
            <li><a href="https://pages.github.com/" target="_blank" rel="noreferrer">GitHub Pages</a></li>
            <li><a href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a></li>
          </ul>
        </section>
      </aside>`;
}

function buildIndex(posts) {
  const body = `${siteHeader()}

    <main id="top" class="wrap layout">
      <section class="content">
        <section id="articles" class="section" aria-labelledby="articles-title">
          <div class="section-head">
            <h2 id="articles-title">近期文章</h2>
            <a href="#archive">全部归档</a>
          </div>

${posts.map(postCard).join("\n\n")}
        </section>

        <section id="projects" class="section" aria-labelledby="projects-title">
          <div class="section-head">
            <h2 id="projects-title">项目</h2>
            <a href="https://github.com/" target="_blank" rel="noreferrer">更多代码</a>
          </div>
          <div class="project-list">
            <article class="project">
              <h3>MatrixWeb</h3>
              <p>这个仓库本身：Markdown 写作、无依赖构建、适合托管到 GitHub Pages。</p>
              <span>Markdown / HTML / CSS / GitHub Pages</span>
            </article>
            <article class="project">
              <h3>Research Notes</h3>
              <p>面向长期写作的笔记系统，按主题与时间组织，可从 Markdown 文章继续扩展。</p>
              <span>Writing / Archive / Review</span>
            </article>
          </div>
        </section>

        <section id="archive" class="section" aria-labelledby="archive-title">
          <h2 id="archive-title">归档</h2>
          <ol class="archive">
${posts.map((post) => `            <li><time datetime="${post.date}">${post.date}</time><a href="posts/${post.slug}.html">${escapeHtml(post.title)}</a></li>`).join("\n")}
          </ol>
        </section>

        <section id="about" class="section about" aria-labelledby="about-title">
          <h2 id="about-title">关于</h2>
          <p>
            在这里替换成你的简介：研究方向、工程经验、目前关注的问题、联系方式，以及你希望读者如何引用或联系你。
          </p>
          <dl>
            <div>
              <dt>Email</dt>
              <dd><a href="mailto:you@example.com">you@example.com</a></dd>
            </div>
            <div>
              <dt>GitHub</dt>
              <dd><a href="https://github.com/byin-cwi" target="_blank" rel="noreferrer">@byin-cwi</a></dd>
            </div>
            <div>
              <dt>RSS</dt>
              <dd><a href="#">/feed.xml</a></dd>
            </div>
          </dl>
        </section>
      </section>

${sidebar()}
    </main>

    <footer class="site-footer">
      <div class="wrap">
        <p>© 2026 MATRIX93. Built with Markdown, HTML, CSS and Git.</p>
      </div>
    </footer>
`;

  return documentShell({
    title: "MATRIX93 | 个人笔记与研究日志",
    description: "一个 Git 管理、GitHub Pages 可部署的个人网站，适合写研究笔记、技术文章、项目记录与读书摘记。",
    cssPath: "assets/styles.css",
    scriptPath: "assets/main.js",
    body,
  });
}

function buildPost(post) {
  const body = `${siteHeader("../")}

    <main id="top" class="wrap article-page">
      <article class="article section">
        <p class="article-date">${escapeHtml(post.date)}</p>
        <div class="article-content">
${markdownToHtml(post.markdown)}
        </div>
        <p class="article-back"><a href="../index.html#articles">返回文章列表</a></p>
      </article>
    </main>

    <footer class="site-footer">
      <div class="wrap">
        <p>© 2026 MATRIX93. Built with Markdown, HTML, CSS and Git.</p>
      </div>
    </footer>
`;

  return documentShell({
    title: `${post.title} | MATRIX93`,
    description: post.summary,
    cssPath: "../assets/styles.css",
    body,
  });
}

function readPosts() {
  return fs
    .readdirSync(contentDir)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const source = fs.readFileSync(path.join(contentDir, fileName), "utf8");
      const { data, markdown } = parseFrontMatter(source, fileName);
      return { ...data, markdown };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function main() {
  const posts = readPosts();
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir);
  }
  fs.writeFileSync(path.join(root, "index.html"), buildIndex(posts));
  for (const post of posts) {
    fs.writeFileSync(path.join(postsDir, `${post.slug}.html`), buildPost(post));
  }
  console.log(`Built ${posts.length} posts`);
}

main();
