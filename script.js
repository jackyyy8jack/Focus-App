/* -------------------關閉程式start------------------- */
function closeApp() {
  window.electronAPI.closeApp();
}
/* -------------------關閉程式end------------------- */


/* =================== 提示音效 start =================== */
// 番茄鐘 / 計時器結束時的鈴聲。兩者可分開開關，且最多只響 RING_SECONDS 秒。
const RING_SECONDS = 5;                 // 最多響幾秒（避免一直響）
const soundSettings = {
  tomato: localStorage.getItem("focus-sound-tomato") !== "off",
  timer: localStorage.getItem("focus-sound-timer") !== "off",
};
const SOUND_TARGET = {
  bell: "tomato",
  alarm: "timer",
};

const SOUNDS = {
  bell:  new Audio("sounds/bell.ogg"),   // 番茄鐘階段結束
  alarm: new Audio("sounds/alarm.ogg"),  // 計時器倒數結束
};
Object.values(SOUNDS).forEach(a => { a.preload = "auto"; a.volume = 0.8; });

let _ringStopTimer = null;

function playSound(name) {
  const target = SOUND_TARGET[name];
  if (target && !soundSettings[target]) return;
  const a = SOUNDS[name];
  if (!a) { beepFallback(); return; }
  try {
    clearTimeout(_ringStopTimer);
    a.pause();
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => beepFallback());
    // 最多響 RING_SECONDS 秒就自動停
    _ringStopTimer = setTimeout(() => { try { a.pause(); a.currentTime = 0; } catch (_) {} }, RING_SECONDS * 1000);
  } catch (_) {
    beepFallback();
  }
}

function stopSound() {
  clearTimeout(_ringStopTimer);
  Object.values(SOUNDS).forEach(a => { try { a.pause(); a.currentTime = 0; } catch (_) {} });
}

function setSoundEnabled(target, on) {
  soundSettings[target] = !!on;
  localStorage.setItem(`focus-sound-${target}`, soundSettings[target] ? "on" : "off");
  if (!soundSettings[target]) stopSound();
}

// 找不到音檔時的備援提示音（用 Web Audio 合成嗶聲）
function beepFallback() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
      t += 0.35;
    }
    setTimeout(() => ctx.close(), 1500);
  } catch (_) { /* 不支援就略過 */ }
}

// DOM 載入後分別綁定番茄鐘 / 計時器音效開關，並套用記住的狀態
document.addEventListener("DOMContentLoaded", () => {
  const tomatoSound = document.getElementById("tomato-sound");
  const timerSound = document.getElementById("timer-sound");
  if (tomatoSound) {
    tomatoSound.checked = soundSettings.tomato;
    tomatoSound.addEventListener("change", () => setSoundEnabled("tomato", tomatoSound.checked));
  }
  if (timerSound) {
    timerSound.checked = soundSettings.timer;
    timerSound.addEventListener("change", () => setSoundEnabled("timer", timerSound.checked));
  }
});
/* =================== 提示音效 end =================== */


/* -------------------只有一個選單存在start------------------- */
function closeAllMenus() {
  fadeOut();
  fadeOutClockMenu();
  fadeOutTomatoMenu();
  fadeOutSettingsPanel();
}
/* -------------------只有一個選單存在end------------------- */


/* -------------------右鍵選單start------------------- */
// 右鍵觸發選單
const menu = document.getElementById("custom-menu");
let fadeOutTimer = null;
let lastContextMenuPoint = { x: 18, y: 74 };
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
  lastContextMenuPoint = { x, y };
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

/* -------------------設定面板start------------------- */
const DEFAULT_WIDGET_SETTINGS = {
  tomato: "#f05d5d",
  stopwatch: "#b61db6",
  timer: "#2684c7",
  opacity: 28,
};

let widgetSettings = { ...DEFAULT_WIDGET_SETTINGS };

function loadWidgetSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("focus-widget-settings") || "{}");
    widgetSettings = { ...DEFAULT_WIDGET_SETTINGS, ...saved };
  } catch (_) {
    widgetSettings = { ...DEFAULT_WIDGET_SETTINGS };
  }
}

