const searchForm = document.querySelector(".search");
const searchInput = document.querySelector("#query");
const posts = Array.from(document.querySelectorAll(".post"));

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim().toLowerCase();

  posts.forEach((post) => {
    const text = post.textContent.toLowerCase();
    post.hidden = Boolean(query) && !text.includes(query);
  });
});
