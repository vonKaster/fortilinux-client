/**
 * Monitoreo de tráfico de red de la VPN
 */
const fs = require('fs');
const logger = require('../utils/logger');
const vpnState = require('../vpn/state');
const { sendToWindow } = require('../window/manager');

let lastRxBytes = 0;
let lastTxBytes = 0;
let trafficInterval = null;

/**
 * Lee las estadísticas de la interfaz de red VPN
 * @returns {Object|null} Estadísticas {rx, tx, interface} o null si no se encuentra
 */
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

/**
 * Inicia el monitoreo de tráfico
 */
function startTrafficMonitoring() {
    if (trafficInterval) {
        clearInterval(trafficInterval);
    }
    
    lastRxBytes = 0;
    lastTxBytes = 0;
    vpnState.bytesReceived = 0;
    vpnState.bytesSent = 0;
    
    trafficInterval = setInterval(() => {
        if (!vpnState.isConnected) {
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
        vpnState.bytesReceived = stats.rx;
        vpnState.bytesSent = stats.tx;
        vpnState.trafficHistory.push({
            timestamp: Date.now(),
            rx: rxSpeed,
            tx: txSpeed
        });

        if (vpnState.trafficHistory.length > 60) {
            vpnState.trafficHistory.shift();
        }

        sendToWindow('traffic-update', {
            bytesReceived: vpnState.bytesReceived,
            bytesSent: vpnState.bytesSent,
            rxSpeed,
            txSpeed,
            interface: stats.interface,
            history: vpnState.trafficHistory
        });
    }, 1000);
}

/**
 * Detiene el monitoreo de tráfico
 */
function stopTrafficMonitoring() {
    if (trafficInterval) {
        clearInterval(trafficInterval);
        trafficInterval = null;
    }
    lastRxBytes = 0;
    lastTxBytes = 0;
}

module.exports = {
    startTrafficMonitoring,
    stopTrafficMonitoring
};
