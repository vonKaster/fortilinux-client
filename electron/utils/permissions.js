/**
 * Utilidades para manejo de permisos (sudo/pkexec)
 */
const fs = require('fs');

/**
 * Detecta si existe configuración de sudoers
 * @returns {boolean}
 */
function hasSudoersConfig() {
    return fs.existsSync('/etc/sudoers.d/fortilinux-vpn');
}

/**
 * Obtiene el comando apropiado para ejecutar con privilegios
 * @returns {string} 'sudo' o 'pkexec'
 */
function getPrivilegedCommand() {
    return hasSudoersConfig() ? 'sudo' : 'pkexec';
}

module.exports = {
    hasSudoersConfig,
    getPrivilegedCommand
};
