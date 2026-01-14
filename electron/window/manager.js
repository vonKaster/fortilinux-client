/**
 * Gestión de la ventana principal de la aplicación
 */
const { BrowserWindow } = require('electron');
const path = require('path');
const { app } = require('electron');
const logger = require('../utils/logger');
const { isDev } = require('../config/paths');

let mainWindow = null;

/**
 * Crea la ventana principal de la aplicación
 * @returns {BrowserWindow} Instancia de la ventana
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        frame: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '..', 'preload.js')
        },
        show: false,
        backgroundColor: '#ffffff'
    });

    mainWindow.setMenu(null);

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
        mainWindow.loadFile(indexPath);
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        logger.info('Main window shown');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        logger.error('Failed to load page:', errorCode, errorDescription);
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });

    return mainWindow;
}

/**
 * Obtiene la instancia de la ventana principal
 * @returns {BrowserWindow|null}
 */
function getWindow() {
    return mainWindow;
}

/**
 * Envía un mensaje a la ventana principal
 * @param {string} channel - Canal IPC
 * @param {*} data - Datos a enviar
 */
function sendToWindow(channel, data) {
    try {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
            mainWindow.webContents.send(channel, data);
        }
    } catch (error) {
        logger.debug(`Failed to send ${channel}:`, error.message);
    }
}

module.exports = {
    createWindow,
    getWindow,
    sendToWindow
};
