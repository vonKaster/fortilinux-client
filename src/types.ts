export interface Connection {
  name: string;
  server: string;
  port: number;
  username: string;
  password?: string;
  trustedCert?: string;
  autoTrustCert?: boolean;
}

export interface Config {
  connections: Connection[];
  theme: 'light' | 'dark';
}

export interface HistoryEntry {
  connectionName: string;
  server: string;
  username: string;
  timestamp: string;
  success: boolean;
  ip?: string;
  error?: string;
  duration?: number;
}

export interface VPNStatus {
  connected: boolean;
  ip?: string;
  duration?: number;
  bytesReceived?: number;
  bytesSent?: number;
}

export interface TrafficData {
  bytesReceived: number;
  bytesSent: number;
  history: Array<{
    timestamp: number;
    rx: number;
    tx: number;
  }>;
}

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<Config>;
      saveConfig: (config: Config) => Promise<boolean>;
      getHistory: () => Promise<HistoryEntry[]>;
      clearHistory: () => Promise<boolean>;
      connectVPN: (params: Connection & { connectionName: string }) => Promise<{ success: boolean; message: string }>;
      disconnectVPN: () => Promise<{ success: boolean; message: string }>;
      cancelConnection: () => Promise<{ success: boolean; message: string }>;
      getVPNStatus: () => Promise<VPNStatus>;
      onVPNStatus: (callback: (data: VPNStatus) => void) => void;
      onVPNLog: (callback: (data: string) => void) => void;
      onVPNIP: (callback: (data: string) => void) => void;
      onTrafficUpdate: (callback: (data: TrafficData) => void) => void;
      onVPNError: (callback: (data: string) => void) => void;
    };
  }
}
