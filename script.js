/* -------------------關閉程式start------------------- */
function closeApp() {
  window.electronAPI.closeApp();
}
/* -------------------關閉程式end------------------- */


/* -------------------只有一個選單存在start------------------- */
function closeAllMenus() {
  fadeOut();
  fadeOutClockMenu();
  fadeOutTomatoMenu();
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



/* -------------------番茄鐘start------------------- */




function showTomato() {
  document.getElementById('tomato-widget').style.display = 'block';
  const collapseBall = document.getElementById('collapse-trigger');
  collapseBall.style.display = 'block';
  collapseBall.style.left = '108px';
  collapseBall.style.top = '108px';
  tomatoWidget.style.left = '100px';
  tomatoWidget.style.top = '100px';
}

function hideTomato() {
  document.getElementById('tomato-widget').style.display = 'none';
  document.getElementById('collapse-trigger').style.display = 'none';
}

// ------番茄鐘拖曳start------



const tomatoWidget = document.getElementById('tomato-widget');
const handle = document.getElementById('drag-handle');

let tomato_isDragging = false;
let tomato_offsetX = 0;
let tomato_offsetY = 0;

handle.addEventListener('mousedown', (e) => {
  if (e.button != 0) return;
  tomato_isDragging = true;
  tomato_offsetX = e.clientX - tomatoWidget.offsetLeft;
  tomato_offsetY = e.clientY - tomatoWidget.offsetTop;
});

document.addEventListener('mousemove', (e) => {
  if (tomato_isDragging) {
    const tomatoWidth = tomatoWidget.offsetWidth;
    const tomatoHeight = tomatoWidget.offsetHeight;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const snapMargin = 20;   //番茄鐘吸附畫面邊緣


    let tomato_newLeft = e.clientX - tomato_offsetX;
    let tomato_newTop = e.clientY - tomato_offsetY;

   // 吸附左邊
   if (tomato_newLeft < snapMargin) {
    tomato_newLeft = 0;
  }

  // 吸附右邊
  if (winWidth - (tomato_newLeft + tomatoWidth) < snapMargin) {
    tomato_newLeft = winWidth - tomatoWidth;
  }

  // 吸附上邊
  if (tomato_newTop < snapMargin) {
    tomato_newTop = 0;
  }

  // 吸附下邊
  if (winHeight - (tomato_newTop + tomatoHeight) < snapMargin) {
    tomato_newTop = winHeight - tomatoHeight;
  }

    tomato_newLeft = Math.max(0, Math.min(winWidth - tomatoWidth, tomato_newLeft));
    tomato_newTop = Math.max(0, Math.min(winHeight - tomatoHeight, tomato_newTop));

    tomatoWidget.style.left = tomato_newLeft + "px";
    tomatoWidget.style.top = tomato_newTop + 'px';
    tomatoWidget.style.transformOrigin = `${collapseBall.offsetLeft - tomato_newLeft}px ${collapseBall.offsetTop - tomato_newTop}px`;
    // tomatoWidget.style.transform = "none";

    collapseBall.style.top = (tomato_newTop + 8) + 'px';
    collapseBall.style.left = (tomato_newLeft + 8) + 'px';

  }
});

document.addEventListener('mouseup', () => {
  tomato_isDragging = false;
});



// ------番茄鐘拖曳end------

// ------番茄鐘功能start------

let workDuration = 25 * 60; // 秒
let restDuration = 5 * 60;  // 秒
let remainingTime = workDuration;
let isWorking = true;       // true: 工作階段, false: 休息
let timer = null;

function startTimer() {
  if (timer) return;
  timer = setInterval(() => {
    if (remainingTime <= 0) {
      clearInterval(timer);
      timer = null;
      isWorking = !isWorking;
      remainingTime = isWorking ? workDuration : restDuration;
      updatePhaseText();
      startTimer(); // 自動切換並繼續
    } else {
      remainingTime--;
      updateDisplay();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
  timer = null;
}

function resetTimer() {
  pauseTimer();
  remainingTime = isWorking ? workDuration : restDuration;
  updateDisplay();
}

function updateDisplay() {
  const mm = String(Math.floor(remainingTime / 60)).padStart(2, '0');
  const ss = String(remainingTime % 60).padStart(2, '0');
  document.getElementById('timer-display').textContent = `${mm}:${ss}`;
}

function updatePhaseText() {
  document.getElementById('tomato-phase').textContent = isWorking ? "工作中 🍅" : "休息中 💤";
}

function applySettings() {
  const work = parseInt(document.getElementById('work-input').value);
  const rest = parseInt(document.getElementById('rest-input').value);
  workDuration = work * 60;
  restDuration = rest * 60;
  resetTimer();
}


// ------番茄鐘功能end------


//------番茄鐘右鍵選單start------

// 右鍵觸發選單
const tomatoMenu = document.getElementById("tomato-menu");

tomatoWidget.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  e.stopPropagation(); // 不讓事件冒泡觸發全域選單

  // 如果已經顯示，就先淡出後打開
  if (tomatoMenu.classList.contains("show")) {
    fadeOutTomatoMenu(() => {
      showTomatoMenuAt(e.clientX, e.clientY);
    });
  } else {
    showTomatoMenuAt(e.clientX, e.clientY);
  }
});

// 點擊畫面其他地方，關閉番茄鐘選單
document.addEventListener("click", () => {
  fadeOutTomatoMenu();
});


// 顯示番茄選單（含定位）
function showTomatoMenuAt(x, y) {
  closeAllMenus();

  const tomatoMenuWidth = tomatoMenu.offsetWidth;
  const tomatoMenuHeight = tomatoMenu.offsetHeight;

  const rect = tomatoWidget.getBoundingClientRect();
  const relativeX = x - rect.left;
  const relativeY = y - rect.top;

  const tomatoWinW = tomatoWidget.offsetWidth;
  const tomatoWinH = tomatoWidget.offsetHeight;

  // 清除位置
  tomatoMenu.style.left = '';
  tomatoMenu.style.top = '';
  tomatoMenu.style.right = '';
  tomatoMenu.style.bottom = '';

  const tomatoUseRight = relativeX > tomatoWinW - tomatoMenuWidth;
  const tomatoUseBottom = relativeY > tomatoWinH - tomatoMenuHeight;

  if (tomatoUseRight) {
    tomatoMenu.style.right = `${tomatoWinW - relativeX}px`;
  } else {
    tomatoMenu.style.left = `${relativeX}px`;
  }

  if (tomatoUseBottom) {
    tomatoMenu.style.bottom = `${tomatoWinH - relativeY}px`;
  } else {
    tomatoMenu.style.top = `${relativeY}px`;
  }

  tomatoMenu.style.position = 'absolute';
  tomatoWidget.appendChild(tomatoMenu);

  tomatoMenu.classList.add("show");
  tomatoMenu.classList.remove("hiding");
}


function fadeOutTomatoMenu(callback) {
  if (!tomatoMenu.classList.contains("show")) return;
  tomatoMenu.classList.remove("show");
  tomatoMenu.classList.add("hiding");

  setTimeout(() => {
    tomatoMenu.classList.remove("hiding");
    if (callback) callback();
  }, 200);
}

function resetTomatoClockPosition(){
  tomatoWidget.style.top = "100px";
  tomatoWidget.style.left = "100px";
}
//------番茄鐘右鍵選單end------


//------番茄鐘圓球start------

const collapseBall = document.getElementById("collapse-trigger");

let ballIsDragging = false;
let ballOffsetX = 0;
let ballOffsetY = 0;

collapseBall.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return; // 限制只有左鍵可以拖曳
  tomatoWidget.classList.add("collapsed");
  ballIsDragging = true;
  ballOffsetX = e.clientX - collapseBall.offsetLeft;
  ballOffsetY = e.clientY - collapseBall.offsetTop;

  //鎖定滑鼠捕捉
  collapseBall.setPointerCapture(e.pointerId);
});

collapseBall.addEventListener("pointermove", (e) => {
  if (ballIsDragging) {
    const newBallLeft = e.clientX - ballOffsetX;
    const newBallTop = e.clientY - ballOffsetY;

    // 移動小球本身
    collapseBall.style.left = newBallLeft + "px";
    collapseBall.style.top = newBallTop + "px";

    // 移動番茄鐘（偏移小球位置 8px）
    tomatoWidget.style.left = (newBallLeft - 8) + "px";
    tomatoWidget.style.top = (newBallTop - 8) + "px";
  }
});

document.addEventListener("pointerup", () => {
  ballIsDragging = false;
  tomatoWidget.classList.remove("collapsed");
});

function resetTomatoClockPosition(){
  tomatoWidget.style.top = "100px";
  tomatoWidget.style.left = "100px";
  collapseBall.style.top = "108px";
  collapseBall.style.left = "108px";
}

//------番茄鐘圓球end------


/* -------------------番茄鐘end------------------- */




