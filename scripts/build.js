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

function formatPublishedDate(date) {
  const [year, month, day] = date.split("-");
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[Number(month) - 1]} ${day}, ${year}`;
}

function groupPostsByYear(posts) {
  const groups = [];
  for (const post of posts) {
    const year = post.date.slice(0, 4);
    let group = groups.find((item) => item.year === year);
    if (!group) {
      group = { year, posts: [] };
      groups.push(group);
    }
    group.posts.push(post);
  }
  return groups;
}

function siteHeader(prefix = "") {
  const home = `${prefix}index.html`;
  return `    <header class="site-header">
      <div class="wrap header-grid">
        <a class="brand" href="${home}" aria-label="回到首页">Bojian Yin</a>
        <nav class="nav" aria-label="主导航">
          <a href="${prefix}index.html#publications">Publications</a>
          <a href="${prefix}index.html#blogs">Blogs</a>
          <a href="${prefix}index.html#miscs">Miscs</a>
          <a href="${prefix}index.html#cv">CV</a>
          <button class="theme-toggle" type="button" aria-label="Theme settings">⚙</button>
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

function blogEntry(post, prefix = "") {
  return `              <article class="blog-entry">
                <h3 class="blog-title"><a href="${prefix}posts/${post.slug}.html">${escapeHtml(post.title)}</a></h3>
                <p class="published"><span class="calendar-icon" aria-hidden="true">▣</span><strong>Published:</strong> <time datetime="${post.date}">${formatPublishedDate(post.date)}</time></p>
                <p class="blog-summary">${escapeHtml(post.summary)}</p>
              </article>`;
}

function blogGroups(posts, prefix = "") {
  return groupPostsByYear(posts)
    .map(
      (group) => `            <section class="blog-year-group" aria-labelledby="blogs-${group.year}">
              <h3 id="blogs-${group.year}" class="blog-year">${group.year}</h3>
${group.posts.map((post) => blogEntry(post, prefix)).join("\n")}
            </section>`
    )
    .join("\n");
}

function profileIcon(name) {
  const icons = {
    location: '<svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"></path><circle cx="12" cy="9" r="2.6"></circle></svg>',
    email: '<svg viewBox="0 0 24 24" role="img" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg>',
  };
  return icons[name] || "";
}

function sidebar(prefix = "") {
  return `      <aside class="sidebar" aria-label="站点侧栏">
        <section class="profile">
          <div class="avatar" aria-hidden="true">
            <img src="${prefix}assets/profile.jpg" alt="">
          </div>
          <h2>Bojian Yin</h2>
          <ul class="profile-links">
            <li><span class="profile-icon profile-icon-svg" aria-hidden="true">${profileIcon("location")}</span><span>Beijing, China</span></li>
            <li><span class="profile-icon profile-icon-svg" aria-hidden="true">${profileIcon("email")}</span><a href="mailto:yinbojian93@gmail.com">Email</a></li>
            <li><span class="profile-icon profile-icon-gh" aria-hidden="true">GH</span><a href="https://github.com/byin-cwi" target="_blank" rel="noreferrer">GitHub</a></li>
            <li><span class="profile-icon profile-icon-linkedin" aria-hidden="true">in</span><a href="https://www.linkedin.com/in/bojianyin" target="_blank" rel="noreferrer">LinkedIn</a></li>
            <li><span class="profile-icon" aria-hidden="true">CV</span><a href="${prefix}assets/cv_DM.pdf">CV</a></li>
          </ul>
        </section>
      </aside>`;
}

