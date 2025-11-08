import { useState, useEffect } from 'react';
import type { HistoryEntry } from '@/types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const hist = await window.electronAPI.getHistory();
      setHistory(hist);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();

    const interval = setInterval(() => {
      loadHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const clearHistory = async () => {
    await window.electronAPI.clearHistory();
    setHistory([]);
  };

  return {
    history,
    loading,
    clearHistory,
    reload: loadHistory,
  };
}

