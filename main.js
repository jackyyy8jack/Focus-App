const path = require('path');
const http = require('http');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { createBackgroundMedia } = require('./background-media');

/* -------------------open app start------------------- */
let win;
let backgroundMedia;
let preferences = {};
let preferencesFile;

/*
  修正 YouTube 嵌入 Error 152 / 153：
  file:// 沒有合法的 http origin，YouTube 嵌入會被擋。
  解法：用 Node 內建 http 開一個只綁定 127.0.0.1 的本機伺服器來提供頁面，
  讓視窗以 http://localhost 載入 —— 這樣就有正常的 http 來源，YouTube 會正常播放。
*/
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.ogg':  'audio/ogg',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ttf':  'font/ttf',
};
const PUBLIC_FILES = new Set([
  'index.html', 'script.js', 'styles.css', 'tomato.png', 'stopwatch.png',
  'sounds/bell.ogg', 'sounds/alarm.ogg',
  'fonts/NotoSansTC-VF.ttf',
]);

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405); res.end(); return;
      }
      let urlPath;
      try { urlPath = decodeURIComponent((req.url || '/').split('?')[0]); }
      catch (_) { res.writeHead(400); res.end('Bad request'); return; }
      const mediaMatch = /^\/background-media\/([0-9a-f-]{36})$/i.exec(urlPath);
      if (mediaMatch) { backgroundMedia.serve(req, res, mediaMatch[1]); return; }
      const asset = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
      if (!PUBLIC_FILES.has(asset)) { res.writeHead(404); res.end('Not found'); return; }
      const filePath = path.join(__dirname, asset);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(req.method === 'HEAD' ? undefined : data);
      });
    });
    // port 給 0 由系統自動配一個空閒的 port
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

app.on('ready', async () => {
  const dataDirectory = app.getPath('userData');
  preferencesFile = path.join(dataDirectory, 'preferences.json');
  try { preferences = JSON.parse(fs.readFileSync(preferencesFile, 'utf8')) || {}; }
  catch (_) { preferences = {}; }
  backgroundMedia = createBackgroundMedia(dataDirectory);

  ipcMain.on('settings-get', (event, key) => {
    event.returnValue = typeof key === 'string' && /^focus-[\w-]+$/.test(key) &&
      typeof preferences[key] === 'string' ? preferences[key] : null;
  });
  ipcMain.on('settings-set', (event, key, value) => {
    if (typeof key !== 'string' || !/^focus-[\w-]+$/.test(key) ||
        typeof value !== 'string' || value.length > 1000000) {
      event.returnValue = false; return;
    }
    preferences[key] = value;
    try {
      fs.mkdirSync(dataDirectory, { recursive: true });
      fs.writeFileSync(preferencesFile + '.tmp', JSON.stringify(preferences), 'utf8');
      fs.renameSync(preferencesFile + '.tmp', preferencesFile);
      event.returnValue = true;
    } catch (_) { event.returnValue = false; }
  });
  ipcMain.handle('background-library', (event) => {
    if (event.sender !== win.webContents) throw new Error('Unexpected window');
    return backgroundMedia.list();
  });
  ipcMain.handle('background-choose', async (event, kind) => {
    if (event.sender !== win.webContents || !['images', 'video'].includes(kind)) throw new Error('Invalid selection');
    const result = await dialog.showOpenDialog(win, {
      title: kind === 'images' ? '選擇背景照片' : '選擇背景影片',
      properties: kind === 'images' ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: kind === 'images'
        ? [{ name: '圖片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
        : [{ name: '影片', extensions: ['mp4', 'webm', 'ogg'] }],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return kind === 'images'
      ? backgroundMedia.replaceImages(result.filePaths)
      : backgroundMedia.replaceVideo(result.filePaths[0]);
  });

  const port = await startServer();

  win = new BrowserWindow({
    fullscreen: process.env.FOCUS_APP_SMOKE !== '1',
    show: process.env.FOCUS_APP_SMOKE !== '1',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // 允許 lofi 背景音樂在開啟時自動播放（含聲音），不需使用者先互動
      autoplayPolicy: 'no-user-gesture-required'
    }
  });
  win.loadURL(`http://localhost:${port}`);
  // 開啟開發者工具（可選，方便調試）
  // win.webContents.openDevTools();
  ipcMain.on('close-app', () => {
    win.close();
  });
});
/* -------------------open app end------------------- */

/* -------------------番茄鐘 start------------------- */
/* -------------------番茄鐘 end------------------- */


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
