const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let vpnProcess = null;
let isConnected = false;
let vpnError = false;
let connectionStartTime = null;
let assignedIP = null;
let bytesReceived = 0;
let bytesSent = 0;
let trafficHistory = [];

const isDev = !app.isPackaged;
const configDir = path.join(require('os').homedir(), '.config', 'fortilinux-client');
const configFile = path.join(configDir, 'config.json');
const historyFile = path.join(configDir, 'history.json');

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

if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

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

function saveConfig(config) {
    try {
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    } catch (error) {
        logger.error('Failed to save config:', error.message);
    }
}

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

function saveHistory(history) {
    try {
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
        logger.error('Failed to save history:', error.message);
    }
}

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
            preload: path.join(__dirname, 'preload.js')
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
}

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
        const devPath = path.join(__dirname, '..', 'icons', iconName);
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

function createTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }

    try {
        const status = vpnError ? 'error' : (isConnected ? 'connected' : 'disconnected');
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
            if (mainWindow) {
                mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
            }
        });
    } catch (error) {
        logger.error('Failed to create tray:', error.message);
    }
}

function updateTrayMenu() {
    if (!tray) {
        createTray();
        return;
    }
    
    try {
        const status = vpnError ? 'error' : (isConnected ? 'connected' : 'disconnected');
        const iconPath = getTrayIconPath(status);
        if (iconPath) {
            const icon = nativeImage.createFromPath(iconPath);
            if (!icon.isEmpty()) {
                tray.setImage(icon);
                logger.debug('Tray icon updated:', status);
            }
        }
        
        const tooltip = isConnected 
            ? `FortiLinux Client - Conectado${assignedIP ? ' (' + assignedIP + ')' : ''}`
            : 'FortiLinux Client - Desconectado';
        tray.setToolTip(tooltip);
        
        const contextMenu = Menu.buildFromTemplate([
            {
                label: isConnected ? '● Conectado' : '○ Desconectado',
                enabled: false
            },
            ...(assignedIP ? [{
                label: `IP: ${assignedIP}`,
                enabled: false
            }] : []),
            { type: 'separator' },
            {
                label: 'Mostrar Ventana',
                click: () => {
                    if (mainWindow) mainWindow.show();
                }
            },
            ...(isConnected ? [{
                label: 'Desconectar VPN',
                click: () => disconnectVPN()
            }] : []),
            { type: 'separator' },
            {
                label: 'Salir',
                click: () => {
                    app.isQuitting = true;
                    if (isConnected) disconnectVPN();
                    app.quit();
                }
            }
        ]);
        
        tray.setContextMenu(contextMenu);
    } catch (error) {
        logger.error('Failed to update tray:', error.message);
    }
}

let lastRxBytes = 0;
let lastTxBytes = 0;
let trafficInterval = null;

function readInterfaceStats() {
    const interfaces = ['ppp0', 'tun0', 'vpn0'];
    
    for (const iface of interfaces) {
        try {
            const rxPath = `/sys/class/net/${iface}/statistics/rx_bytes`;
            const txPath = `/sys/class/net/${iface}/statistics/tx_bytes`;
            
            if (fs.existsSync(rxPath) && fs.existsSync(txPath)) {
                const rx = parseInt(fs.readFileSync(rxPath, 'utf8').trim(), 10);
                const tx = parseInt(fs.readFileSync(txPath, 'utf8').trim(), 10);
                return { rx, tx, interface: iface };
            }
        } catch (error) {
            continue;
        }
    }
    
    return null;
}

