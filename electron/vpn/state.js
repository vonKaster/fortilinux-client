/**
 * Estado global de la conexión VPN
 */
let vpnProcess = null;
let isConnected = false;
let vpnError = false;
let connectionStartTime = null;
let assignedIP = null;
let bytesReceived = 0;
let bytesSent = 0;
let trafficHistory = [];

module.exports = {
    // Estado de proceso
    get vpnProcess() { return vpnProcess; },
    set vpnProcess(value) { vpnProcess = value; },
    
    // Estado de conexión
    get isConnected() { return isConnected; },
    set isConnected(value) { isConnected = value; },
    
    get vpnError() { return vpnError; },
    set vpnError(value) { vpnError = value; },
    
    get connectionStartTime() { return connectionStartTime; },
    set connectionStartTime(value) { connectionStartTime = value; },
    
    get assignedIP() { return assignedIP; },
    set assignedIP(value) { assignedIP = value; },
    
    // Estadísticas de tráfico
    get bytesReceived() { return bytesReceived; },
    set bytesReceived(value) { bytesReceived = value; },
    
    get bytesSent() { return bytesSent; },
    set bytesSent(value) { bytesSent = value; },
    
    get trafficHistory() { return trafficHistory; },
    set trafficHistory(value) { trafficHistory = value; },
    
    /**
     * Resetea todo el estado de la VPN
     */
    reset() {
        vpnProcess = null;
        isConnected = false;
        vpnError = false;
        connectionStartTime = null;
        assignedIP = null;
        bytesReceived = 0;
        bytesSent = 0;
        trafficHistory = [];
    }
};
