import { useState, useEffect } from 'react';
import type { VPNStatus, TrafficData } from '@/types';

export function useVPN() {
  const [status, setStatus] = useState<VPNStatus>({ connected: false });
  const [logs, setLogs] = useState<string>('');
  const [traffic, setTraffic] = useState<TrafficData | null>(null);

  useEffect(() => {
    let lastConnectedState = false;

    window.electronAPI.onVPNStatus((data) => {
      if (!lastConnectedState && data.connected) {
        lastConnectedState = true;
        window.dispatchEvent(new CustomEvent('vpn-connected'));
      } else if (lastConnectedState && !data.connected) {
        lastConnectedState = false;
      }
      setStatus(data);
    });

    window.electronAPI.onVPNLog((data) => {
      setLogs((prev) => prev + data);
    });

    window.electronAPI.onVPNIP((ip) => {
      setStatus((prev) => ({ ...prev, ip }));
    });

    window.electronAPI.onTrafficUpdate((data) => {
      setTraffic(data);
    });

    window.electronAPI.onVPNError((error) => {
      window.dispatchEvent(new CustomEvent('vpn-error', { detail: error }));
    });

    // Poll status
    const interval = setInterval(async () => {
      const vpnStatus = await window.electronAPI.getVPNStatus();
      setStatus(vpnStatus);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const connect = async (params: any) => {
    setLogs(`Conectando a ${params.server}:${params.port}...\n\n`);
    const result = await window.electronAPI.connectVPN(params);
    return result;
  };

  const disconnect = async () => {
    return await window.electronAPI.disconnectVPN();
  };

  const cancel = async () => {
    return await window.electronAPI.cancelConnection();
  };

  const getStatus = async () => {
    return await window.electronAPI.getVPNStatus();
  };

  return {
    status,
    logs,
    traffic,
    connect,
    disconnect,
    cancel,
    getStatus,
  };
}

