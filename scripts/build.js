const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content", "posts");
const postsDir = path.join(root, "posts");
const siteUrl = "https://bojianyin.github.io";

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
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function imageBlock(alt, src) {
  const classes = ["article-figure"];
  if (/(network|time|equation|scaling|internal|external|unfolding)/i.test(src)) {
    classes.push("article-figure-wide");
  }
  if (/unfolding/i.test(src)) {
    classes.push("article-figure-light");
  }
  return `<figure class="${classes.join(" ")}"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"></figure>`;
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
  data.section = data.section || "blog";
  return { data, markdown: match[2].trim() };
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = null;
  let table = null;
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

  const tableCells = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const isTableSeparator = (line) =>
    tableCells(line).every((cell) => /^:?-{3,}:?$/.test(cell));

  const flushTable = () => {
    if (!table) return;
    if (table.active) {
      const header = table.headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("");
      const rows = table.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`)
        .join("");
      html.push(`<div class="article-table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`);
    } else {
      paragraph.push(table.original);
    }
    table = null;
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
      flushTable();
      continue;
    }

    if (/^\|.+\|$/.test(line.trim())) {
      flushParagraph();
      flushList();
      if (!table) {
        table = { headers: tableCells(line), rows: [], active: false, original: line.trim() };
        continue;
      }
      if (!table.active && isTableSeparator(line)) {
        table.active = true;
        continue;
      }
      if (table.active) {
        table.rows.push(tableCells(line));
        continue;
      }
    } else {
      flushTable();
    }

    if (/^-{3,}$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushTable();
      html.push("<hr>");
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      flushList();
      flushTable();
      html.push(imageBlock(image[1], image[2]));
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushTable();
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
  flushTable();
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

function formatCitationDate(date) {
  const [year, month, day] = date.split("-");
  const months = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
  return `${months[Number(month) - 1]} ${day}, ${year}`;
}

function formatPostNumber(number) {
  return String(number).padStart(2, "0");
}

function citationKey(post) {
  return `matrixweb-${post.slug}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function citationBlock(post) {
  const url = `${siteUrl}/posts/${post.slug}.html`;
  const prompt = post.section === "idea" ? "如果您需要引用本文，请参考：" : "If you need to cite this post, please use:";
  const citationPrefix = `Bojian Yin. (${formatCitationDate(post.date)}). ${post.title} [Blog post]. Retrieved from `;
  const bibtexMonth = formatCitationDate(post.date).split(" ")[0].replace(".", "");
  const bibtex = `@online{${citationKey(post)},
        title={${post.title}},
        author={Bojian Yin},
        year={${post.date.slice(0, 4)}},
        month={${bibtexMonth}},
        url={\\url{${url}}},
}`;

  return `        <section class="citation-box" aria-labelledby="citation-title-${escapeHtml(post.slug)}">
          <h2 id="citation-title-${escapeHtml(post.slug)}">Citation</h2>
          <p>${escapeHtml(prompt)}</p>
          <p class="citation-text">${escapeHtml(citationPrefix)}<a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
          <pre class="citation-bibtex"><code>${escapeHtml(bibtex)}</code></pre>
        </section>`;
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
          <a href="${prefix}index.html#blogs">Blog</a>
          <a href="${prefix}index.html#ideas">想法</a>
          <a href="${prefix}index.html#miscs">Miscs</a>
          <a href="${prefix}index.html#cv">CV</a>
          <button class="theme-toggle" type="button" aria-label="切换主题">
            <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.2 14.4A8.2 8.2 0 0 1 9.6 3.8a8.2 8.2 0 1 0 10.6 10.6Z"></path></svg>
            <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"></circle><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"></path></svg>
          </button>
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

function sectionLabel(section) {
  return section === "idea" ? "想法" : "Blog";
}

function blogEntry(post, prefix = "") {
  return `              <article class="blog-entry">
                <div class="blog-title-row">
                  <div class="post-number" aria-label="${escapeHtml(sectionLabel(post.section))} number ${post.sectionNumber}">${escapeHtml(sectionLabel(post.section))} ${formatPostNumber(post.sectionNumber)}</div>
                  <h3 class="blog-title"><a href="${prefix}posts/${post.slug}.html">${escapeHtml(post.title)}</a></h3>
                </div>
                <p class="published"><strong>Published:</strong> <time datetime="${post.date}">${formatPublishedDate(post.date)}</time></p>
                <p class="blog-summary">${escapeHtml(post.summary)}</p>
              </article>`;
}

function blogGroups(posts, prefix = "", groupPrefix = "blogs") {
  if (!posts.length) {
    return `            <p class="empty-list">No posts yet.</p>`;
  }
  return groupPostsByYear(posts)
    .map(
      (group) => `            <section class="blog-year-group" aria-labelledby="${groupPrefix}-${group.year}">
              <h3 id="${groupPrefix}-${group.year}" class="blog-year">${group.year}</h3>
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
  const displayOrder = (a, b) => b.date.localeCompare(a.date) || b.sectionNumber - a.sectionNumber;
  const blogPosts = posts.filter((post) => post.section === "blog").sort(displayOrder);
  const ideaPosts = posts.filter((post) => post.section === "idea").sort(displayOrder);
  const body = `${siteHeader()}

    <main id="top" class="wrap layout">
${sidebar()}
      <section class="content">
        <section id="about" class="section" aria-labelledby="about-title">
          <h1 id="about-title">About Me</h1>
          <p>
            I am Bojian Yin, an Associate Professor at the Institute of Automation, Chinese Academy of Sciences.
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
              <span class="pub-title">Accurate online training of dynamical spiking neural networks through Forward Propagation Through Time.</span>
              <span class="pub-meta"><strong>B. Yin</strong>, F. Corradi, S. M. Bohte. <em>Nature Machine Intelligence</em>, 2023.</span>
            </li>
            <li>
              <span class="pub-title">Accurate and efficient time-domain classification with adaptive spiking recurrent neural networks.</span>
              <span class="pub-meta"><strong>B. Yin</strong>, F. Corradi, S. M. Bohte. <em>Nature Machine Intelligence</em>, 2021.</span>
            </li>
            <li>
              <span class="pub-title">Efficient Sparse Selective-Update RNNs for Long-Range Sequence Modeling.</span>
              <span class="pub-meta"><strong>B. Yin</strong>, F. Corradi. <em>arXiv preprint, under review</em>, 2026.</span>
            </li>
            <li>
              <span class="pub-title">Stochastic Variational Propagation: Local, Scalable and Efficient Alternative to Backpropagation.</span>
              <span class="pub-meta"><strong>B. Yin</strong>, F. Corradi. <em>arXiv preprint, under review</em>, 2025.</span>
            </li>
            <li>
              <span class="pub-title">Using the structure of genome data in the design of deep neural networks for predicting amyotrophic lateral sclerosis from genotype.</span>
              <span class="pub-meta"><strong>B. Yin</strong>, M. Balvert, R. A. van der Spek, B. E. Dutilh, S. M. Bohte, J. Veldink, A. Schonhuth. <em>Bioinformatics</em>, 2019.</span>
            </li>
          </ol>
        </section>

        <section id="blogs" class="section blog-posts" aria-labelledby="blogs-title">
          <h2 id="blogs-title" class="blog-posts-title">Blog</h2>
${blogGroups(blogPosts, "", "blogs")}
        </section>

        <section id="ideas" class="section blog-posts" aria-labelledby="ideas-title">
          <h2 id="ideas-title" class="blog-posts-title">想法</h2>
${blogGroups(ideaPosts, "", "ideas")}
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
    cssPath: "assets/styles.css?v=academic-polish",
    scriptPath: "assets/main.js?v=academic-polish",
    body,
  });
}

function buildPost(post) {
  const returnHash = post.section === "idea" ? "ideas" : "blogs";
  const returnLabel = post.section === "idea" ? "返回想法" : "返回 Blog";
  const body = `${siteHeader("../")}

    <main id="top" class="wrap layout article-layout">
      <article class="article section">
        <div class="post-number post-number-page">${escapeHtml(sectionLabel(post.section))} ${formatPostNumber(post.sectionNumber)}</div>
        <p class="article-date">${escapeHtml(post.date)}</p>
        <div class="article-content">
${markdownToHtml(post.markdown)}
        </div>
${citationBlock(post)}
        <p class="article-back"><a href="../index.html#${returnHash}">← ${returnLabel}</a></p>
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
    cssPath: "../assets/styles.css?v=academic-polish",
    scriptPath: "../assets/main.js?v=academic-polish",
    body,
  });
}

function readPosts() {
  return fs
    .readdirSync(contentDir)
    .sort()
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const source = fs.readFileSync(path.join(contentDir, fileName), "utf8");
      const { data, markdown } = parseFrontMatter(source, fileName);
      return { ...data, markdown };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

function assignSectionNumbers(posts) {
  const sections = new Map();
  for (const post of posts) {
    if (!sections.has(post.section)) {
      sections.set(post.section, []);
    }
    sections.get(post.section).push(post);
  }

  for (const sectionPosts of sections.values()) {
    sectionPosts
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug))
      .forEach((post, index) => {
        post.sectionNumber = index + 1;
      });
  }
}

function main() {
  const posts = readPosts();
  assignSectionNumbers(posts);
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
