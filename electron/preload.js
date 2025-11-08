const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    getHistory: () => ipcRenderer.invoke('get-history'),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    connectVPN: (params) => ipcRenderer.invoke('connect-vpn', params),
    disconnectVPN: () => ipcRenderer.invoke('disconnect-vpn'),
    getVPNStatus: () => ipcRenderer.invoke('get-vpn-status'),
    onVPNStatus: (callback) => ipcRenderer.on('vpn-status', (event, data) => callback(data)),
    onVPNLog: (callback) => ipcRenderer.on('vpn-log', (event, data) => callback(data)),
    onVPNIP: (callback) => ipcRenderer.on('vpn-ip', (event, data) => callback(data)),
    onTrafficUpdate: (callback) => ipcRenderer.on('traffic-update', (event, data) => callback(data)),
    onVPNError: (callback) => ipcRenderer.on('vpn-error', (event, data) => callback(data)),
});
