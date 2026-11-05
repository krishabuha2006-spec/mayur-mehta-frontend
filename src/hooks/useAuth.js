import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const fallbackAuth = {
  user: null,
  company: null,
  subscription: null,
  bootstrapData: null,
  navigation: [],
  headerBadges: { mailCount: 0, chatCount: 0, notificationCount: 0 },
  permissions: [],
  loading: true,
  isAuthenticated: false,
  hasPermission: () => false,
  login: async () => {},
  logout: async () => {},
  exitImpersonation: () => {},
  isImpersonating: false
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return fallbackAuth;
  }
  return context;
}

export default useAuth;
