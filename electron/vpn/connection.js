/**
 * Gestión de conexión VPN
 */
const { spawn } = require('child_process');
const fs = require('fs');
const logger = require('../utils/logger');
const { getPrivilegedCommand } = require('../utils/permissions');
const { addToHistory } = require('../config/storage');
const vpnState = require('./state');
const { saveConfigFile, buildOpenFortiVPNArgs, getConfigPath, generateConfigContent } = require('./config');
const { sendToWindow } = require('../window/manager');
const { updateTrayMenu } = require('../tray/manager');
const { startTrafficMonitoring, stopTrafficMonitoring } = require('../traffic/monitor');

/**
 * Maneja la salida stdout del proceso VPN
 */
function setupStdoutHandler(vpnProcess, params, buffersRef, errorTimeoutRef) {
    const { server, port, username, connectionName } = params;

    vpnProcess.stdout.on('data', (data) => {
        const output = data.toString();
        buffersRef.outputBuffer += output;
        
        sendToWindow('vpn-log', output);
        
        if (output.includes('Gateway certificate validation failed')) {
            if (!vpnState.isConnected) {
                logger.error('Certificate validation failed detected in stdout');
            }
        }
        
        // Extraer IP asignada
        const ipMatch = output.match(/local\s+IP\s+address\s+([\d.]+)/i);
        if (ipMatch) {
            vpnState.assignedIP = ipMatch[1];
            logger.info('Assigned IP:', vpnState.assignedIP);
            sendToWindow('vpn-ip', vpnState.assignedIP);
            updateTrayMenu();
        }
        
        // Detectar conexión exitosa
        if (output.includes('Tunnel is up and running')) {
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
                errorTimeoutRef.current = null;
            }
            vpnState.isConnected = true;
            logger.info('VPN connected successfully');
            updateTrayMenu();
            startTrafficMonitoring();
            
            sendToWindow('vpn-status', { 
                connected: true,
                ip: vpnState.assignedIP 
            });
            
            addToHistory({
                connectionName,
                server: `${server}:${port}`,
                username,
                success: true,
                ip: vpnState.assignedIP
            });
        }
    });
}

/**
 * Maneja la salida stderr del proceso VPN
 */
function setupStderrHandler(vpnProcess, params, buffersRef, errorTimeoutRef) {
    const { server, port, username, connectionName } = params;

    vpnProcess.stderr.on('data', (data) => {
        const output = data.toString();
        buffersRef.errorBuffer += output;
        
        sendToWindow('vpn-log', output);
        
        if (output.includes('Gateway certificate validation failed')) {
            if (!vpnState.isConnected) {
                buffersRef.hasError = true;
                logger.error('Certificate validation failed detected in stderr');
            }
        }
        
        // Detectar errores de conexión
        if (output.includes('unrecognized option') || 
            output.includes('Usage:') ||
            output.includes('FATAL:') ||
            output.includes('authentication failed') ||
            output.includes('Could not authenticate')) {
            buffersRef.hasError = true;
            
            setTimeout(() => {
                if (vpnState.vpnProcess && !vpnState.isConnected) {
                    logger.error('Connection error detected, terminating process...');
                    try {
                        vpnState.vpnProcess.kill();
                    } catch (e) {
                        logger.debug('Error killing process:', e.message);
                    }
                }
            }, 1000);
        }
        
        // Extraer IP asignada (también puede venir por stderr)
        const ipMatch = output.match(/local\s+IP\s+address\s+([\d.]+)/i);
        if (ipMatch) {
            vpnState.assignedIP = ipMatch[1];
            logger.info('Assigned IP:', vpnState.assignedIP);
            sendToWindow('vpn-ip', vpnState.assignedIP);
            updateTrayMenu();
        }
    });
}

/**
 * Maneja el cierre del proceso VPN
 */
