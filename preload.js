const { contextBridge, ipcRenderer } = require('electron');

//暴露一個安全 API 到前端
contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app')
});
