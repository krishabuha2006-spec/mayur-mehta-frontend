import { ROUTES } from './routes';

export const APP_NAVIGATION = [
  { id: 'nav-1', label: 'Dashboard', iconKey: 'LayoutDashboard', route: ROUTES.DASHBOARD, order: 1, permission: null },
  { id: 'nav-2', label: 'Projects', iconKey: 'Building2', route: ROUTES.PROJECTS, order: 2, permission: null },
  { id: 'nav-3', label: 'Tasks', iconKey: 'ListTodo', route: ROUTES.TASKS, order: 3, permission: null },
  { id: 'nav-4', label: 'Approvals & Revisions', iconKey: 'FileCheck2', route: ROUTES.APPROVALS, order: 4, permission: null },
  { id: 'nav-5', label: 'Daily Logs', iconKey: 'ClipboardList', route: ROUTES.LOGS, order: 5, permission: null },
  { id: 'nav-6', label: 'Design Library', iconKey: 'Layers', route: ROUTES.LIBRARY, order: 6, permission: null },
  { id: 'nav-7', label: 'Storage Drive', iconKey: 'HardDrive', route: ROUTES.STORAGE, order: 7, permission: null },
  { id: 'nav-8', label: 'Directory', iconKey: 'Contact', route: ROUTES.DIRECTORY, order: 8, permission: null },
  { id: 'nav-9', label: 'Team', iconKey: 'Users', route: ROUTES.TEAM, order: 9, permission: null },
  { id: 'nav-10', label: 'Reports', iconKey: 'BarChart3', route: ROUTES.REPORTS, order: 10, permission: null },
  { id: 'nav-11', label: 'Settings', iconKey: 'Settings2', route: ROUTES.SETTINGS, order: 11, permission: null }
];