function startTrafficMonitoring() {
    if (trafficInterval) {
        clearInterval(trafficInterval);
    }
    
    lastRxBytes = 0;
    lastTxBytes = 0;
    bytesReceived = 0;
    bytesSent = 0;
    
    trafficInterval = setInterval(() => {
        if (!isConnected) {
            clearInterval(trafficInterval);
            trafficInterval = null;
            return;
        }

        const stats = readInterfaceStats();
        
        if (!stats) {
            return;
        }
        
        let rxSpeed = 0;
        let txSpeed = 0;
        
        if (lastRxBytes > 0 && lastTxBytes > 0) {
            rxSpeed = Math.max(0, stats.rx - lastRxBytes);
            txSpeed = Math.max(0, stats.tx - lastTxBytes);
        }
        
        lastRxBytes = stats.rx;
        lastTxBytes = stats.tx;
        bytesReceived = stats.rx;
        bytesSent = stats.tx;
        trafficHistory.push({
            timestamp: Date.now(),
            rx: rxSpeed,
            tx: txSpeed
        });

        if (trafficHistory.length > 60) {
            trafficHistory.shift();
        }

        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                mainWindow.webContents.send('traffic-update', {
                    bytesReceived,
                    bytesSent,
                    rxSpeed,
                    txSpeed,
                    interface: stats.interface,
                    history: trafficHistory
                });
            }
        } catch (error) {
            logger.debug('Failed to send traffic update:', error.message);
        }
    }, 1000);
}

function stopTrafficMonitoring() {
    if (trafficInterval) {
        clearInterval(trafficInterval);
        trafficInterval = null;
    }
    lastRxBytes = 0;
    lastTxBytes = 0;
}

