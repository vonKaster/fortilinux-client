/**
 * Gestión del ciclo de vida de la aplicación
 */
const { app } = require('electron');
const logger = require('../utils/logger');
const { createWindow, getWindow } = require('../window/manager');
const { createTray, destroyTray } = require('../tray/manager');
const { disconnectVPN } = require('../vpn/connection');
const vpnState = require('../vpn/state');

/**
 * Configura los eventos del ciclo de vida de la aplicación
 */
function setupAppLifecycle() {
    // Prevenir múltiples instancias
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        app.quit();
        return;
    }

    app.on('second-instance', () => {
        const window = getWindow();
        if (window) {
            if (window.isMinimized()) window.restore();
            window.show();
            window.focus();
        }
    });

    app.whenReady().then(() => {
        logger.info('FortiLinux Client starting...');
        logger.info('Mode:', require('../config/paths').isDev ? 'development' : 'production');
        createWindow();
        createTray();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            // Keep running in system tray
        }
    });

    app.on('activate', () => {
        if (getWindow() === null) {
            createWindow();
        } else {
            const window = getWindow();
            if (window) window.show();
        }
    });

    app.on('before-quit', () => {
        app.isQuitting = true;
        if (vpnState.isConnected) {
            disconnectVPN();
        }
        destroyTray();
    });
}

module.exports = {
    setupAppLifecycle
};