function saveWidgetSettings() {
  localStorage.setItem("focus-widget-settings", JSON.stringify(widgetSettings));
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.split("").map(ch => ch + ch).join("") : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function darkenHex(hex, amount = 0.28) {
  const { r, g, b } = hexToRgb(hex);
  const toHex = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r * (1 - amount))}${toHex(g * (1 - amount))}${toHex(b * (1 - amount))}`;
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyWidgetTheme(type, color) {
  const opacity = Math.max(0.15, Math.min(0.75, widgetSettings.opacity / 100));
  const dark = darkenHex(color);
  const targets = {
    tomato: ["tomato-widget", "drag-handle"],
    stopwatch: ["stopwatch-widget", "stopwatch-drag"],
    timer: ["timer-widget", "timer-drag"],
  };
  const [widgetId, headerId] = targets[type];
  const widget = document.getElementById(widgetId);
  const header = document.getElementById(headerId);
  if (widget) widget.style.backgroundColor = hexToRgba(color, opacity);
  if (header) header.style.backgroundColor = hexToRgba(dark, Math.min(opacity + 0.18, 0.9));
}

function applyWidgetSettings() {
  applyWidgetTheme("tomato", widgetSettings.tomato);
  applyWidgetTheme("stopwatch", widgetSettings.stopwatch);
  applyWidgetTheme("timer", widgetSettings.timer);
  const value = document.getElementById("setting-opacity-value");
  if (value) value.textContent = `${widgetSettings.opacity}%`;
}

function syncSettingsInputs() {
  const tomato = document.getElementById("setting-tomato-color");
  const stopwatch = document.getElementById("setting-stopwatch-color");
  const timer = document.getElementById("setting-timer-color");
  const opacity = document.getElementById("setting-widget-opacity");
  if (tomato) tomato.value = widgetSettings.tomato;
  if (stopwatch) stopwatch.value = widgetSettings.stopwatch;
  if (timer) timer.value = widgetSettings.timer;
  if (opacity) opacity.value = widgetSettings.opacity;
  applyWidgetSettings();
}

function placeFloatingPanel(panel) {
  const rect = panel.getBoundingClientRect();
  const margin = 12;
  const left = Math.max(margin, Math.min(window.innerWidth - rect.width - margin, lastContextMenuPoint.x));
  const top = Math.max(margin, Math.min(window.innerHeight - rect.height - margin, lastContextMenuPoint.y));
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function openSettingsPanel() {
  fadeOut();
  const panel = document.getElementById("settings-panel");
  if (!panel) return;
  syncSettingsInputs();
  panel.classList.add("show");
  panel.classList.remove("hiding");
  panel.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => placeFloatingPanel(panel));
}

function fadeOutSettingsPanel(callback) {
  const panel = document.getElementById("settings-panel");
  if (!panel || !panel.classList.contains("show")) return;
  panel.classList.remove("show");
  panel.classList.add("hiding");
  panel.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    panel.classList.remove("hiding");
    if (callback) callback();
  }, 120);
}

document.addEventListener("DOMContentLoaded", () => {
  loadWidgetSettings();
  syncSettingsInputs();
  const bindings = [
    ["setting-tomato-color", "tomato"],
    ["setting-stopwatch-color", "stopwatch"],
    ["setting-timer-color", "timer"],
  ];
  bindings.forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("input", () => {
      widgetSettings[key] = input.value;
      applyWidgetSettings();
      saveWidgetSettings();
    });
  });
  const opacity = document.getElementById("setting-widget-opacity");
  if (opacity) {
    opacity.addEventListener("input", () => {
      widgetSettings.opacity = Number(opacity.value);
      applyWidgetSettings();
      saveWidgetSettings();
    });
  }
  const close = document.getElementById("settings-close");
  if (close) close.addEventListener("click", () => fadeOutSettingsPanel());
});
/* -------------------設定面板end------------------- */




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
      playSound("bell");   // 階段結束鈴聲
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

function updateDisplay() {  //計時器時間設置
  const hh = String(Math.floor(remainingTime / 3600)).padStart(2, '0');
  const mm = String(Math.floor((remainingTime % 3600) / 60)).padStart(2, '0');
  const ss = String(remainingTime % 60).padStart(2, '0');
  document.getElementById('timer-display').textContent = `${hh}:${mm}:${ss}`;
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
  // const tomatoWidget = document.getElementById('tomato-widget');
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

  //------縮小番茄鐘圖標拖曳end------
}
//------縮小番茄鐘end------

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

//------番茄鐘輸入限制end------




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
  // const rect = tomatoWidget.getBoundingClientRect();
  originalTomatoSize.width = tomatoWidget.style.width;
  originalTomatoSize.height = tomatoWidget.style.height;
  isResizing = false;
});



//------縮放番茄鐘end------





/* -------------------番茄鐘end------------------- */


/* -------------------碼表start------------------- */
let stopwatchTimer = null;
let stopwatchSeconds = 0;
const stopwatchDisplay = document.getElementById("stopwatch-display");

function showStopwatch() {
  const widget = document.getElementById("stopwatch-widget");
  widget.style.display = "block";
  requestAnimationFrame(() => {
    widget.classList.add("show");
  });
}

function hideStopwatch() {
  const widget = document.getElementById("stopwatch-widget");
  widget.classList.remove("show");
  widget.classList.add("hide");
  setTimeout(() => {
    widget.classList.remove("hide");
    widget.style.display = "none";
  }, 300);
}



// ------碼表拖曳start------



const stopwatchWidget = document.getElementById('stopwatch-widget');
const stopwatchdrag = document.getElementById('stopwatch-drag');
const stopwatchIcon = document.getElementById('stopwatch-icon');

let stopwatch_isDragging = false;
let stopwatch_offsetX = 0;
let stopwatch_offsetY = 0;

stopwatchdrag.addEventListener('mousedown', (e) => {
  if (e.button != 0) return;
  stopwatch_isDragging = true;
  stopwatch_offsetX = e.clientX - stopwatchWidget.offsetLeft;
  stopwatch_offsetY = e.clientY - stopwatchWidget.offsetTop;
});

document.addEventListener('mousemove', (e) => {
  if (stopwatch_isDragging) {
    const stopwatchWidth = stopwatchWidget.offsetWidth;
    const stopwatchHeight = stopwatchWidget.offsetHeight;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;


    let stopwatch_newLeft = e.clientX - stopwatch_offsetX;
    let stopwatch_newTop = e.clientY - stopwatch_offsetY;


    stopwatch_newLeft = Math.max(0, Math.min(winWidth - stopwatchWidth, stopwatch_newLeft));
    stopwatch_newTop = Math.max(0, Math.min(winHeight - stopwatchHeight, stopwatch_newTop));

    stopwatchWidget.style.left = stopwatch_newLeft + "px";
    stopwatchWidget.style.top = stopwatch_newTop + 'px';
    // stopwatchWidget.style.transform = "none";

  }
});

document.addEventListener('mouseup', () => {
  stopwatch_isDragging = false;
});



// ------碼表拖曳end------

// ------碼表功能start------
function startStopwatch() {  //開始碼表
  if (stopwatchTimer) return;
  stopwatchTimer = setInterval(() => {
    stopwatchSeconds++;
    updateStopwatchDisplay();
  }, 1000);
}

function pauseStopwatch() {  //暫停碼表
  clearInterval(stopwatchTimer);
  stopwatchTimer = null;
}

function resetStopwatch() {  //重設碼表
  pauseStopwatch();
  stopwatchSeconds = 0;
  updateStopwatchDisplay();
}

function updateStopwatchDisplay() {  //碼表時間設置
  const hh = String(Math.floor(stopwatchSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((stopwatchSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(stopwatchSeconds % 60).padStart(2, "0");
  stopwatchDisplay.textContent = `${hh}:${mm}:${ss}`;
}

// ------碼表功能end------


//------碼表右鍵選單start------

// 右鍵觸發選單
const stopwatchMenu = document.getElementById("stopwatch-menu");

stopwatchWidget.addEventListener("contextmenu", function (e) {
  // const stopwatchWidget = document.getElementById('stopwatch-widget');
  const stopwatchIcon = document.getElementById('stopwatch-icon');

  // 如果點擊的是縮小碼表或圖示，就完全阻止右鍵
  if (
    stopwatchWidget.classList.contains('minimized') &&
    (stopwatchWidget.contains(e.target) || stopwatchIcon.contains(e.target))
  ) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  e.preventDefault();
  e.stopPropagation(); // 不讓事件冒泡觸發全域選單

  // 如果已經顯示，就先淡出後打開
  if (stopwatchMenu.classList.contains("show")) {
    fadeOutstopwatchMenu(() => {
      showstopwatchMenuAt(e.clientX, e.clientY);
    });
  } else {
    showstopwatchMenuAt(e.clientX, e.clientY);
  }
});

// 點擊畫面其他地方，關閉碼表選單
document.addEventListener("click", () => {
  fadeOutstopwatchMenu();
});


// 顯示碼表選單（含定位）
function showstopwatchMenuAt(x, y) {
  closeAllMenus();

  const stopwatchMenuWidth = stopwatchMenu.offsetWidth;
  const stopwatchMenuHeight = stopwatchMenu.offsetHeight;

  const rect = stopwatchWidget.getBoundingClientRect();
  const relativeX = x - rect.left;
  const relativeY = y - rect.top;

  const stopwatchWinW = stopwatchWidget.offsetWidth;
  const stopwatchWinH = stopwatchWidget.offsetHeight;

  const widget = document.getElementById("stopwatch-widget");
  const toggleBtn = document.getElementById("toggle-minimize-btn");

  const isMinimized = stopwatchWidget.classList.contains('minimized');
  // const snapBtn = document.getElementById('snap-to-edge-btn');

  const draghandle = document.getElementById('drag-handle');
  const stopwatchIcon = document.getElementById('stopwatch-icon');

  // 清除位置
  stopwatchMenu.style.left = '';
  stopwatchMenu.style.top = ''; 
  stopwatchMenu.style.right = '';
  stopwatchMenu.style.bottom = '';

  const stopwatchUseRight = relativeX > stopwatchWinW - stopwatchMenuWidth;
  const stopwatchUseBottom = relativeY > stopwatchWinH - stopwatchMenuHeight;

  if (stopwatchUseRight) {
    stopwatchMenu.style.right = `${stopwatchWinW - relativeX}px`;
  } else {
    stopwatchMenu.style.left = `${relativeX}px`;
  }

  if (stopwatchUseBottom) {
    stopwatchMenu.style.bottom = `${stopwatchWinH - relativeY}px`;
  } else {
    stopwatchMenu.style.top = `${relativeY}px`;
  }

  stopwatchMenu.style.position = 'absolute';

  stopwatchMenu.classList.add("show");
  stopwatchMenu.classList.remove("hiding");


  if (widget.classList.contains("minimized")) {
    toggleBtn.textContent = "放大番茄鐘 🔍";
    // draghandle.style.display = 'block';
    widget.style.display = 'block';
    // stopwatchIcon.style.display = 'none';
    hideOnLeaveEanbled = true;
  } else {
    toggleBtn.textContent = "縮小番茄鐘 🕛";
  }

}


function fadeOutstopwatchMenu(callback) {
  if (!stopwatchMenu.classList.contains("show")) return;
  stopwatchMenu.classList.remove("show");
  stopwatchMenu.classList.add("hiding");

  setTimeout(() => {
    stopwatchMenu.classList.remove("hiding");
    if (callback) callback();
  }, 100);
}

function resetStopwatchPosition(){
  stopwatchWidget.style.top = "100px";
  stopwatchWidget.style.left = "100px";
}
//------碼表右鍵選單end------

//------縮小碼表start------
document.getElementById('stopwatch-icon').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

function minimizeStopwatch() {
  const widget = document.getElementById('stopwatch-widget');
  const stopwatchIcon = document.getElementById('stopwatch-icon');
  const stopwatchdrag = document.getElementById('stopwatch-drag');
  const isNowMinimized = widget.classList.toggle('minimized');
  const rect = widget.getBoundingClientRect();
  
  let stopwatchIcon_isDragging = false;
  


  hideOnLeaveEanbled = isNowMinimized;

  if (isNowMinimized) {

    widget.classList.add('minimized');
    widget.style.removeProperty("width");
    widget.style.removeProperty("height");
    // const rect = widget.getBoundingClientRect();
    stopwatchIcon.style.display = 'block';
    stopwatchIcon.style.left = rect.left - stopwatchIcon.offsetWidth / 2 + "px";
    stopwatchIcon.style.top = rect.top - stopwatchIcon.offsetHeight / 2 + "px";
    stopwatchdrag.style.display = "";
    widget.style.display = "none";
  } else {
    widget.classList.remove('minimized');
    stopwatchIcon.style.display = 'none';
    stopwatchdrag.style.display = "block";
    widget.style.display = "block";
    

    // 修正 stopwatch-widget 避免超出螢幕
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
  
  stopwatchIcon.addEventListener('mouseenter', () => {
    if (stopwatchIcon_isDragging) return;
    widget.style.display = "block";
  });
  stopwatchIcon.addEventListener('mouseleave', () => {
    if (!hideOnLeaveEanbled || stopwatchIcon_isDragging) return;
    setTimeout(() => {
      if (!widget.matches(':hover') && !stopwatchIcon.matches(':hover')) {
        widget.style.display = "none";
      }
    }, 100);
  });
  widget.addEventListener('mouseleave', () => {
    if (!hideOnLeaveEanbled || stopwatchIcon_isDragging) return;
    setTimeout(() => {
      if (!widget.matches(':hover') && !stopwatchIcon.matches(':hover')) {
        widget.style.display = "none";
      }
    }, 100);
  });
  
   
  

  //------縮小碼表圖標拖曳start------
  
  let stopwatchIcon_offsetX = 0;
  let stopwatchIcon_offsetY = 0;

  stopwatchIcon.addEventListener('mousedown', (e) =>{
    if (e.button != 0) return;
    stopwatchIcon_isDragging = true;
    stopwatchIcon_offsetX = e.clientX - stopwatchIcon.offsetLeft;
    stopwatchIcon_offsetY = e.clientY - stopwatchIcon.offsetTop;
    
  });
  
  document.addEventListener('mousemove', (e) =>{
    if (stopwatchIcon_isDragging){
      const stopwatchIconWidth = widget.offsetWidth;
      const stopwatchIconHeight = widget.offsetHeight;
      const winWidth = window.innerWidth;
      const winHeight = window.innerHeight;

      let stopwatchIcon_newLeft = e.clientX - (stopwatchIcon_offsetX - stopwatchIcon.offsetWidth / 2);
      let stopwatchIcon_newTop = e.clientY - (stopwatchIcon_offsetY - stopwatchIcon.offsetHeight / 2);


      stopwatchIcon_newLeft = Math.max(0, Math.min(winWidth - stopwatchIconWidth, stopwatchIcon_newLeft));
      stopwatchIcon_newTop = Math.max(0, Math.min(winHeight - stopwatchIconHeight, stopwatchIcon_newTop));

      stopwatchIcon.style.left = stopwatchIcon_newLeft - stopwatchIcon.offsetWidth / 2 + "px";
      stopwatchIcon.style.top = stopwatchIcon_newTop - stopwatchIcon.offsetHeight / 2 + "px";
      widget.style.left = stopwatchIcon_newLeft + "px";
      widget.style.top = stopwatchIcon_newTop + "px";

      widget.style.display = "none";
    }
  });

  document.addEventListener('mouseup', () => {
    stopwatchIcon_isDragging = false;
  });

  //------縮小碼表圖標拖曳end------
}
//------縮小碼表end------

//------雙擊縮小、放大碼表start------

stopwatchIcon.addEventListener('dblclick', () => {
  stopwatchWidget.classList.remove('minimized');
  const sizeToRestore = rememberedSizeBeforeMinimize || originalstopwatchSize;

  stopwatchWidget.style.width = sizeToRestore.width + "px";
  stopwatchWidget.style.height = sizeToRestore.height + "px";

  stopwatchWidget.style.display = 'block';
  stopwatchIcon.style.display = 'none';
  stopwatchdrag.style.display = 'block';
  stopwatchdrag.style.display = "flex";
  hideOnLeaveEanbled = false;

  //修正放大後超出視窗
  requestAnimationFrame(() => {
    const rect = stopwatchWidget.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let left = parseFloat(stopwatchWidget.style.left) || rect.left;
    let top = parseFloat(stopwatchWidget.style.top) || rect.top;

    if (rect.right > winW) {
      left -= (rect.right - winW);
    }
    if (rect.bottom > winH) {
      top -= (rect.bottom - winH);
    }
    if (left < 0) left = 0;
    if (top < 0) top = 0;

    stopwatchWidget.style.left = left + "px";
    stopwatchWidget.style.top = top + "px";
  });
});

stopwatchdrag.addEventListener('dblclick', () => {
  const rect = stopwatchWidget.getBoundingClientRect();
    rememberedSizeBeforeMinimize = {
      width: rect.width,
      height: rect.height
    };
  minimizeStopwatch();
});
//------雙擊縮小、放大碼表end------



//------縮放碼表start------

const stopwatchResize = document.getElementById('stopwatch-resize');

let stopwatchIsResizing = false;
let stopwatchStartX, stopwatchStartY, stopwatchStartWidth, stopwatchStartHeight;

stopwatchResize.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  stopwatchIsResizing = true;
  stopwatchStartX = e.clientX;
  stopwatchStartY = e.clientY;
  stopwatchStartWidth = stopwatchWidget.offsetWidth;
  stopwatchStartHeight = stopwatchWidget.offsetHeight;

  
});

document.addEventListener('mousemove', (e) => {
  if (!stopwatchIsResizing) return;

  const stopwatchNewWidth = Math.max(346, stopwatchStartWidth + (e.clientX - stopwatchStartX));
  const stopwatchNewHeight = Math.max(263, stopwatchStartHeight + (e.clientY - stopwatchStartY));

  stopwatchWidget.style.width = `${stopwatchNewWidth}px`;
  stopwatchWidget.style.height = `${stopwatchNewHeight}px`;
});

document.addEventListener('mouseup', () => {
  // const rect = tomatoWidget.getBoundingClientRect();
  originalTomatoSize.width = tomatoWidget.style.width;
  originalTomatoSize.height = tomatoWidget.style.height;
  isResizing = false;
});



//------縮放碼表end------
/* -------------------碼表end------------------- */


/* =================== Lofi 音樂播放器 (YouTube 背景) start =================== */
/*
  曲目清單：背景影片同時也是音樂來源。
  以 Lofi Girl 的長期直播為主（多年穩定不下架）。
  想新增 / 更換，只要改下面的 id（YouTube 網址 watch?v= 後面那段）與 category 即可。
*/
const MUSIC_TRACKS = [
  { title: "Lofi Girl · lofi hip hop radio 📚",     id: "rFZHOHl-L8A", category: "lofigirl" },
  { title: "Lofi Girl · summer lofi radio ☀️",      id: "0muHFBSiybw", category: "lofigirl" },
  { title: "Lofi Girl · sleep lofi radio 🌌",       id: "VAlMDl00mYY", category: "lofigirl" },
  { title: "Lofi Girl · synth ambient radio 🌌",    id: "GSfT7H87zq4", category: "lofigirl" },
  { title: "Lofi Girl · Study With Me Pomodoro 📚", id: "qGohtGC5Rtk", category: "lofigirl" },
  { title: "Lofi Girl · sad lofi radio ☔",         id: "CwPCy1GLS38", category: "lofigirl" },
  { title: "Lofi Girl · asian lofi radio ⛩️",       id: "1Tl2FtV06qo", category: "lofigirl" },
  { title: "Lofi Girl · jazz lofi radio 🎷",        id: "E2vONfzoyRI", category: "lofigirl" },
  { title: "Lofi Girl · sleep/chill radio 💤",      id: "JD-kMIpDfnY", category: "lofigirl" },
  { title: "Lofi Girl · relaxing piano radio 🎹",   id: "N0snMcR6aaA", category: "lofigirl" },
  { title: "Lofi Girl · christmas lofi radio 🎄",   id: "XSXEaikz0Bc", category: "lofigirl" },
  { title: "Lofi Girl · classical music radio 🎻",  id: "jXAEIWcGXwE", category: "lofigirl" },
  { title: "Lofi Girl · relaxing jazz radio 🌹",    id: "A8jDx9TLMQc", category: "lofigirl" },
  { title: "Lofi Girl · Halloween lofi radio 🧟",   id: "3GQY80jyysQ", category: "lofigirl" },
  { title: "Lofi Girl · fireplace ambience 🔥",     id: "q_4KI-ChIIs", category: "lofigirl" },
  { title: "Lofi Girl · chill guitar radio 🎸",     id: "E_XmwjgRLz8", category: "lofigirl" },
  { title: "Lofi Girl · sleep ambient radio 💤",    id: "xORCbIptqcc", category: "lofigirl" },
  { title: "Lofi Girl · medieval lofi radio 🏰",    id: "IxPANmjPaek", category: "lofigirl" },
  { title: "Lofi Girl · gentle rain ambience 🌧",   id: "-OekvEFm1lo", category: "lofigirl" },
  { title: "Lofi Girl · dark ambient radio 🌃",     id: "S_MOd40zlYU", category: "lofigirl" },
  { title: "Lofi Girl · synthwave radio 🌌",        id: "4xDzrJKXOOY", category: "lofigirl" },
  { title: "Dream Airlines · dark cabin sleep",     id: "3vkOllGLWsk", category: "dreamairlines" },
  { title: "Dream Airlines · dark cabin 10 hours",  id: "3pe-Vm_eP78", category: "dreamairlines" },
  { title: "Dream Airlines · cabin ambience",       id: "lq9QttNtrQI", category: "dreamairlines" },
  { title: "Dream Airlines · overnight flight",     id: "LRp0Nc-YQZE", category: "dreamairlines" },
  { title: "Dream Airlines · first class sleep",    id: "dR4cu3-7VWU", category: "dreamairlines" },
  { title: "阿鮑Abao · Rainy Shibuya piano",       id: "5Q2Pc-e-8Qc", category: "abao" },
  { title: "阿鮑Abao · Rainy Shibuya rain sound",  id: "C1GghWN5UkU", category: "abao" },
  { title: "阿鮑Abao · Shibuya Pomodoro 25-5",     id: "0JvAPwUHLNk", category: "abao" },
  { title: "阿鮑Abao · Shibuya Crossing 50-10",    id: "LjRygr4xR7g", category: "abao" },
  { title: "空靈 · 432Hz 北歐雲海",                id: "SjeMHmMueLM", category: "ethereal" },
  { title: "空靈 · 432Hz 北歐冥想",                id: "WaNH_GQ9l_Q", category: "ethereal" },
  { title: "Best of lofi hip hop ✨ relax/study", id: "n61ULEU7CO0", category: "study" },
  { title: "1 A.M Study Session 📚",              id: "lTRiuFIWV54", category: "study" },
];

const MUSIC_CATEGORIES = [
  { key: "all",   label: "全部 ✨" },
  { key: "lofigirl", label: "Lofi Girl 👧" },
  { key: "dreamairlines", label: "Dream Airlines ✈️" },
  { key: "abao", label: "阿鮑Abao 🌧️" },
  { key: "ethereal", label: "空靈 🫧" },
  { key: "study", label: "Study 📚" },
];

const Music = (() => {
  let player = null;
  let ready = false;
  let currentIndex = 0;
  let loop = true;
  let muted = true;          // 為了自動播放先靜音，使用者一互動就解除
  let userUnmuted = false;
  let lastVolume = 50;
  let pollTimer = null;
  let seeking = false;

  // ----- DOM -----
  const el = {
    title:    document.getElementById("mp-title"),
    progress: document.getElementById("mp-progress"),
    current:  document.getElementById("mp-current"),
    duration: document.getElementById("mp-duration"),
    play:     document.getElementById("mp-play"),
    prev:     document.getElementById("mp-prev"),
    next:     document.getElementById("mp-next"),
    loop:     document.getElementById("mp-loop"),
    mute:     document.getElementById("mp-mute"),
    volume:   document.getElementById("mp-volume"),
    tracklist: document.getElementById("mp-tracklist"),
    categories: document.getElementById("mp-categories"),
  };

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  }

  // ----- YouTube API 載入 -----
  function init() {
    if (!document.getElementById("player")) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      // eslint-disable-next-line no-undef
      player = new YT.Player("player", {
        videoId: MUSIC_TRACKS[currentIndex].id,
        playerVars: {
          autoplay: 1, controls: 0, mute: 1, loop: 1,
          playlist: MUSIC_TRACKS[currentIndex].id,
          playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3,
          origin: window.location.origin,   // 配合 http://localhost 載入，避免嵌入被擋
        },
        events: {
          onReady: onReady,
          onStateChange: onStateChange,
          onError: onError,
        },
      });
      window._bgPlayer = player;
    };
  }

  function onReady(e) {
    ready = true;
    e.target.mute();
    e.target.setVolume(lastVolume);
    e.target.playVideo();
    el.volume.value = lastVolume;
    updateTrackList();
    startPolling();
  }

  function onStateChange(e) {
    // eslint-disable-next-line no-undef
    const YTS = YT.PlayerState;
    if (e.data === YTS.ENDED) {
      if (loop) player.seekTo(0), player.playVideo();
      else next();
    }
    updatePlayIcon();
  }

  // 影片無法播放（被下架、禁止嵌入、地區限制…）時，自動跳到下一首
  function onError(e) {
    console.warn("[Music] YouTube 播放錯誤 code:", e.data, "track:", MUSIC_TRACKS[currentIndex]);
    el.title.textContent = MUSIC_TRACKS[currentIndex].title + "（無法播放，跳下一首）";
    setTimeout(() => next(), 1200);
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!ready || seeking) return;
      try {
        const cur = player.getCurrentTime() || 0;
        const dur = player.getDuration() || 0;
        el.current.textContent = fmtTime(cur);
        // 直播的 duration 通常為 0，沒有有意義的進度條
        if (dur > 0 && isFinite(dur)) {
          el.duration.textContent = fmtTime(dur);
          el.progress.value = String(Math.round((cur / dur) * 1000));
          el.progress.disabled = false;
        } else {
          el.duration.textContent = "LIVE";
          el.progress.value = "0";
          el.progress.disabled = true;
        }
      } catch (_) { /* player 尚未就緒 */ }
    }, 500);
  }

  function updatePlayIcon() {
    if (!ready) return;
    // eslint-disable-next-line no-undef
    const playing = player.getPlayerState() === YT.PlayerState.PLAYING;
    el.play.textContent = playing ? "⏸" : "▶";
  }

  // ----- 控制 -----
  function ensureUnmuted() {
    // 首次互動後解除靜音，讓使用者真的聽得到
    if (!userUnmuted && ready) {
      userUnmuted = true;
      muted = false;
      player.unMute();
      player.setVolume(lastVolume);
      el.mute.textContent = "🔊";
    }
  }

  function togglePlay() {
    if (!ready) return;
    ensureUnmuted();
    // eslint-disable-next-line no-undef
    const playing = player.getPlayerState() === YT.PlayerState.PLAYING;
    if (playing) player.pauseVideo();
    else player.playVideo();
    setTimeout(updatePlayIcon, 150);
  }

  function loadIndex(i) {
    currentIndex = (i + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    const track = MUSIC_TRACKS[currentIndex];
    el.title.textContent = track.title;
    if (ready) {
      player.loadVideoById(track.id);
      if (muted) player.mute(); else { player.unMute(); player.setVolume(lastVolume); }
    }
    updateTrackList();
  }

  function next() { loadIndex(currentIndex + 1); }
  function prev() { loadIndex(currentIndex - 1); }

  function toggleLoop() {
    loop = !loop;
    el.loop.classList.toggle("active", loop);
  }

  function setVolume(v) {
    lastVolume = Number(v);
    if (!ready) return;
    ensureUnmuted();
    player.setVolume(lastVolume);
    if (lastVolume === 0) { muted = true; player.mute(); el.mute.textContent = "🔇"; }
    else { muted = false; player.unMute(); el.mute.textContent = lastVolume < 50 ? "🔉" : "🔊"; }
  }

  function toggleMute() {
    if (!ready) return;
    muted = !muted;
    if (muted) { player.mute(); el.mute.textContent = "🔇"; }
    else { userUnmuted = true; player.unMute(); player.setVolume(lastVolume || 50); el.mute.textContent = "🔊"; }
  }

  // ----- 曲目清單 / 分類 -----
  let activeCategory = "all";

  function renderCategories() {
    el.categories.innerHTML = "";
    MUSIC_CATEGORIES.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "mp-cat" + (cat.key === activeCategory ? " active" : "");
      btn.textContent = cat.label;
      btn.onclick = () => {
        activeCategory = cat.key;
        renderCategories();
        updateTrackList();
      };
      el.categories.appendChild(btn);
    });
  }

  function updateTrackList() {
    el.tracklist.innerHTML = "";
    MUSIC_TRACKS.forEach((track, i) => {
      if (activeCategory !== "all" && track.category !== activeCategory) return;
      const li = document.createElement("li");
      if (i === currentIndex) li.classList.add("playing");
      const dot = document.createElement("span");
      dot.className = "mp-track-dot";
      const span = document.createElement("span");
      span.textContent = track.title;
      li.appendChild(dot);
      li.appendChild(span);
      li.onclick = () => { loadIndex(i); ensureUnmuted(); player && player.playVideo(); };
      el.tracklist.appendChild(li);
    });
  }

  // ----- 自動停止 (sleep timer / 配合計時器) -----
  let sleepTimeout = null;
  let sleepCountdown = null;
  function setSleepTimer(minutes) {
    clearTimeout(sleepTimeout);
    clearInterval(sleepCountdown);
    const remainEl = document.getElementById("mp-sleep-remaining");
    if (!minutes || minutes <= 0) { remainEl.textContent = ""; return; }
    let endMs = minutes * 60 * 1000;
    const tick = () => {
      endMs -= 1000;
      if (endMs <= 0) { remainEl.textContent = ""; return; }
      remainEl.textContent = fmtTime(endMs / 1000) + " 後停止";
    };
    remainEl.textContent = fmtTime(minutes * 60) + " 後停止";
    sleepCountdown = setInterval(tick, 1000);
    sleepTimeout = setTimeout(() => {
      if (ready) player.pauseVideo();
      clearInterval(sleepCountdown);
      remainEl.textContent = "已停止 ⏹";
      updatePlayIcon();
    }, minutes * 60 * 1000);
  }

  // ----- 事件綁定 -----
  function bind() {
    el.play.onclick  = togglePlay;
    el.prev.onclick  = prev;
    el.next.onclick  = next;
    el.loop.onclick  = toggleLoop;
    el.mute.onclick  = toggleMute;
    el.volume.oninput = (e) => setVolume(e.target.value);

    // 進度條拖曳（直播時 disabled，不會觸發）
    el.progress.addEventListener("mousedown", () => { seeking = true; });
    el.progress.addEventListener("input", () => {
      if (!ready) return;
      const dur = player.getDuration();
      if (dur > 0 && isFinite(dur)) {
        el.current.textContent = fmtTime((el.progress.value / 1000) * dur);
      }
    });
    el.progress.addEventListener("change", () => {
      if (ready) {
        const dur = player.getDuration();
        if (dur > 0 && isFinite(dur)) player.seekTo((el.progress.value / 1000) * dur, true);
      }
      seeking = false;
    });

    document.getElementById("mp-sleep-timer").addEventListener("change", (e) => {
      setSleepTimer(Number(e.target.value));
    });

    // 首次任何互動就解除靜音，讓桌面一打開就能聽到（符合「在桌面顯示 + 聽音樂」）
    const unmuteOnce = () => { ensureUnmuted(); updatePlayIcon(); };
    document.addEventListener("pointerdown", unmuteOnce, { once: true });
    document.addEventListener("keydown", unmuteOnce, { once: true });

    el.title.textContent = MUSIC_TRACKS[currentIndex].title;
    renderCategories();
    updateTrackList();
  }

  bind();
  init();

  return { setSleepTimer, loadIndex, next, prev, togglePlay };
})();

/* ----- 音樂面板開關 ----- */
function toggleMusicPanel() {
  fadeOut();
  const panel = document.getElementById("music-panel");
  const bar = document.getElementById("music-player");
  const willShow = !panel.classList.contains("show");
  panel.classList.toggle("show", willShow);
  panel.setAttribute("aria-hidden", String(!willShow));
  if (willShow) requestAnimationFrame(() => placeFloatingPanel(panel));
  // 開啟面板時一併顯示底部控制列
  bar.classList.add("show");
  bar.setAttribute("aria-hidden", "false");
}

(function initMusicUI() {
  const toggle = document.getElementById("music-toggle");
  const panel = document.getElementById("music-panel");
  const header = panel.querySelector(".mp-panel-header");
  const closeBtn = document.getElementById("music-panel-close");
  const bar = document.getElementById("music-player");
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  // 預設顯示底部控制列（桌面常駐）
  bar.classList.add("show");
  bar.setAttribute("aria-hidden", "false");

  if (toggle) {
    toggle.addEventListener("click", (e) => { e.stopPropagation(); toggleMusicPanel(); });
    toggle.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); });
  }
  closeBtn.addEventListener("click", () => {
    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");
  });

  header.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    dragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    panel.classList.add("dragging");
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = panel.getBoundingClientRect();
    const margin = 8;
    const nextLeft = Math.max(margin, Math.min(window.innerWidth - rect.width - margin, e.clientX - offsetX));
    const nextTop = Math.max(margin, Math.min(window.innerHeight - rect.height - margin, e.clientY - offsetY));
    panel.style.left = `${nextLeft}px`;
    panel.style.top = `${nextTop}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove("dragging");
  });
})();
/* =================== Lofi 音樂播放器 end =================== */


