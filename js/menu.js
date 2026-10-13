const menu = document.querySelector(".menu");

menu.addEventListener("click", (event) => {
  if (event.target.closest(".menu-panel a")) menu.open = false;
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !menu.open) return;
  menu.open = false;
  menu.querySelector("summary").focus();
});
