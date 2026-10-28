export const DEFAULT_WIDGETS_LAYOUT = [
  { id: 'w-ongoing', key: 'project-ongoing', type: 'list', title: 'Project - Ongoing', cols: 1, rows: 2, order: 1, visible: true },
  { id: 'w-approval', key: 'approval-pending', type: 'list', title: 'Approval - Pending', cols: 1, rows: 1, order: 2, visible: true },
  { id: 'w-revision', key: 'revision-pending', type: 'list', title: 'Revision - Pending', cols: 1, rows: 1, order: 3, visible: true },
  { id: 'w-today-task', key: 'today-task', type: 'count', title: 'Today - Task', cols: 1, rows: 1, order: 4, visible: true },
  { id: 'w-followup-task', key: 'followup-task', type: 'count', title: 'Follow up - Task', cols: 1, rows: 1, order: 5, visible: true },
  { id: 'w-proj-task', key: 'project-task', type: 'count', title: 'Project - Task', cols: 1, rows: 1, order: 6, compact: true, visible: true },
  { id: 'w-office-task', key: 'office-task', type: 'count', title: 'Office - Task', cols: 1, rows: 1, order: 7, compact: true, visible: true },
  { id: 'w-overdue-task', key: 'overdue-task', type: 'count', title: 'Overdue - Task', cols: 1, rows: 1, order: 8, compact: true, visible: true },
  { id: 'w-personal-task', key: 'personal-task', type: 'count', title: 'Personal - Task', cols: 1, rows: 1, order: 9, compact: true, visible: true },
  { id: 'w-status-chart', key: 'status-task', type: 'chart', title: 'Status - Task', cols: 2, rows: 1, order: 10, visible: true },
  { id: 'w-pending-chart', key: 'pending-task', type: 'chart', title: 'Pending - Task', cols: 2, rows: 1, order: 11, visible: true }
];

export const AVAILABLE_WIDGETS = [
  { key: 'project-ongoing', title: 'Project - Ongoing', category: 'Project' },
  { key: 'approval-pending', title: 'Approval - Pending', category: 'Approvals' },
  { key: 'revision-pending', title: 'Revision - Pending', category: 'Approvals' },
  { key: 'today-task', title: 'Today - Task', category: 'Task' },
  { key: 'followup-task', title: 'Follow up - Task', category: 'Task' },
  { key: 'project-task', title: 'Project - Task', category: 'Task' },
  { key: 'office-task', title: 'Office - Task', category: 'Task' },
  { key: 'overdue-task', title: 'Overdue - Task', category: 'Task' },
  { key: 'personal-task', title: 'Personal - Task', category: 'Task' },
  { key: 'status-task', title: 'Status - Task', category: 'Chart' },
  { key: 'pending-task', title: 'Pending - Task', category: 'Chart' }
];
