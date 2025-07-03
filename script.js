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
let hideOnLeaveEanbled = true;  
let originalTomatoSize = { width: 450, height: 350 };
let rememberedSizeBeforeMinimize = null;



function showTomato() {
  const widget = document.getElementById('tomato-widget');
  widget.style.display = 'block';    
  widget.classList.remove('hiding');
  requestAnimationFrame(() => {
    widget.classList.add('show');
  });
}

function hideTomato() {
  const widget = document.getElementById('tomato-widget');
  widget.classList.remove('show');
  widget.classList.add('hiding');
  // 等動畫跑完再完全隱藏
  setTimeout(() => {
    widget.classList.remove('hiding');
  }, 300); // 和 transition 時間一致
}

// ------番茄鐘拖曳start------



const tomatoWidget = document.getElementById('tomato-widget');
const draghandle = document.getElementById('drag-handle');
const tomatoIcon = document.getElementById('tomato-icon');

let tomato_isDragging = false;
let tomato_offsetX = 0;
let tomato_offsetY = 0;

draghandle.addEventListener('mousedown', (e) => {
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


    let tomato_newLeft = e.clientX - tomato_offsetX;
    let tomato_newTop = e.clientY - tomato_offsetY;


    tomato_newLeft = Math.max(0, Math.min(winWidth - tomatoWidth, tomato_newLeft));
    tomato_newTop = Math.max(0, Math.min(winHeight - tomatoHeight, tomato_newTop));

    tomatoWidget.style.left = tomato_newLeft + "px";
    tomatoWidget.style.top = tomato_newTop + 'px';
    // tomatoWidget.style.transform = "none";

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

function startTimer() {  //開始計時器
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

function pauseTimer() {  //暫停計時器
  clearInterval(timer);
  timer = null;
}

function resetTimer() {  //重製計時器
  pauseTimer();
  remainingTime = isWorking ? workDuration : restDuration;
  updateDisplay();
}

function updateDisplay() {  //計時器時間設定
  const mm = String(Math.floor(remainingTime / 60)).padStart(2, '0');
  const ss = String(remainingTime % 60).padStart(2, '0');
  document.getElementById('timer-display').textContent = `${mm}:${ss}`;
}

function updatePhaseText() {  //顯示工作or休息
  document.getElementById('tomato-phase').textContent = isWorking ? "工作中 🍅" : "休息中 💤";
}

function applySettings() {  //套用設定
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
  const tomatoWidget = document.getElementById('tomato-widget');
  const tomatoIcon = document.getElementById('tomato-icon');

  // 如果點擊的是縮小番茄鐘或圖示，就完全阻止右鍵
  if (
    tomatoWidget.classList.contains('minimized') &&
    (tomatoWidget.contains(e.target) || tomatoIcon.contains(e.target))
  ) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
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

  const widget = document.getElementById("tomato-widget");
  const toggleBtn = document.getElementById("toggle-minimize-btn");

  const isMinimized = tomatoWidget.classList.contains('minimized');
  // const snapBtn = document.getElementById('snap-to-edge-btn');

  const draghandle = document.getElementById('drag-handle');
  const tomatoIcon = document.getElementById('tomato-icon');

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

  tomatoMenu.classList.add("show");
  tomatoMenu.classList.remove("hiding");


  if (widget.classList.contains("minimized")) {
    toggleBtn.textContent = "放大番茄鐘 🔍";
    // draghandle.style.display = 'block';
    widget.style.display = 'block';
    // tomatoIcon.style.display = 'none';
    hideOnLeaveEanbled = true;
  } else {
    toggleBtn.textContent = "縮小番茄鐘 🕛";
  }

}


function fadeOutTomatoMenu(callback) {
  if (!tomatoMenu.classList.contains("show")) return;
  tomatoMenu.classList.remove("show");
  tomatoMenu.classList.add("hiding");

  setTimeout(() => {
    tomatoMenu.classList.remove("hiding");
    if (callback) callback();
  }, 100);
}

function resetTomatoClockPosition(){
  tomatoWidget.style.top = "100px";
  tomatoWidget.style.left = "100px";
}
//------番茄鐘右鍵選單end------

//------縮小番茄鐘start------
document.getElementById('tomato-icon').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

function minimizeTomato() {
  const widget = document.getElementById('tomato-widget');
  const tomatoIcon = document.getElementById('tomato-icon');
  const draghandle = document.getElementById('drag-handle');
  const isNowMinimized = widget.classList.toggle('minimized');
  const rect = widget.getBoundingClientRect();
  
  let tomatoIcon_isDragging = false;
  


  hideOnLeaveEanbled = isNowMinimized;

  if (isNowMinimized) {

    widget.classList.add('minimized');
    widget.style.removeProperty("width");
    widget.style.removeProperty("height");
    // const rect = widget.getBoundingClientRect();
    tomatoIcon.style.display = 'block';
    tomatoIcon.style.left = rect.left - tomatoIcon.offsetWidth / 2 + "px";
    tomatoIcon.style.top = rect.top - tomatoIcon.offsetHeight / 2 + "px";
    draghandle.style.display = "";
    widget.style.display = "none";
  } else {
    widget.classList.remove('minimized');
    tomatoIcon.style.display = 'none';
    draghandle.style.display = "block";
    widget.style.display = "block";
    

    // 修正 widget 避免超出螢幕
    requestAnimationFrame(() => {
      const rect = widget.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let left = parseFloat(widget.style.left) || rect.left;
      let top = parseFloat(widget.style.top) || rect.top;

      if (rect.right > winW) {
        left -= (rect.right - winW);
      }
      if (rect.bottom > winH) {
        top -= (rect.bottom - winH);
      }
      if (left < 0) left = 0;
      if (top < 0) top = 0;

      widget.style.left = left + "px";
      widget.style.top = top + "px";

      

    });
  }
  
  tomatoIcon.addEventListener('mouseenter', () => {
    if (tomatoIcon_isDragging) return;
    widget.style.display = "block";
  });
  tomatoIcon.addEventListener('mouseleave', () => {
    if (!hideOnLeaveEanbled || tomatoIcon_isDragging) return;
    setTimeout(() => {
      if (!widget.matches(':hover') && !tomatoIcon.matches(':hover')) {
        widget.style.display = "none";
      }
    }, 100);
  });
  widget.addEventListener('mouseleave', () => {
    if (!hideOnLeaveEanbled || tomatoIcon_isDragging) return;
    setTimeout(() => {
      if (!widget.matches(':hover') && !tomatoIcon.matches(':hover')) {
        widget.style.display = "none";
      }
    }, 100);
  });
  
   
  

  //------縮小番茄鐘圖標拖曳start------
  
  let tomatoIcon_offsetX = 0;
  let tomatoIcon_offsetY = 0;

  tomatoIcon.addEventListener('mousedown', (e) =>{
    if (e.button != 0) return;
    tomatoIcon_isDragging = true;
    tomatoIcon_offsetX = e.clientX - tomatoIcon.offsetLeft;
    tomatoIcon_offsetY = e.clientY - tomatoIcon.offsetTop;
    
  });
  
  document.addEventListener('mousemove', (e) =>{
    if (tomatoIcon_isDragging){
      const tomatoIconWidth = widget.offsetWidth;
      const tomatoIconHeight = widget.offsetHeight;
      const winWidth = window.innerWidth;
      const winHeight = window.innerHeight;

      let tomatoIcon_newLeft = e.clientX - (tomatoIcon_offsetX - tomatoIcon.offsetWidth / 2);
      let tomatoIcon_newTop = e.clientY - (tomatoIcon_offsetY - tomatoIcon.offsetHeight / 2);


      tomatoIcon_newLeft = Math.max(0, Math.min(winWidth - tomatoIconWidth, tomatoIcon_newLeft));
      tomatoIcon_newTop = Math.max(0, Math.min(winHeight - tomatoIconHeight, tomatoIcon_newTop));

      tomatoIcon.style.left = tomatoIcon_newLeft - tomatoIcon.offsetWidth / 2 + "px";
      tomatoIcon.style.top = tomatoIcon_newTop - tomatoIcon.offsetHeight / 2 + "px";
      widget.style.left = tomatoIcon_newLeft + "px";
      widget.style.top = tomatoIcon_newTop + "px";

      widget.style.display = "none";
    }
  });

  document.addEventListener('mouseup', () => {
    tomatoIcon_isDragging = false;
  });
}
//------縮小番茄鐘圖標拖曳end------

//------雙擊縮小、放大番茄鐘start------


tomatoIcon.addEventListener('dblclick', () => {
  tomatoWidget.classList.remove('minimized');
  const sizeToRestore = rememberedSizeBeforeMinimize || originalTomatoSize;

  tomatoWidget.style.width = sizeToRestore.width + "px";
  tomatoWidget.style.height = sizeToRestore.height + "px";

  tomatoWidget.style.display = 'block';
  tomatoIcon.style.display = 'none';
  draghandle.style.display = 'block';
  draghandle.style.display = "flex";
  hideOnLeaveEanbled = false;

  //修正放大後超出視窗
  requestAnimationFrame(() => {
    const rect = tomatoWidget.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let left = parseFloat(tomatoWidget.style.left) || rect.left;
    let top = parseFloat(tomatoWidget.style.top) || rect.top;

    if (rect.right > winW) {
      left -= (rect.right - winW);
    }
    if (rect.bottom > winH) {
      top -= (rect.bottom - winH);
    }
    if (left < 0) left = 0;
    if (top < 0) top = 0;

    tomatoWidget.style.left = left + "px";
    tomatoWidget.style.top = top + "px";
  });
});

draghandle.addEventListener('dblclick', () => {
  const rect = tomatoWidget.getBoundingClientRect();
    rememberedSizeBeforeMinimize = {
      width: rect.width,
      height: rect.height
    };
  minimizeTomato();
});
//------雙擊縮小、放大番茄鐘end------

//------番茄鐘輸入限制start------
document.querySelectorAll('.tomato-settings input').forEach(input => {
  input.addEventListener('input', () => {
    // 移除非數字或小數點（只留整數）
    input.value = input.value.replace(/[^0-9]/g, '');
  });
});

document.getElementById('apply-btn').addEventListener('click', () => {
  const work = parseInt(document.getElementById('work-duration').value, 10);
  const rest = parseInt(document.getElementById('break-duration').value, 10);

  if (isNaN(work) || isNaN(rest)) {
    alert('請輸入有效的整數');
    return;
  }
});

//------番茄鐘輸入限制end------

//------縮小番茄鐘end------



//------縮放番茄鐘start------

const resizeHandle = document.getElementById('resize-handle');

let isResizing = false;
let startX, startY, startWidth, startHeight;

resizeHandle.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  isResizing = true;
  startX = e.clientX;
  startY = e.clientY;
  startWidth = tomatoWidget.offsetWidth;
  startHeight = tomatoWidget.offsetHeight;

  
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;

  const newWidth = Math.max(346, startWidth + (e.clientX - startX));
  const newHeight = Math.max(263, startHeight + (e.clientY - startY));

  tomatoWidget.style.width = `${newWidth}px`;
  tomatoWidget.style.height = `${newHeight}px`;
});

document.addEventListener('mouseup', () => {
  const rect = tomatoWidget.getBoundingClientRect();
  originalTomatoSize.width = tomatoWidget.style.width;
  originalTomatoSize.height = tomatoWidget.style.height;
  isResizing = false;
});



//------縮放番茄鐘end------





/* -------------------番茄鐘end------------------- */




