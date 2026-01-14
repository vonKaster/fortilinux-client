/**
 * Punto de entrada principal de la aplicación Electron
 * FortiLinux Client - Cliente VPN profesional para FortiClient en Linux
 */
const { registerIpcHandlers } = require('./ipc/handlers');
const { setupAppLifecycle } = require('./app/lifecycle');

// Registrar handlers IPC
registerIpcHandlers();

// Configurar ciclo de vida de la aplicación
setupAppLifecycle();