function buildIndex(posts) {
  const body = `${siteHeader()}

    <main id="top" class="wrap layout">
${sidebar()}
      <section class="content">
        <section id="about" class="section" aria-labelledby="about-title">
          <h1 id="about-title">About Me</h1>
          <p>
            I am Bojian Yin, an Associate Researcher at the Institute of Automation, Chinese Academy of Sciences.
            My research lies at the intersection of deep learning, brain-inspired intelligence, and foundational AI.
            I study the mathematical mechanisms that make intelligent learning efficient, adaptive, and robust.
          </p>
          <p>
            More broadly, I want to bring the efficiency and adaptability of biological intelligence to modern AI.
            Today's models learn slowly, forget what they have seen, and demand enormous resources; I search for the
            mathematical principles behind learning and reasoning that could let machines learn the way brains do,
            continually, efficiently, and robustly, and turn those principles into real algorithms and systems. This
            pursuit has led to two first-author papers in <em>Nature Machine Intelligence</em>.
          </p>
        </section>

        <section id="research" class="section" aria-labelledby="research-title">
          <h2 id="research-title">Research Interests</h2>
          <p>
            My research focuses on the mathematical and brain-inspired principles of learning, and on turning them into
            robust, generalizable algorithms for large language models and agentic systems. My work spans several
            interconnected areas:
          </p>
          <ul class="interest-list">
            <li><strong>Learning Algorithms Beyond Backpropagation.</strong> I develop local, online, and forward-mode learning rules that let large models train and adapt efficiently, including continual and test-time learning in dynamic environments. This line includes Forward Propagation Through Time and Stochastic Variational Propagation as scalable, biologically grounded alternatives to backpropagation.</li>
            <li><strong>Memory and Continual Inference.</strong> I study persistent and associative memory together with reset-free continual inference, enabling long-context LLMs and long-horizon agents to keep learning and reasoning over time without forgetting or restarting. See <em>Never Reset Again</em> for a mathematical framework for continual inference in recurrent models.</li>
            <li><strong>Efficient Sequence Modeling and Reasoning.</strong> I design efficient recurrent and state-space architectures for long-range sequence modeling, and adaptive inference-time computation that scales with problem difficulty. Recent work includes sparse selective-update RNNs for long-range modeling.</li>
            <li><strong>Mathematical Foundations of Learning and Generalization.</strong> A core theme across my research is understanding, mathematically, when and why these mechanisms learn and generalize, work that began in spiking and recurrent networks, including two papers in <em>Nature Machine Intelligence</em>, and now extends to generative and agentic AI.</li>
          </ul>
          <p>
            Feel free to reach out if you're interested in collaborating or just chatting about learning algorithms,
            brain-inspired AI, or LLMs and agents.
          </p>
        </section>

        <section id="publications" class="section" aria-labelledby="publications-title">
          <h2 id="publications-title">Publications</h2>
          <ol class="publication-list">
            <li>
              <strong>Accurate online training of dynamical spiking neural networks through Forward Propagation Through Time.</strong>
              B. Yin, F. Corradi, S. M. Bohte. <em>Nature Machine Intelligence</em>, 2023.
            </li>
            <li>
              <strong>Accurate and efficient time-domain classification with adaptive spiking recurrent neural networks.</strong>
              B. Yin, F. Corradi, S. M. Bohte. <em>Nature Machine Intelligence</em>, 2021.
            </li>
            <li>
              <strong>Efficient Sparse Selective-Update RNNs for Long-Range Sequence Modeling.</strong>
              B. Yin, F. Corradi. <em>arXiv preprint, under review</em>, 2026.
            </li>
            <li>
              <strong>Stochastic Variational Propagation: Local, Scalable and Efficient Alternative to Backpropagation.</strong>
              B. Yin, F. Corradi. <em>arXiv preprint, under review</em>, 2025.
            </li>
            <li>
              <strong>Using the structure of genome data in the design of deep neural networks for predicting amyotrophic lateral sclerosis from genotype.</strong>
              B. Yin, M. Balvert, R. A. van der Spek, B. E. Dutilh, S. M. Bohte, J. Veldink, A. Schonhuth. <em>Bioinformatics</em>, 2019.
            </li>
          </ol>
        </section>

        <section id="blogs" class="section blog-posts" aria-labelledby="blogs-title">
          <h2 id="blogs-title" class="blog-posts-title">Blog posts</h2>
${blogGroups(posts)}
        </section>

        <section id="miscs" class="section" aria-labelledby="miscs-title">
          <h2 id="miscs-title">Miscs</h2>
          <p>
            I have worked across academia, national research institutes, and neuromorphic hardware startups, with experience
            in algorithm design, mathematical modeling, FPGA and embedded deployment, SDK optimization, and interdisciplinary collaboration.
          </p>
        </section>

        <section id="cv" class="section" aria-labelledby="cv-title">
          <h2 id="cv-title">CV</h2>
          <p><a href="assets/cv_DM.pdf">Download CV</a>.</p>
        </section>
      </section>
    </main>

    <footer class="site-footer">
      <div class="wrap">
        <p>© 2026 Bojian Yin. Built with Markdown, HTML, CSS and Git.</p>
      </div>
    </footer>
`;

  return documentShell({
    title: "Bojian Yin | About Me",
    description: "Bojian Yin 的学术个人主页、研究笔记和博客归档。",
    cssPath: "assets/styles.css",
    scriptPath: "assets/main.js?v=academic-ui",
    body,
  });
}

function buildPost(post) {
  const body = `${siteHeader("../")}

    <main id="top" class="wrap layout article-layout">
${sidebar("../")}
      <article class="article section">
        <p class="article-date">${escapeHtml(post.date)}</p>
        <div class="article-content">
${markdownToHtml(post.markdown)}
        </div>
        <p class="article-back"><a href="../index.html#blogs">返回 Blogs</a></p>
      </article>
    </main>

    <footer class="site-footer">
      <div class="wrap">
        <p>© 2026 Bojian Yin. Built with Markdown, HTML, CSS and Git.</p>
      </div>
    </footer>
`;

  return documentShell({
    title: `${post.title} | Bojian Yin`,
    description: post.summary,
    cssPath: "../assets/styles.css",
    scriptPath: "../assets/main.js?v=academic-ui",
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
  for (const fileName of fs.readdirSync(postsDir)) {
    if (fileName.endsWith(".html")) {
      fs.unlinkSync(path.join(postsDir, fileName));
    }
  }
  fs.writeFileSync(path.join(root, "index.html"), buildIndex(posts));
  for (const post of posts) {
    fs.writeFileSync(path.join(postsDir, `${post.slug}.html`), buildPost(post));
  }
  console.log(`Built ${posts.length} posts`);
}

main();
