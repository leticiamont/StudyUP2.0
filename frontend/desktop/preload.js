// preload.js
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ping: () => console.log('Electron está funcionando ✅')
});
