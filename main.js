const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
let win;

app.on('ready', () => {
  win = new BrowserWindow({
    fullscreen : true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile('index.html');
  // 開啟開發者工具（可選，方便調試）
  // win.webContents.openDevTools();
  ipcMain.on('close-app', () => {
    win.close();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});