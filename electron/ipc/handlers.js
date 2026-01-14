/**
 * Handlers IPC (Inter-Process Communication)
 */
const { ipcMain } = require('electron');
const logger = require('../utils/logger');
const { loadConfig, saveConfig, loadHistory, saveHistory } = require('../config/storage');
const { connectVPN, disconnectVPN, cancelConnection } = require('../vpn/connection');
const vpnState = require('../vpn/state');

/**
 * Registra todos los handlers IPC
 */
function registerIpcHandlers() {
    // Config handlers
    ipcMain.handle('get-config', () => loadConfig());
    
    ipcMain.handle('save-config', (event, config) => {
        saveConfig(config);
        return true;
    });
    
    // History handlers
    ipcMain.handle('get-history', () => loadHistory());
    
    ipcMain.handle('clear-history', () => {
        saveHistory([]);
        return true;
    });
    
    // VPN handlers
    ipcMain.handle('connect-vpn', async (event, params) => {
        try {
            const result = await connectVPN({
                server: params.server,
                port: params.port,
                username: params.username,
                password: params.password,
                trustedCert: params.trustedCert,
                connectionName: params.connectionName,
                autoTrustCert: params.autoTrustCert
            });
            return { success: true, message: result };
        } catch (error) {
            logger.error('Error al conectar:', error);
            return { success: false, message: error };
        }
    });
    
    ipcMain.handle('disconnect-vpn', () => {
        const message = disconnectVPN();
        return { success: true, message };
    });
    
    ipcMain.handle('cancel-connection', () => {
        return cancelConnection();
    });
    
    ipcMain.handle('get-vpn-status', () => {
        const duration = vpnState.connectionStartTime 
            ? Math.floor((Date.now() - vpnState.connectionStartTime) / 1000) 
            : 0;
        return { 
            connected: vpnState.isConnected,
            ip: vpnState.assignedIP,
            duration,
            bytesReceived: vpnState.bytesReceived,
            bytesSent: vpnState.bytesSent
        };
    });
}

module.exports = {
    registerIpcHandlers
};
