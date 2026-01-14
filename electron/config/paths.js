/**
 * Configuración de rutas y directorios
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');

const isDev = !app.isPackaged;
const configDir = path.join(os.homedir(), '.config', 'fortilinux-client');
const configFile = path.join(configDir, 'config.json');
const historyFile = path.join(configDir, 'history.json');

// Asegurar que el directorio de configuración existe
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

module.exports = {
    isDev,
    configDir,
    configFile,
    historyFile
};