/* =================== 計時器 (倒數) start =================== */
let countdownTotal = 5 * 60;   // 預設 5 分鐘
let countdownRemaining = countdownTotal;
let countdownTimer = null;

function showTimer() {
  const widget = document.getElementById("timer-widget");
  widget.style.display = "block";
  requestAnimationFrame(() => widget.classList.add("show"));
}

function hideTimer() {
  const widget = document.getElementById("timer-widget");
  widget.classList.remove("show");
  widget.classList.add("hide");
  setTimeout(() => {
    widget.classList.remove("hide");
    widget.style.display = "none";
  }, 300);
}

function readCountdownInputs() {
  const h = Math.min(23, Math.max(0, parseInt(document.getElementById("timer-h-input").value, 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(document.getElementById("timer-m-input").value, 10) || 0));
  const s = Math.min(59, Math.max(0, parseInt(document.getElementById("timer-s-input").value, 10) || 0));
  return h * 3600 + m * 60 + s;
}

function updateCountdownDisplay() {
  const hh = String(Math.floor(countdownRemaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((countdownRemaining % 3600) / 60)).padStart(2, "0");
  const ss = String(countdownRemaining % 60).padStart(2, "0");
  document.getElementById("countdown-display").textContent = `${hh}:${mm}:${ss}`;
}

function startCountdown() {
  if (countdownTimer) return;
  // 若顯示為 0 或剛重設，從輸入框重新讀取
  if (countdownRemaining <= 0) {
    countdownTotal = readCountdownInputs();
    countdownRemaining = countdownTotal;
  }
  if (countdownRemaining <= 0) return;
  document.getElementById("countdown-display").classList.remove("finished");
  countdownTimer = setInterval(() => {
    countdownRemaining--;
    updateCountdownDisplay();
    if (countdownRemaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      onCountdownFinished();
    }
  }, 1000);
}

function pauseCountdown() {
  clearInterval(countdownTimer);
  countdownTimer = null;
}

function resetCountdown() {
  pauseCountdown();
  countdownTotal = readCountdownInputs();
  countdownRemaining = countdownTotal;
  document.getElementById("countdown-display").classList.remove("finished");
  updateCountdownDisplay();
}

function onCountdownFinished() {
  document.getElementById("countdown-display").classList.add("finished");
  playSound("alarm");   // 倒數結束鈴聲（最多響 RING_SECONDS 秒，可在設定關閉）
}

// 輸入框即時套用，且限制為數字
["timer-h-input", "timer-m-input", "timer-s-input"].forEach(id => {
  const input = document.getElementById(id);
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "");
  });
  input.addEventListener("change", () => {
    if (!countdownTimer) resetCountdown();
  });
});

