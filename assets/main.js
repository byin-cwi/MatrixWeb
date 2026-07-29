const themeToggle = document.querySelector(".theme-toggle");
const storedTheme = window.localStorage.getItem("theme");

function setTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  themeToggle?.setAttribute("aria-pressed", String(isDark));
}

setTheme(storedTheme === "dark" ? "dark" : "light");

themeToggle?.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("theme-dark") ? "light" : "dark";
  window.localStorage.setItem("theme", nextTheme);
  setTheme(nextTheme);
});
