import { useState, useEffect } from 'react';
import type { Connection } from '@/types';

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const config = await window.electronAPI.getConfig();
      setConnections(config.connections);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const addConnection = async (connection: Connection) => {
    const config = await window.electronAPI.getConfig();
    const newConnections = [...config.connections, connection];
    await window.electronAPI.saveConfig({ ...config, connections: newConnections });
    await loadConnections();
  };

  const updateConnection = async (index: number, connection: Connection) => {
    const config = await window.electronAPI.getConfig();
    const newConnections = [...config.connections];
    newConnections[index] = connection;
    await window.electronAPI.saveConfig({ ...config, connections: newConnections });
    await loadConnections();
  };

  const deleteConnection = async (index: number) => {
    const config = await window.electronAPI.getConfig();
    const newConnections = config.connections.filter((_, i) => i !== index);
    await window.electronAPI.saveConfig({ ...config, connections: newConnections });
    await loadConnections();
  };

  return {
    connections,
    loading,
    addConnection,
    updateConnection,
    deleteConnection,
    reload: loadConnections,
  };
}