function resetTimerWidgetPosition() {
  const widget = document.getElementById("timer-widget");
  widget.style.top = "200px";
  widget.style.left = "200px";
}

const timerWidgetEl = document.getElementById("timer-widget");
const timerIcon = document.getElementById("timer-icon");
const timerDragHandle = document.getElementById("timer-drag");
let rememberedTimerSize = { width: 450, height: 350 };
let timerIconDragging = false;
let timerIconOffsetX = 0;
let timerIconOffsetY = 0;

function keepWidgetInViewport(widget) {
  requestAnimationFrame(() => {
    const rect = widget.getBoundingClientRect();
    let left = parseFloat(widget.style.left) || rect.left;
    let top = parseFloat(widget.style.top) || rect.top;
    if (rect.right > window.innerWidth) left -= rect.right - window.innerWidth;
    if (rect.bottom > window.innerHeight) top -= rect.bottom - window.innerHeight;
    widget.style.left = Math.max(0, left) + "px";
    widget.style.top = Math.max(0, top) + "px";
  });
}

function restoreTimerFromIcon() {
  timerWidgetEl.classList.remove("minimized");
  timerWidgetEl.style.width = rememberedTimerSize.width + "px";
  timerWidgetEl.style.height = rememberedTimerSize.height + "px";
  timerWidgetEl.style.display = "block";
  timerIcon.style.display = "none";
  timerDragHandle.style.display = "flex";
  keepWidgetInViewport(timerWidgetEl);
}

