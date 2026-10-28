import React, { createContext, useContext, useEffect, useState } from 'react';
import { themeService } from '../services/themeService';
import { config } from '../config/config';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(config.defaultTheme);
  const [loading, setLoading] = useState(true);

  const fetchAndApplyTheme = async () => {
    try {
      const data = await themeService.getTheme();
      const mergedTheme = { ...config.defaultTheme, ...data };
      setTheme(mergedTheme);
      themeService.applyThemeToDom(mergedTheme);
    } catch {
      themeService.applyThemeToDom(config.defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndApplyTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, reloadTheme: fetchAndApplyTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