function setupCloseHandler(vpnProcess, params, buffersRef, errorTimeoutRef) {
    const { server, port, username, connectionName, autoTrustCert } = params;

    vpnProcess.on('close', (code) => {
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
            errorTimeoutRef.current = null;
        }
        
        const duration = vpnState.connectionStartTime 
            ? Math.floor((Date.now() - vpnState.connectionStartTime) / 1000) 
            : 0;
        const wasConnected = vpnState.isConnected;
        
        logger.info('VPN process closed', code ? `(code: ${code})` : '');
        
        stopTrafficMonitoring();
        vpnState.vpnProcess = null;
        vpnState.isConnected = false;
        vpnState.connectionStartTime = null;
        vpnState.assignedIP = null;
        vpnState.trafficHistory = [];
        
        if (buffersRef.hasError && !wasConnected) {
            handleConnectionError(buffersRef.errorBuffer, buffersRef.outputBuffer, params, autoTrustCert);
        } else {
            vpnState.vpnError = false;
        }
        
        updateTrayMenu();
        sendToWindow('vpn-status', { 
            connected: false,
            duration
        });
    });
}

/**
 * Maneja errores de conexión
 */
function handleConnectionError(errorBuffer, outputBuffer, params, autoTrustCert) {
    const { server, port, username, connectionName } = params;
    vpnState.vpnError = true;
    let errorMessage = 'Error al conectar a la VPN';
    let shouldRetry = false;
    
    if (errorBuffer.includes('unrecognized option')) {
        errorMessage = 'Error: Opción no reconocida por openfortivpn. Verifica la configuración.';
    } else if (errorBuffer.includes('authentication failed') || errorBuffer.includes('Could not authenticate')) {
        errorMessage = 'Error de autenticación. Verifica tus credenciales.';
    } else if (errorBuffer.includes('Gateway certificate validation failed') || outputBuffer.includes('Gateway certificate validation failed')) {
        const combinedBuffer = errorBuffer + outputBuffer;
        const certMatch = combinedBuffer.match(/--trusted-cert\s+([a-f0-9]{64})/i);
        
        if (certMatch && autoTrustCert !== false) {
            const certDigest = certMatch[1];
            const configPath = getConfigPath(server);
            
            try {
                let configContent = fs.readFileSync(configPath, 'utf8');
                
                if (!configContent.includes('trusted-cert')) {
                    configContent += `trusted-cert = ${certDigest}\n`;
                    fs.writeFileSync(configPath, configContent);
                    logger.info('Certificate added to config:', certDigest);
                    
                    sendToWindow('vpn-log', `\n[INFO] Certificate trusted automatically: ${certDigest}\n[INFO] Reconnecting...\n\n`);
                    
                    shouldRetry = true;
                    errorMessage = 'Certificate added, reconnecting...';
                    vpnState.vpnError = false;
                }
            } catch (error) {
                logger.error('Failed to update config with cert:', error.message);
                errorMessage = 'Error de validación de certificado. Intenta habilitar "Auto-confiar en certificados".';
            }
        } else {
            errorMessage = 'Error de validación de certificado. Intenta habilitar "Auto-confiar en certificados".';
        }
    } else if (outputBuffer.includes('ERROR') || errorBuffer.includes('ERROR')) {
        errorMessage = 'Error al conectar. Revisa los logs para más detalles.';
    }
    
    if (!shouldRetry) {
        addToHistory({
            connectionName,
            server: `${server}:${port}`,
            username,
            success: false,
            error: errorMessage
        });
        
        sendToWindow('vpn-error', errorMessage);
    } else {
        setTimeout(() => {
            logger.info('Retrying connection with trusted certificate...');
            connectVPN({
                ...params,
                trustedCert: null
            });
        }, 2000);
    }
}

/**
 * Maneja errores del proceso VPN
 */
function setupErrorHandler(vpnProcess, params) {
    const { server, port, username, connectionName } = params;

    vpnProcess.on('error', (error) => {
        logger.error('VPN process error:', error.message);
        vpnState.vpnError = true;
        vpnState.isConnected = false;
        vpnState.vpnProcess = null;
        updateTrayMenu();
        addToHistory({
            connectionName,
            server: `${server}:${port}`,
            username,
            success: false,
            error: error.message
        });
    });
}

/**
 * Configura el timeout de conexión
 */
function setupConnectionTimeout(vpnProcess, buffersRef, errorTimeoutRef) {
    errorTimeoutRef.current = setTimeout(() => {
        if (!vpnState.isConnected && vpnProcess) {
            logger.error('Connection timeout - could not connect in 30 seconds');
            buffersRef.hasError = true;
            buffersRef.errorBuffer += 'ERROR: Connection timeout';
            
            sendToWindow('vpn-error', 'Connection timeout: Could not connect in 30 seconds');
            
            try {
                const command = getPrivilegedCommand();
                spawn(command, ['kill', '-9', vpnProcess.pid.toString()]);
                vpnState.vpnProcess = null;
            } catch (e) {
                logger.debug('Error killing process:', e.message);
            }
        }
    }, 30000);
}

