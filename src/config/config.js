export const config = {
  appName: import.meta.env.VITE_APP_NAME || 'Mayur Mehta Design',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@mayurmehtadesign.com',
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'https://mayurmaheta.vercel.app',
  defaultTheme: {
    primaryColor: '#7B6F62',
    surfaceAltColor: '#E8E3DB',
    borderColor: '#B7AFA6',
    textColor: '#2E2E2E',
    bgColor: '#F8F6F2',
    cardColor: '#FFFFFF',
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }
};

export default config;
