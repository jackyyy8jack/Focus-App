
const { contextBridge, ipcRenderer } = require('electron');

//暴露一個安全 API 到前端
contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app'),  //關閉程式
  openTomato: () => ipcRenderer.send('open-tomato-window')  //番茄鐘視窗
});