function minimizeTimer() {
  const isNowMinimized = timerWidgetEl.classList.toggle("minimized");
  const rect = timerWidgetEl.getBoundingClientRect();
  if (isNowMinimized) {
    rememberedTimerSize = { width: rect.width, height: rect.height };
    timerWidgetEl.style.removeProperty("width");
    timerWidgetEl.style.removeProperty("height");
    timerIcon.style.display = "flex";
    timerIcon.style.left = rect.left - timerIcon.offsetWidth / 2 + "px";
    timerIcon.style.top = rect.top - timerIcon.offsetHeight / 2 + "px";
    timerWidgetEl.style.display = "none";
  } else {
    restoreTimerFromIcon();
  }
}

timerIcon.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

timerIcon.addEventListener("dblclick", restoreTimerFromIcon);

timerIcon.addEventListener("mouseenter", () => {
  if (!timerWidgetEl.classList.contains("minimized") || timerIconDragging) return;
  timerWidgetEl.style.display = "block";
});

timerIcon.addEventListener("mouseleave", () => {
  if (!timerWidgetEl.classList.contains("minimized") || timerIconDragging) return;
  setTimeout(() => {
    if (!timerWidgetEl.matches(":hover") && !timerIcon.matches(":hover")) {
      timerWidgetEl.style.display = "none";
    }
  }, 100);
});

