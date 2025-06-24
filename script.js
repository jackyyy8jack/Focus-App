/* -------------------關閉程式start------------------- */
function closeApp() {
  window.electronAPI.closeApp();
}
/* -------------------關閉程式end------------------- */


/* -------------------番茄鐘start------------------- */

function showTomato() {
  document.getElementById('tomato-widget').style.display = 'block';
  widget.style.left = '100px';
  widget.style.top = '100px';
}

function hideTomato() {
  document.getElementById('tomato-widget').style.display = 'none';
}


const widget = document.getElementById('tomato-widget');
const handle = document.getElementById('drag-handle');

let tomato_isDragging = false;
let tomato_offsetX = 0;
let tomato_offsetY = 0;

handle.addEventListener('mousedown', (e) => {
  tomato_isDragging = true;
  tomato_offsetX = e.clientX - widget.offsetLeft;
  tomato_offsetY = e.clientY - widget.offsetTop;
});

document.addEventListener('mousemove', (e) => {
  if (tomato_isDragging) {
    widget.style.left = (e.clientX - tomato_offsetX) + 'px';
    widget.style.top = (e.clientY - tomato_offsetY) + 'px';
  }
});

document.addEventListener('mouseup', () => {
  tomato_isDragging = false;
});

/* -------------------番茄鐘end------------------- */

/* -------------------只有一個選單存在start------------------- */
function closeAllMenus() {
  fadeOut();
  fadeOutClockMenu();
  // 以後還可以 fadeOutMoreMenus();
}
/* -------------------只有一個選單存在end------------------- */


/* -------------------右鍵選單start------------------- */
// 右鍵觸發選單
const menu = document.getElementById("custom-menu");
let fadeOutTimer = null;
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
  closeAllMenus();
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
/* -------------------右鍵選單end------------------- */




/* -------------------時鐘start------------------- */


// ------時鐘拖曳start------
const clock = document.getElementById("clock");
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

clock.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  isDragging = true;
  
  const computedStyle = window.getComputedStyle(clock);
  if (computedStyle.transform.includes("matrix")){
    const rect = clock.getBoundingClientRect();
    clock.style.top = rect.top = "px";
    clock.style.left = rect.left + "px";
    clock.style.transform = "none";
  }
  offsetX = e.clientX - clock.offsetLeft;
  offsetY = e.clientY - clock.offsetTop;
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const clockWidth = clock.offsetWidth;
    const clockHeight = clock.offsetHeight;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    // 計算未限制的目標位置
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;

    // 左右邊界限制
    newLeft = Math.max(0, Math.min(winWidth - clockWidth, newLeft));
    // 上下邊界限制
    newTop = Math.max(0, Math.min(winHeight - clockHeight, newTop));

    clock.style.left = newLeft + "px";
    clock.style.top = newTop + "px";
    clock.style.transform = "none";
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});
// ------時鐘拖曳end------


// ------時鐘時間start------
function updateTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  document.getElementById("hour").textContent = hh;
  document.getElementById("minute").textContent = mm;
}
setInterval(updateTime, 1000);
updateTime(); // 先執行一次以避免空白
// ------時鐘時間end------


// ------時鐘右鍵選單start------
const clockMenu = document.getElementById("clock-menu");

// 點擊時鐘右鍵出現時鐘選單
clock.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  e.stopPropagation(); // 防止冒泡觸發全局選單

  // 如果已顯示，就先淡出再打開
  if (clockMenu.classList.contains("show")) {
    fadeOutClockMenu(() => {
      showClockMenuAt(e.clientX, e.clientY);
    });
  } else {
    showClockMenuAt(e.clientX, e.clientY);
  }
});
// 點其他地方關閉時鐘選單
document.addEventListener("click", function () {
  fadeOutClockMenu();
});

// 顯示時鐘選單
function showClockMenuAt(x, y) {
  closeAllMenus();
  clockMenu.style.left = x + "px";
  clockMenu.style.top = y + "px";
  clockMenu.classList.add("show");
  clockMenu.classList.remove("hiding");
}

// 淡出時鐘選單
function fadeOutClockMenu(callback) {
  if (!clockMenu.classList.contains("show")) return;
  clockMenu.classList.remove("show");
  clockMenu.classList.add("hiding");

  setTimeout(() => {
    clockMenu.classList.remove("hiding");
    if (callback) callback();
  }, 200);
}

// 還原時鐘位置
function resetClockPosition() {
  clock.style.left = "50%";
  clock.style.top = "60px";
  clock.style.transform = "translateX(-50%)";
}

// ------時鐘右鍵選單end------
/* -------------------時鐘end------------------- */