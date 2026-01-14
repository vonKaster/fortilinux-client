/**
 * Generación y gestión de configuración de openfortivpn
 */
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { configDir } = require('../config/paths');

/**
 * Genera el contenido del archivo de configuración de openfortivpn
 * @param {Object} params - Parámetros de conexión
 * @param {string} params.server - Servidor VPN
 * @param {number} params.port - Puerto
 * @param {string} params.username - Usuario
 * @param {string} params.trustedCert - Certificado confiable (opcional)
 * @returns {string} Contenido del archivo de configuración
 */
function generateConfigContent({ server, port, username, trustedCert }) {
    let configContent = `host = ${server}\nport = ${port}\nusername = ${username}\nset-dns = 1\nset-routes = 1\npppd-use-peerdns = 1\n`;
    
    if (trustedCert) {
        configContent += `trusted-cert = ${trustedCert}\n`;
    } else {
        // Intentar leer certificado existente
        const configPath = getConfigPath(server);
        if (fs.existsSync(configPath)) {
            try {
                const existingConfig = fs.readFileSync(configPath, 'utf8');
                const certMatch = existingConfig.match(/trusted-cert\s*=\s*([a-f0-9]{64})/i);
                if (certMatch) {
                    configContent += `trusted-cert = ${certMatch[1]}\n`;
                    logger.info('Using existing trusted certificate');
                }
            } catch (error) {
                logger.error('Failed to read existing config:', error.message);
            }
        }
    }
    
    return configContent;
}

/**
 * Obtiene la ruta del archivo de configuración para un servidor
 * @param {string} server - Servidor VPN
 * @returns {string} Ruta del archivo de configuración
 */
function getConfigPath(server) {
    return path.join(configDir, `openfortivpn-${server.replace(/\./g, '-')}.conf`);
}

/**
 * Guarda la configuración de openfortivpn en un archivo
 * @param {Object} params - Parámetros de conexión
 * @returns {string} Ruta del archivo de configuración creado
 */
function saveConfigFile(params) {
    const configPath = getConfigPath(params.server);
    const configContent = generateConfigContent(params);
    
    try {
        fs.writeFileSync(configPath, configContent);
        logger.debug('VPN config file saved:', configPath);
    } catch (error) {
        logger.error('Failed to create config file:', error.message);
    }
    
    return configPath;
}

/**
 * Construye los argumentos para ejecutar openfortivpn
 * @param {Object} params - Parámetros de conexión
 * @param {string} params.configPath - Ruta del archivo de configuración
 * @param {boolean} params.autoTrustCert - Auto-confiar en certificados
 * @param {string} params.trustedCert - Certificado confiable
 * @returns {Array<string>} Argumentos para spawn
 */
function buildOpenFortiVPNArgs({ configPath, autoTrustCert, trustedCert, configContent }) {
    const args = [
        'openfortivpn',
        '-c', configPath,
        '--pppd-use-peerdns=1'
    ];

    // Intentar usar systemd-resolved si está disponible
    try {
        if (fs.existsSync('/etc/systemd/resolved.conf') || fs.existsSync('/run/systemd/resolve/resolv.conf')) {
            args.push('--pppd-plugin', 'systemd-resolved');
            logger.info('Using systemd-resolved plugin for DNS');
        }
    } catch (error) {
        logger.debug('Could not detect systemd-resolved:', error.message);
    }

    if (autoTrustCert !== false && !trustedCert && !configContent.includes('trusted-cert')) {
        args.push('--insecure-ssl');
    }

    return args;
}

module.exports = {
    generateConfigContent,
    getConfigPath,
    saveConfigFile,
    buildOpenFortiVPNArgs
};
