export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  CLIENT: 'Client',
  VENDOR: 'Vendor'
};

export const WIDGET_TYPES = {
  LIST: 'list',
  COUNT: 'count',
  CHART: 'chart'
};

export const DASHBOARD_SCOPES = {
  USER: 'user',
  TEAM: 'team'
};

export const CHART_RANGES = {
  TODAY: 'today',
  LAST_15_DAYS: 'last15days'
};

export const COMPANY_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PAYMENT_FAILED: 'payment_failed',
  DELETED: 'deleted'
};

export const PROJECT_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  // Backward compatibility aliases
  planning: 'NOT_STARTED',
  ongoing: 'IN_PROGRESS',
  on_hold: 'ON_HOLD',
  completed: 'COMPLETED'
};

export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
  // Backward compatibility aliases
  pending: 'TODO',
  in_progress: 'IN_PROGRESS',
  completed: 'DONE',
  overdue: 'overdue'
};
