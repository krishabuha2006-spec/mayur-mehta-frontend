import { ROUTES } from './routes';

export const APP_NAVIGATION = [
  {
    id: 'nav-1',
    label: 'Dashboard',
    iconKey: 'LayoutDashboard',
    route: ROUTES.DASHBOARD,
    order: 1,
    permission: null
  },
  {
    id: 'nav-2',
    label: 'Projects',
    iconKey: 'Building2',
    route: ROUTES.PROJECTS,
    order: 2,
    permission: null,
    children: [
      { id: 'nav-2-1', label: 'List', route: `${ROUTES.PROJECTS}?view=list` },
      { id: 'nav-2-2', label: 'Visit Log', route: `${ROUTES.PROJECTS}?view=visit-logs` },
      { id: 'nav-2-3', label: 'Photos', route: `${ROUTES.PROJECTS}?view=photos` }
    ]
  },
  {
    id: 'nav-3',
    label: 'Master Task',
    iconKey: 'ListTodo',
    route: ROUTES.TASKS,
    order: 3,
    permission: null,
    children: [
      { id: 'nav-3-1', label: 'User - Task', route: `${ROUTES.TASKS}?tab=my` },
      { id: 'nav-3-2', label: 'Team - Task', route: `${ROUTES.TASKS}?tab=all` },
      { id: 'nav-3-3', label: 'Templates', route: `${ROUTES.TASKS}?tab=templates` }
    ]
  },
  {
    id: 'nav-4',
    label: 'Pending Request',
    iconKey: 'FileCheck2',
    route: ROUTES.APPROVALS,
    order: 4,
    permission: null,
    children: [
      { id: 'nav-4-1', label: 'Approvals', route: `${ROUTES.APPROVALS}?tab=pending` },
      { id: 'nav-4-2', label: 'Revisions', route: `${ROUTES.APPROVALS}?tab=revisions` }
    ]
  },
  {
    id: 'nav-5',
    label: 'Daily Logs',
    iconKey: 'ClipboardList',
    route: ROUTES.LOGS,
    order: 5,
    permission: null
  },
  {
    id: 'nav-6',
    label: 'Design Library',
    iconKey: 'Layers',
    route: ROUTES.LIBRARY,
    order: 6,
    permission: null
  },
  {
    id: 'nav-7',
    label: 'Storage Drive',
    iconKey: 'HardDrive',
    route: ROUTES.STORAGE,
    order: 7,
    permission: null
  },
  {
    id: 'nav-8',
    label: 'Directory',
    iconKey: 'Contact',
    route: ROUTES.DIRECTORY,
    order: 8,
    permission: null
  },
  {
    id: 'nav-9',
    label: 'Team',
    iconKey: 'Users',
    route: ROUTES.TEAM,
    order: 9,
    permission: null
  },
  {
    id: 'nav-10',
    label: 'Billing',
    iconKey: 'CreditCard',
    route: ROUTES.BILLING,
    order: 10,
    permission: null
  },
  {
    id: 'nav-11',
    label: 'Reports',
    iconKey: 'BarChart3',
    route: ROUTES.REPORTS,
    order: 11,
    permission: null
  },
  {
    id: 'nav-12',
    label: 'Settings',
    iconKey: 'Settings2',
    route: ROUTES.SETTINGS,
    order: 12,
    permission: null
  }
];
