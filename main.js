const { app, BrowserWindow } = require('electron');
let win;

app.on('ready', () => {
  win = new BrowserWindow({fullscreen : true});
  win.loadFile('index.html');
  // 開啟開發者工具（可選，方便調試）
  // win.webContents.openDevTools();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});