timerWidgetEl.addEventListener("mouseleave", () => {
  if (!timerWidgetEl.classList.contains("minimized") || timerIconDragging) return;
  setTimeout(() => {
    if (!timerWidgetEl.matches(":hover") && !timerIcon.matches(":hover")) {
      timerWidgetEl.style.display = "none";
    }
  }, 100);
});

timerIcon.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  timerIconDragging = true;
  timerIconOffsetX = e.clientX - timerIcon.offsetLeft;
  timerIconOffsetY = e.clientY - timerIcon.offsetTop;
});

document.addEventListener("mousemove", (e) => {
  if (!timerIconDragging) return;
  const iconLeft = Math.max(0, Math.min(window.innerWidth - timerIcon.offsetWidth, e.clientX - timerIconOffsetX));
  const iconTop = Math.max(0, Math.min(window.innerHeight - timerIcon.offsetHeight, e.clientY - timerIconOffsetY));
  timerIcon.style.left = iconLeft + "px";
  timerIcon.style.top = iconTop + "px";
  timerWidgetEl.style.left = iconLeft + "px";
  timerWidgetEl.style.top = iconTop + "px";
  timerWidgetEl.style.display = "none";
});

document.addEventListener("mouseup", () => {
  timerIconDragging = false;
});

timerDragHandle.addEventListener("dblclick", () => {
  const rect = timerWidgetEl.getBoundingClientRect();
  rememberedTimerSize = { width: rect.width, height: rect.height };
  minimizeTimer();
});

