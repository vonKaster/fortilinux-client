import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const loadTheme = async () => {
      const config = await window.electronAPI.getConfig();
      setTheme(config.theme);
      applyTheme(config.theme);
    };
    loadTheme();
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = async () => {
    const config = await window.electronAPI.getConfig();
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await window.electronAPI.saveConfig({ ...config, theme: newTheme });
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return { theme, toggleTheme };
}

