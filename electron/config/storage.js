/**
 * Gestión de almacenamiento (configuración e historial)
 */
const fs = require('fs');
const logger = require('../utils/logger');
const { configFile, historyFile } = require('./paths');

/**
 * Carga la configuración desde el archivo
 * @returns {Object} Configuración o valores por defecto
 */
function loadConfig() {
    try {
        if (fs.existsSync(configFile)) {
            return JSON.parse(fs.readFileSync(configFile, 'utf8'));
        }
    } catch (error) {
        logger.error('Failed to load config:', error.message);
    }
    return { connections: [], theme: 'light' };
}

/**
 * Guarda la configuración en el archivo
 * @param {Object} config - Configuración a guardar
 */
function saveConfig(config) {
    try {
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    } catch (error) {
        logger.error('Failed to save config:', error.message);
    }
}

/**
 * Carga el historial desde el archivo
 * @returns {Array} Historial de conexiones
 */
function loadHistory() {
    try {
        if (fs.existsSync(historyFile)) {
            return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        }
    } catch (error) {
        logger.error('Failed to load history:', error.message);
    }
    return [];
}

/**
 * Guarda el historial en el archivo
 * @param {Array} history - Historial a guardar
 */
function saveHistory(history) {
    try {
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
        logger.error('Failed to save history:', error.message);
    }
}

/**
 * Agrega una entrada al historial
 * @param {Object} entry - Entrada a agregar
 */
function addToHistory(entry) {
    const history = loadHistory();
    history.push({
        ...entry,
        timestamp: new Date().toISOString()
    });
    if (history.length > 50) {
        history.splice(0, history.length - 50);
    }
    saveHistory(history);
}

module.exports = {
    loadConfig,
    saveConfig,
    loadHistory,
    saveHistory,
    addToHistory
};
