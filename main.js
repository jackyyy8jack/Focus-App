const path = require('path');
const http = require('http');
const fs = require('fs');
const { app, BrowserWindow, ipcMain } = require('electron');

/* -------------------open app start------------------- */
let win;

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
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      const filePath = path.join(__dirname, urlPath);
      // 防止目錄穿越，只允許讀取專案資料夾內的檔案
      if (!filePath.startsWith(__dirname)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    // port 給 0 由系統自動配一個空閒的 port
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

app.on('ready', async () => {
  const port = await startServer();

  win = new BrowserWindow({
    fullscreen : true,
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