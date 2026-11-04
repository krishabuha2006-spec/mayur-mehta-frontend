import { config } from '../config/config';

export const themeService = {
  getTheme: async () => {
    const saved = localStorage.getItem('studio_theme');
    return saved ? JSON.parse(saved) : config.defaultTheme;
  },

  updateTheme: async (themeData) => {
    localStorage.setItem('studio_theme', JSON.stringify(themeData));
    themeService.applyTheme(themeData);
    return themeData;
  },

  applyTheme: (theme) => {
    const root = document.documentElement;
    if (!theme) return;
    if (theme.primaryColor) root.style.setProperty('--color-primary', theme.primaryColor);
    if (theme.surfaceAltColor) root.style.setProperty('--color-surface-alt', theme.surfaceAltColor);
    if (theme.borderColor) root.style.setProperty('--color-border', theme.borderColor);
    if (theme.textColor) root.style.setProperty('--color-text', theme.textColor);
    if (theme.bgColor) root.style.setProperty('--color-bg', theme.bgColor);
    if (theme.cardColor) root.style.setProperty('--color-card', theme.cardColor);
    
    // Global Unified Typography - Universal Inter Standard across whole system
    const fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    root.style.setProperty('--font-family-base', fontFamily);
    root.style.setProperty('--font-serif', fontFamily);
    root.style.setProperty('--font-heading', fontFamily);
    root.style.setProperty('--font-family-serif', fontFamily);
  },

  applyThemeToDom: (theme) => {
    themeService.applyTheme(theme);
  }
};

export default themeService;
