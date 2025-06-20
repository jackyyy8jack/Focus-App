const menu = document.getElementById("custom-menu");
let fadeOutTimer = null;

// 右鍵觸發選單
document.addEventListener("contextmenu", function (e) {
  e.preventDefault();

  // 如果已顯示，就先淡出再打開
  if (menu.classList.contains("show")) {
    fadeOut(() => {
      showMenuAt(e.clientX, e.clientY);
    });
  } else {
    showMenuAt(e.clientX, e.clientY);
  }
});

// 點其他地方則關閉選單
document.addEventListener("click", function () {
  fadeOut();
});

// 顯示選單（含定位）
function showMenuAt(x, y) {
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  // 清除位置
  menu.style.left = '';
  menu.style.top = '';
  menu.style.right = '';
  menu.style.bottom = '';

  const useRight = x > winW - menuWidth;
  const useBottom = y > winH - menuHeight;

  if (useRight) {
    menu.style.right = `${winW - x}px`;
  } else {
    menu.style.left = `${x}px`;
  }

  if (useBottom) {
    menu.style.bottom = `${winH - y}px`;
  } else {
    menu.style.top = `${y}px`;
  }

  menu.classList.add("show");
  menu.classList.remove("hiding"); // 確保淡入時不是淡出的狀態
}

// 淡出選單，並可在淡出後執行 callback
function fadeOut(callback) {
  if (!menu.classList.contains("show")) return; // 沒顯示就不動作

  menu.classList.remove("show");
  menu.classList.add("hiding");

  clearTimeout(fadeOutTimer); // 保險：避免重複觸發
  fadeOutTimer = setTimeout(() => {
    menu.classList.remove("hiding");
    if (callback) callback(); // 執行開啟新選單
  }, 100); // 與 CSS transition 時間一致 (0.2s)
}