// ----- 計時器拖曳 -----
(function initTimerDrag() {
  const widget = document.getElementById("timer-widget");
  const handle = document.getElementById("timer-drag");
  let dragging = false, ox = 0, oy = 0;

  handle.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    ox = e.clientX - widget.offsetLeft;
    oy = e.clientY - widget.offsetTop;
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const w = widget.offsetWidth, h = widget.offsetHeight;
    let nl = Math.max(0, Math.min(window.innerWidth - w, e.clientX - ox));
    let nt = Math.max(0, Math.min(window.innerHeight - h, e.clientY - oy));
    widget.style.left = nl + "px";
    widget.style.top = nt + "px";
  });
  document.addEventListener("mouseup", () => { dragging = false; });

  // ----- 計時器右鍵選單 -----
  const timerMenu = document.getElementById("timer-menu");
  widget.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllMenus();
    const rect = widget.getBoundingClientRect();
    timerMenu.style.left = (e.clientX - rect.left) + "px";
    timerMenu.style.top = (e.clientY - rect.top) + "px";
    timerMenu.style.position = "absolute";
    timerMenu.classList.add("show");
    timerMenu.classList.remove("hiding");
  });
  document.addEventListener("click", () => {
    if (timerMenu.classList.contains("show")) {
      timerMenu.classList.remove("show");
      timerMenu.classList.add("hiding");
      setTimeout(() => timerMenu.classList.remove("hiding"), 100);
    }
  });

  // ----- 計時器縮放 -----
  const resize = document.getElementById("timer-resize");
  let rz = false, sx, sy, sw, sh;
  resize.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    rz = true; sx = e.clientX; sy = e.clientY;
    sw = widget.offsetWidth; sh = widget.offsetHeight;
  });
  document.addEventListener("mousemove", (e) => {
    if (!rz) return;
    widget.style.width = Math.max(300, sw + (e.clientX - sx)) + "px";
    widget.style.height = Math.max(240, sh + (e.clientY - sy)) + "px";
  });
  document.addEventListener("mouseup", () => { rz = false; });

  updateCountdownDisplay();
})();
/* =================== 計時器 (倒數) end =================== */

