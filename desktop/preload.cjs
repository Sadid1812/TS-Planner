const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tsDesktop',{notify:title=>ipcRenderer.send('notify',String(title))});