function connectVPN(server, port, username, password, trustedCert, connectionName, autoTrustCert) {
    return new Promise((resolve, reject) => {
        if (vpnProcess) {
            logger.error('Ya hay una conexión activa');
            reject('Ya hay una conexión activa');
            return;
        }

        const configPath = path.join(configDir, `openfortivpn-${server.replace(/\./g, '-')}.conf`);
        let configContent = `host = ${server}\nport = ${port}\nusername = ${username}\nset-dns = 1\nset-routes = 1\npppd-use-peerdns = 1\n`;
        
        if (trustedCert) {
            configContent += `trusted-cert = ${trustedCert}\n`;
        } else if (fs.existsSync(configPath)) {
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
        
        try {
            fs.writeFileSync(configPath, configContent);
        } catch (error) {
            logger.error('Failed to create config file:', error.message);
        }

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

        const useSudo = fs.existsSync('/etc/sudoers.d/fortilinux-vpn');
        const command = useSudo ? 'sudo' : 'pkexec';
        
        logger.info('Conectando a VPN...', server + ':' + port);
        vpnProcess = spawn(command, args);
        connectionStartTime = Date.now();
        assignedIP = null;
        bytesReceived = 0;
        bytesSent = 0;
        trafficHistory = [];
        vpnError = false;

        if (vpnProcess.stdin && password) {
            try {
                vpnProcess.stdin.write(password + '\n');
                vpnProcess.stdin.end();
            } catch (error) {
                logger.debug('EPIPE on stdin write (non-critical)');
            }
        }

        let outputBuffer = '';
        let errorBuffer = '';
        let hasError = false;
        
        vpnProcess.stdout.on('data', (data) => {
            const output = data.toString();
            outputBuffer += output;
            
            try {
                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                    mainWindow.webContents.send('vpn-log', output);
                }
            } catch (error) {
                logger.debug('Failed to send log update:', error.message);
            }
            
            if (output.includes('Gateway certificate validation failed')) {
                if (!isConnected) {
                    hasError = true;
                    logger.error('Certificate validation failed detected in stdout');
                }
            }
            
            const ipMatch = output.match(/local\s+IP\s+address\s+([\d.]+)/i);
            if (ipMatch) {
                assignedIP = ipMatch[1];
                logger.info('Assigned IP:', assignedIP);
                try {
                    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                        mainWindow.webContents.send('vpn-ip', assignedIP);
                    }
                } catch (error) {
                    // Ignorar
                }
                updateTrayMenu();
            }
            
            if (output.includes('Tunnel is up and running')) {
                if (errorTimeout) {
                    clearTimeout(errorTimeout);
                    errorTimeout = null;
                }
                isConnected = true;
                logger.info('VPN connected successfully');
                updateTrayMenu();
                startTrafficMonitoring();
                
                try {
                    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                        mainWindow.webContents.send('vpn-status', { 
                            connected: true,
                            ip: assignedIP 
                        });
                    }
                } catch (error) {
                    logger.debug('Failed to send status update:', error.message);
                }
                
                addToHistory({
                    connectionName,
                    server: `${server}:${port}`,
                    username,
                    success: true,
                    ip: assignedIP
                });
            }
        });

        vpnProcess.stderr.on('data', (data) => {
            const output = data.toString();
            errorBuffer += output;
            
            try {
                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                    mainWindow.webContents.send('vpn-log', output);
                }
            } catch (error) {
                logger.debug('Failed to send log update:', error.message);
            }
            
            if (output.includes('Gateway certificate validation failed')) {
                if (!isConnected) {
                    hasError = true;
                    logger.error('Certificate validation failed detected in stderr');
                }
            }
            
            if (output.includes('unrecognized option') || 
                output.includes('Usage:') ||
                output.includes('FATAL:') ||
                output.includes('authentication failed') ||
                output.includes('Could not authenticate')) {
                hasError = true;
                
                setTimeout(() => {
                    if (vpnProcess && !isConnected) {
                        logger.error('Connection error detected, terminating process...');
                        try {
                            vpnProcess.kill();
                        } catch (e) {
                            logger.debug('Error killing process:', e.message);
                        }
                    }
                }, 1000);
            }
            
            const ipMatch = output.match(/local\s+IP\s+address\s+([\d.]+)/i);
            if (ipMatch) {
                assignedIP = ipMatch[1];
                logger.info('Assigned IP:', assignedIP);
                try {
                    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                        mainWindow.webContents.send('vpn-ip', assignedIP);
                    }
                } catch (error) {
                    // Ignorar
                }
                updateTrayMenu();
            }
        });

        vpnProcess.on('close', (code) => {
            if (errorTimeout) {
                clearTimeout(errorTimeout);
                errorTimeout = null;
            }
            
            const duration = connectionStartTime ? Math.floor((Date.now() - connectionStartTime) / 1000) : 0;
            const wasConnected = isConnected;
            
            logger.info('VPN process closed', code ? `(code: ${code})` : '');
            
            stopTrafficMonitoring();
            vpnProcess = null;
            isConnected = false;
            connectionStartTime = null;
            assignedIP = null;
            trafficHistory = [];
            
            if (hasError && !wasConnected) {
                vpnError = true;
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
                        const configPath = path.join(configDir, `openfortivpn-${server.replace(/\./g, '-')}.conf`);
                        
                        try {
                            let configContent = fs.readFileSync(configPath, 'utf8');
                            
                            if (!configContent.includes('trusted-cert')) {
                                configContent += `trusted-cert = ${certDigest}\n`;
                                fs.writeFileSync(configPath, configContent);
                                logger.info('Certificate added to config:', certDigest);
                                
                                try {
                                    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                                        mainWindow.webContents.send('vpn-log', `\n[INFO] Certificate trusted automatically: ${certDigest}\n[INFO] Reconnecting...\n\n`);
                                    }
                                } catch (e) {}
                                
                                shouldRetry = true;
                                errorMessage = 'Certificate added, reconnecting...';
                                vpnError = false;
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
                    
                    try {
                        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                            mainWindow.webContents.send('vpn-error', errorMessage);
                        }
                    } catch (error) {
                        logger.debug('Failed to send error notification:', error.message);
                    }
                } else {
                    setTimeout(() => {
                        logger.info('Retrying connection with trusted certificate...');
                        connectVPN(server, port, username, password, null, connectionName, autoTrustCert);
                    }, 2000);
                }
            } else {
                vpnError = false;
            }
            
            updateTrayMenu();
            
            try {
                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                    mainWindow.webContents.send('vpn-status', { 
                        connected: false,
                        duration
                    });
                }
            } catch (error) {
                logger.debug('Failed to send disconnect status:', error.message);
            }
        });

        vpnProcess.on('error', (error) => {
            logger.error('VPN process error:', error.message);
            vpnError = true;
            isConnected = false;
            vpnProcess = null;
            updateTrayMenu();
            addToHistory({
                connectionName,
                server: `${server}:${port}`,
                username,
                success: false,
                error: error.message
            });
            reject(error.message);
        });

        let errorTimeout = setTimeout(() => {
            if (!isConnected && vpnProcess) {
                logger.error('Connection timeout - could not connect in 30 seconds');
                hasError = true;
                errorBuffer += 'ERROR: Connection timeout';
                
                try {
                    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                        mainWindow.webContents.send('vpn-error', 'Connection timeout: Could not connect in 30 seconds');
                    }
                } catch (error) {
                    logger.debug('Failed to send timeout notification:', error.message);
                }
                
                try {
                    const useSudo = fs.existsSync('/etc/sudoers.d/fortilinux-vpn');
                    const command = useSudo ? 'sudo' : 'pkexec';
                    spawn(command, ['kill', '-9', vpnProcess.pid.toString()]);
                    vpnProcess = null;
                } catch (e) {
                    logger.debug('Error killing process:', e.message);
                }
            }
        }, 30000);

        resolve('Conectando...');
    });
}

