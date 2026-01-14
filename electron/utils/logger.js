/**
 * Sistema de logging para la aplicación
 */

function log(level, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    try {
        if (level === 'error') {
            console.error(prefix, ...args);
        } else {
            console.log(prefix, ...args);
        }
    } catch (e) {
        // Ignore EPIPE errors
    }
}

const logger = {
    info: (...args) => log('info', ...args),
    warn: (...args) => log('warn', ...args),
    error: (...args) => log('error', ...args),
    debug: (...args) => log('debug', ...args)
};

module.exports = logger;
