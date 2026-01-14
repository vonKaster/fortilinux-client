/**
 * Gestión del system tray (bandeja del sistema)
 */
const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const logger = require('../utils/logger');
const { isDev } = require('../config/paths');
const vpnState = require('../vpn/state');
const { getWindow } = require('../window/manager');

let tray = null;

/**
 * Obtiene la ruta del icono del tray según el estado
 * @param {string} status - Estado: 'connected', 'error', 'disconnected'
 * @returns {string|null} Ruta del icono o null si no se encuentra
 */
function getTrayIconPath(status) {
    let iconName;
    if (status === 'connected') {
        iconName = 'fortivpn-connected.png';
    } else if (status === 'error') {
        iconName = 'fortivpn-error.png';
    } else {
        iconName = 'fortivpn-disconnected.png';
    }
    
    if (isDev) {
        const devPath = path.join(__dirname, '..', '..', 'icons', iconName);
        if (fs.existsSync(devPath)) {
            logger.debug('Tray icon loaded:', iconName);
            return devPath;
        }
        logger.error('Tray icon not found:', devPath);
    } else {
        const possiblePaths = [
            path.join(process.resourcesPath, 'icons', iconName),
            path.join(app.getAppPath(), 'icons', iconName),
        ];
        
        for (const iconPath of possiblePaths) {
            if (fs.existsSync(iconPath)) {
                logger.debug('Tray icon loaded:', iconName);
                return iconPath;
            }
        }
        logger.error('Tray icon not found in any path:', iconName);
    }
    
    return null;
}

/**
 * Crea el system tray
 */
function createTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }

    try {
        const status = vpnState.vpnError ? 'error' : (vpnState.isConnected ? 'connected' : 'disconnected');
        const iconPath = getTrayIconPath(status);
        
        if (!iconPath) {
            logger.error('Tray icon path not found');
            return;
        }
        
        const icon = nativeImage.createFromPath(iconPath);
        
        if (icon.isEmpty()) {
            logger.error('Tray icon is empty:', iconPath);
            return;
        }
        
        tray = new Tray(icon);
        logger.info('Tray created with status:', status);
        
        updateTrayMenu();
        tray.setToolTip('FortiLinux Client');
        
        tray.on('click', () => {
            const window = getWindow();
            if (window) {
                window.isVisible() ? window.hide() : window.show();
            }
        });
    } catch (error) {
        logger.error('Failed to create tray:', error.message);
    }
}

/**
 * Actualiza el menú del tray
 */
function updateTrayMenu() {
    if (!tray) {
        createTray();
        return;
    }
    
    try {
        const status = vpnState.vpnError ? 'error' : (vpnState.isConnected ? 'connected' : 'disconnected');
        const iconPath = getTrayIconPath(status);
        if (iconPath) {
            const icon = nativeImage.createFromPath(iconPath);
            if (!icon.isEmpty()) {
                tray.setImage(icon);
                logger.debug('Tray icon updated:', status);
            }
        }
        
        const tooltip = vpnState.isConnected 
            ? `FortiLinux Client - Conectado${vpnState.assignedIP ? ' (' + vpnState.assignedIP + ')' : ''}`
            : 'FortiLinux Client - Desconectado';
        tray.setToolTip(tooltip);
        
        const contextMenu = Menu.buildFromTemplate([
            {
                label: vpnState.isConnected ? '● Conectado' : '○ Desconectado',
                enabled: false
            },
            ...(vpnState.assignedIP ? [{
                label: `IP: ${vpnState.assignedIP}`,
                enabled: false
            }] : []),
            { type: 'separator' },
            {
                label: 'Mostrar Ventana',
                click: () => {
                    const window = getWindow();
                    if (window) window.show();
                }
            },
            ...(vpnState.isConnected ? [{
                label: 'Desconectar VPN',
                click: () => {
                    const { disconnectVPN } = require('../vpn/connection');
                    disconnectVPN();
                }
            }] : []),
            { type: 'separator' },
            {
                label: 'Salir',
                click: () => {
                    app.isQuitting = true;
                    if (vpnState.isConnected) {
                        const { disconnectVPN } = require('../vpn/connection');
                        disconnectVPN();
                    }
                    app.quit();
                }
            }
        ]);
        
        tray.setContextMenu(contextMenu);
    } catch (error) {
        logger.error('Failed to update tray:', error.message);
    }
}

/**
 * Destruye el tray
 */
function destroyTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }
}

module.exports = {
    createTray,
    updateTrayMenu,
    destroyTray
};