function disconnectVPN() {
    if (vpnProcess) {
        try {
            logger.info('Disconnecting VPN...');
            stopTrafficMonitoring();
            
            const useSudo = fs.existsSync('/etc/sudoers.d/fortilinux-vpn');
            const command = useSudo ? 'sudo' : 'pkexec';
            
            spawn(command, ['kill', '-15', vpnProcess.pid.toString()]);
            vpnProcess = null;
            isConnected = false;
            vpnError = false;
            connectionStartTime = null;
            assignedIP = null;
            trafficHistory = [];
            updateTrayMenu();
            return 'Disconnecting...';
        } catch (error) {
            logger.error('Failed to disconnect:', error.message);
            return 'Failed to disconnect';
        }
    }
    return 'No hay conexión activa';
}

ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (event, config) => {
    saveConfig(config);
    return true;
});
ipcMain.handle('get-history', () => loadHistory());
ipcMain.handle('clear-history', () => {
    saveHistory([]);
    return true;
});
ipcMain.handle('connect-vpn', async (event, params) => {
    try {
        const result = await connectVPN(
            params.server,
            params.port,
            params.username,
            params.password,
            params.trustedCert,
            params.connectionName,
            params.autoTrustCert
        );
        return { success: true, message: result };
    } catch (error) {
        logger.error('Error al conectar:', error);
        return { success: false, message: error };
    }
});
ipcMain.handle('disconnect-vpn', () => {
    const message = disconnectVPN();
    return { success: true, message };
});
ipcMain.handle('cancel-connection', () => {
    if (vpnProcess) {
        logger.info('Cancelling connection attempt...');
        try {
            const useSudo = fs.existsSync('/etc/sudoers.d/fortilinux-vpn');
            const command = useSudo ? 'sudo' : 'pkexec';
            spawn(command, ['kill', '-9', vpnProcess.pid.toString()]);
            vpnProcess = null;
            isConnected = false;
            return { success: true, message: 'Connection cancelled' };
        } catch (error) {
            logger.error('Failed to cancel connection:', error.message);
            return { success: false, message: 'Failed to cancel' };
        }
    }
    return { success: false, message: 'No connection in progress' };
});
ipcMain.handle('get-vpn-status', () => {
    const duration = connectionStartTime ? Math.floor((Date.now() - connectionStartTime) / 1000) : 0;
    return { 
        connected: isConnected,
        ip: assignedIP,
        duration,
        bytesReceived,
        bytesSent
    };
});

// Prevenir múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        logger.info('FortiLinux Client starting...');
        logger.info('Mode:', isDev ? 'development' : 'production');
        createWindow();
        createTray();
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Keep running in system tray
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
    if (isConnected) {
        disconnectVPN();
    }
    if (tray) {
        tray.destroy();
        tray = null;
    }
});
