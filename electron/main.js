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

function connectVPN(server, port, username, password, trustedCert, connectionName) {
    return new Promise((resolve, reject) => {
        if (vpnProcess) {
            logger.error('Ya hay una conexión activa');
            reject('Ya hay una conexión activa');
            return;
        }

        const args = [
            'openfortivpn',
            `${server}:${port}`,
            '-u', username
        ];

        if (trustedCert) {
            args.push('--trusted-cert', trustedCert);
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
            try {
                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                    mainWindow.webContents.send('vpn-log', output);
                }
            } catch (error) {
                logger.debug('Failed to send log update:', error.message);
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
            const duration = connectionStartTime ? Math.floor((Date.now() - connectionStartTime) / 1000) : 0;
            
            logger.info('VPN disconnected', code ? `(code: ${code})` : '');
            stopTrafficMonitoring();
            vpnProcess = null;
            isConnected = false;
            vpnError = false;
            connectionStartTime = null;
            assignedIP = null;
            trafficHistory = [];
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
            params.connectionName
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