/**
 * Conecta a la VPN
 * @param {Object} params - Parámetros de conexión
 * @returns {Promise<string>}
 */
function connectVPN(params) {
    return new Promise((resolve, reject) => {
        if (vpnState.vpnProcess) {
            logger.error('Ya hay una conexión activa');
            reject('Ya hay una conexión activa');
            return;
        }

        const { server, port, username, password, trustedCert, autoTrustCert } = params;
        
        // Generar y guardar configuración
        const configPath = saveConfigFile({ server, port, username, trustedCert });
        const configContent = generateConfigContent({ server, port, username, trustedCert });
        
        // Construir argumentos
        const args = buildOpenFortiVPNArgs({ configPath, autoTrustCert, trustedCert, configContent });
        
        // Obtener comando con privilegios
        const command = getPrivilegedCommand();
        
        logger.info('Conectando a VPN...', `${server}:${port}`);
        
        // Inicializar estado
        vpnState.vpnProcess = spawn(command, args);
        vpnState.connectionStartTime = Date.now();
        vpnState.assignedIP = null;
        vpnState.bytesReceived = 0;
        vpnState.bytesSent = 0;
        vpnState.trafficHistory = [];
        vpnState.vpnError = false;

        // Enviar contraseña
        if (vpnState.vpnProcess.stdin && password) {
            try {
                vpnState.vpnProcess.stdin.write(password + '\n');
                vpnState.vpnProcess.stdin.end();
            } catch (error) {
                logger.debug('EPIPE on stdin write (non-critical)');
            }
        }

        // Referencias compartidas para buffers y timeout
        const errorTimeoutRef = { current: null };
        const buffersRef = {
            outputBuffer: '',
            errorBuffer: '',
            hasError: false
        };

        // Configurar handlers
        setupStdoutHandler(vpnState.vpnProcess, params, buffersRef, errorTimeoutRef);
        setupStderrHandler(vpnState.vpnProcess, params, buffersRef, errorTimeoutRef);
        setupCloseHandler(vpnState.vpnProcess, params, buffersRef, errorTimeoutRef);
        setupErrorHandler(vpnState.vpnProcess, params);
        setupConnectionTimeout(vpnState.vpnProcess, buffersRef, errorTimeoutRef);

        resolve('Conectando...');
    });
}

/**
 * Desconecta la VPN
 * @returns {string} Mensaje de estado
 */
function disconnectVPN() {
    if (vpnState.vpnProcess) {
        try {
            logger.info('Disconnecting VPN...');
            stopTrafficMonitoring();
            
            const command = getPrivilegedCommand();
            spawn(command, ['kill', '-15', vpnState.vpnProcess.pid.toString()]);
            vpnState.vpnProcess = null;
            vpnState.isConnected = false;
            vpnState.vpnError = false;
            vpnState.connectionStartTime = null;
            vpnState.assignedIP = null;
            vpnState.trafficHistory = [];
            updateTrayMenu();
            return 'Disconnecting...';
        } catch (error) {
            logger.error('Failed to disconnect:', error.message);
            return 'Failed to disconnect';
        }
    }
    return 'No hay conexión activa';
}

/**
 * Cancela un intento de conexión en progreso
 * @returns {Object} Resultado de la operación
 */
function cancelConnection() {
    if (vpnState.vpnProcess) {
        logger.info('Cancelling connection attempt...');
        try {
            const command = getPrivilegedCommand();
            spawn(command, ['kill', '-9', vpnState.vpnProcess.pid.toString()]);
            vpnState.vpnProcess = null;
            vpnState.isConnected = false;
            return { success: true, message: 'Connection cancelled' };
        } catch (error) {
            logger.error('Failed to cancel connection:', error.message);
            return { success: false, message: 'Failed to cancel' };
        }
    }
    return { success: false, message: 'No connection in progress' };
}

module.exports = {
    connectVPN,
    disconnectVPN,
    cancelConnection
};
