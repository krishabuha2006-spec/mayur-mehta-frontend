/**
 * Standard Error Handling Helper conforming to Module M1.1 Section 5.2
 * Sanitizes backend and infrastructure errors into clean, friendly human-readable messages.
 */

export function sanitizeErrorMessage(rawMsg, status = null) {
  if (!rawMsg || typeof rawMsg !== 'string') {
    return 'Unable to process your request. Please try again.';
  }

  const str = rawMsg.trim();

  // If HTML or technical deployment / proxy error
  const isTechnical =
    str.includes('<!DOCTYPE') ||
    str.includes('<html') ||
    str.includes('Vercel') ||
    str.includes('deployment') ||
    str.includes('Cannot POST') ||
    str.includes('Cannot GET') ||
    str.includes('status code 404') ||
    str.includes('status code 500') ||
    str.includes('status code 502') ||
    str.includes('ECONNREFUSED') ||
    str.includes('ECONNABORTED') ||
    str.includes('ETIMEDOUT') ||
    str.includes('Internal Server Error') ||
    str.includes('FUNCTION_INVOCATION_TIMEOUT');

  if (isTechnical) {
    if (status === 404) {
      return 'Service temporarily unavailable. Please try again shortly.';
    }
    if (status >= 500) {
      return 'The server is temporarily unavailable. Please try again in a moment.';
    }
    return 'Unable to connect to the server. Please try again.';
  }

  // Strip technical code prefixes like "INVALID_CREDENTIALS: ", "VALIDATION_ERROR: ", etc.
  let clean = str.replace(/^[A-Z0-9_]+:\s*/, '');

  // Capitalize first letter
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Ensure nice punctuation if simple sentence
  if (clean.length > 0 && !/[.!?]$/.test(clean)) {
    clean += '.';
  }

  return clean;
}

export function extractErrorMessage(err, fallback = 'Unable to process your request. Please try again.') {
  if (!err) return fallback;

  const status = err.response?.status;

  if (typeof err === 'string') {
    return sanitizeErrorMessage(err, status);
  }

  const data = err.response?.data;

  // If data is HTML string or contains technical deployment text
  if (typeof data === 'string' && (data.includes('<!DOCTYPE') || data.includes('<html') || data.includes('Vercel'))) {
    return sanitizeErrorMessage('Vercel error', status);
  }

  if (data && typeof data === 'object') {
    // Module M1.2 & M1.3 Specific Error Codes Map
    const code = data.error?.code;
    const SYSTEM_ERROR_MESSAGES = {
      // M1.2 Authentication
      ACCOUNT_LOCKED: 'Account locked due to repeated failed login attempts. Please try again after 15 minutes.',
      ACCOUNT_NOT_ACTIVATED: 'Your account is not activated yet. Please check your email to set your password.',
      ACCOUNT_DISABLED: 'This account has been disabled. Please contact your platform administrator.',
      COMPANY_SUSPENDED: 'Your studio workspace is currently suspended. Please contact platform administration.',
      COMPANY_DELETED: 'This studio workspace has been scheduled for deletion.',
      USER_REMOVED: 'Your account has been removed from this company.',
      PASSWORD_CHANGE_REQUIRED: 'A password change is required before you can access the system.',
      TOKEN_INVALID: 'Session is invalid. Please sign in again.',
      TOKEN_EXPIRED: 'Session expired. Please sign in again.',
      TOKEN_REUSED: 'Security alert: Session expired due to duplicate session activity. Please sign in again.',
      SESSION_REVOKED: 'Session has been revoked. Please sign in again.',
      RESET_TOKEN_INVALID: 'This password link is invalid or has expired. Please request a new one.',
      OTP_INVALID: 'Invalid verification code. Please check the 6-digit code and try again.',
      OTP_EXPIRED: 'Verification code expired. Please request a new code.',
      OTP_ATTEMPTS_EXCEEDED: 'Maximum verification attempts exceeded. Please request a new code.',
      ORIGIN_NOT_ALLOWED: 'Access denied from untrusted origin.',
      EMAIL_ALREADY_REGISTERED: 'This email address is already registered in the system.',

      // M1.3 Super Admin - Company Management
      INVALID_STATE_TRANSITION: 'Invalid company lifecycle state transition. This operation is not permitted for the current status.',
      IMPERSONATION_READ_ONLY: 'Support access is strictly read-only. Data modifications are blocked during impersonation.',
      CANNOT_DISABLE_SELF: 'You cannot disable your own administrator account.',
      LAST_ADMIN_PROTECTED: 'Protection active: You cannot disable the platform’s last active Super Admin.',
      CONFIRMATION_MISMATCH: 'Confirmation name does not match the company name.',

      // M1.4 Team & Seats (10 Free Seats, Then Paid)
      SEAT_LIMIT_REACHED: 'User limit reached (10/10). The 11th user requires a paid plan. Removing any inactive user frees their seat immediately.',
      SELF_ACTION_FORBIDDEN: 'Action forbidden: You cannot modify, demote, or remove your own account.',
      ROLE_HIERARCHY_VIOLATION: 'Permission denied: You cannot manage or invite someone with equal or higher rank.',
      OWNER_CANNOT_BE_REMOVED: 'The company Owner cannot be removed. Please transfer ownership first.',
      TRANSFER_TARGET_NOT_ADMIN: 'Ownership can only be transferred to an active Admin.',
      PASSWORD_CONFIRMATION_FAILED: 'Incorrect password confirmation for ownership transfer.',
      USER_ALREADY_EXISTS: 'A user with this email address already exists in the system.',

      // M1.5 Company Profile, Settings, Master Categories & Permissions
      PERMISSION_DENIED: 'Access denied: You do not have sufficient permissions to perform this action.',
      PERMISSION_ESCALATION: 'Privilege escalation blocked: You cannot grant permissions or data scopes higher than your own.',
      PERMISSIONS_FIXED_FOR_OWNER: 'The company Owner always retains full access across all modules.',
      MASTER_ITEM_IN_USE: 'Cannot delete this category item because it is currently referenced in active projects, drawings, or tasks. You can deactivate it instead.',
      INVALID_SETTING_VALUE: 'One or more setting values are invalid. Please check your inputs.',
      CROSS_FIELD_VALIDATION_FAILED: 'Cross-field validation failed: Please ensure working end time is after start time.',
      UNSUPPORTED_IMAGE_TYPE: 'Unsupported logo format. Please upload a PNG, JPEG, or WEBP image (SVG is not allowed for security reasons).',
      FILE_TOO_LARGE: 'Logo file size exceeds the 1MB limit. Please compress or select a smaller image.',

      // M1.6 Billing (Manual) - Plans, Invoices, Payments, Expiry & Downgrade
      RESTRICTED_READ_ONLY: 'Workspace is in restricted read-only mode. Your subscription has expired and exceeds the free 10-seat limit. Please renew or reduce active users to resume modifications.',
      SUBSCRIPTION_RESTRICTED: 'Subscription restricted: modifications are blocked until the account is renewed or active users are reduced within free limits.',
      SUBSCRIPTION_EXPIRED: 'Your paid subscription has expired. Please contact support or renew your subscription.',
      INVOICE_NOT_DRAFT: 'Only DRAFT invoices can be modified or deleted. Issued invoices are immutable for tax compliance.',
      INVOICE_ALREADY_ISSUED: 'This invoice has already been issued with a permanent tax invoice number.',
      INVOICE_ALREADY_PAID: 'This invoice has already been fully settled.',
      INVOICE_VOIDED: 'Cannot process payment or modify a voided invoice.',
      PAYMENT_EXCEEDS_BALANCE: 'The entered payment amount exceeds the remaining unpaid invoice balance.',
      PAYMENT_CANNOT_BE_REVERSED: 'This payment cannot be reversed. Only the most recent payment on an invoice can be reversed (LIFO rule).',
      CANNOT_DOWNGRADE_BELOW_USAGE: 'Cannot downgrade plan: Active seats exceed the requested plan limit. Please remove unused users first.',
      REQUEST_ALREADY_RESOLVED: 'This billing request has already been resolved or cancelled.',
      REQUEST_NOT_FOUND: 'The requested billing request does not exist.',
      ACTIVE_SUBSCRIPTION_EXISTS: 'An active subscription already exists for this company.',
      INVALID_PAYMENT_METHOD: 'Invalid payment method selected. Allowed methods: BANK_TRANSFER, CHEQUE, UPI, CASH, OTHER.',
      GRACE_PERIOD_EXCEEDED: 'The maximum grace period extension has been reached (maximum 30 days).',

      // M1.7 Projects (Core Project Record, Team, Stages, Progress)
      PROJECT_NOT_FOUND: 'Project not found or you do not have permission to access it.',
      PROJECT_ACCESS_DENIED: 'Access denied: You are not assigned to this project or do not have sufficient team role permissions.',
      OPEN_STAGES_REMAIN: 'Project has unfinished drawing stages. Please complete all stages or confirm to proceed with completion.',
      STAGE_NOT_FOUND: 'The requested project stage was not found.',
      STAGE_DELETE_FORBIDDEN: 'Cannot delete this stage: Only stages in NOT_STARTED status can be removed.',
      STAGE_NOT_EMPTY: 'Cannot delete stage: Only stages in NOT_STARTED status without active deliverables can be removed.',
      STAGE_ALREADY_EXISTS: 'This master drawing stage is already added to the project.',
      SINGLE_MANAGER_RULE: 'A project can only have one Project Manager. The previous manager has been demoted to Lead.',
      INVALID_STATUS_TRANSITION: 'Invalid project status transition. This lifecycle transition is not permitted.',
      STATUS_REASON_REQUIRED: 'A reason (at least 5 characters) is required when placing a project ON HOLD or CANCELLING.',
      EXPORT_TOO_LARGE: 'Export size exceeds the platform safety limit. Please refine your search or date filters.',
      ARCHIVE_STATUS_INVALID: 'Only COMPLETED or CANCELLED projects can be moved to the archive.',
      PROJECT_DELETED: 'This project has been moved to Trash.',
      CONCURRENCY_CONFLICT: 'Project was updated by another team member. Please refresh the page to see the latest changes.',
      VERSION_MISMATCH: 'Version conflict: Someone else modified this project. Please reload the record.',

      // M1.8 Task Management (Basic)
      TASK_NOT_FOUND: 'Task not found or has been moved to trash.',
      ASSIGNEE_NOT_IN_PROJECT: 'Assignment rejected: Assignees must be active project team members with Manager, Lead, or Member roles (Viewers cannot be assigned tasks).',
      CHECKLIST_LIMIT_EXCEEDED: 'Checklist limit reached: A task can hold up to 50 checklist items.',
      CHECKLIST_ITEM_NOT_FOUND: 'The specified checklist item does not exist.',
      TASK_STATUS_INVALID: 'Invalid task status transition.',
      TASK_REASON_REQUIRED: 'A cancellation reason is required when cancelling a task.',
      BULK_ACTION_LIMIT_EXCEEDED: 'Bulk action limit exceeded: Maximum 100 tasks can be processed at once.',
      TASK_DELETED: 'This task has been moved to Trash.',
      TASK_VERSION_CONFLICT: 'This task was modified by another team member. Please refresh the board to see the latest updates.'
    };

    if (code && SYSTEM_ERROR_MESSAGES[code]) {
      return SYSTEM_ERROR_MESSAGES[code];
    }

    // If validation details exist, format clearly with field names
    if (Array.isArray(data.error?.details) && data.error.details.length > 0) {
      const detailsList = data.error.details
        .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
        .join('; ');
      return `Validation failed: ${detailsList}`;
    }

    // Object map of validation details e.g. { [field]: message }
    if (data.error?.details && typeof data.error.details === 'object' && !Array.isArray(data.error.details)) {
      const detailsList = Object.entries(data.error.details)
        .map(([field, msg]) => `${field}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`)
        .join('; ');
      if (detailsList) {
        return `Validation failed: ${detailsList}`;
      }
    }

    if (data.message && typeof data.message === 'string') {
      return sanitizeErrorMessage(data.message, status);
    }

    if (data.error?.message && typeof data.error.message === 'string') {
      return sanitizeErrorMessage(data.error.message, status);
    }
  }

  // Common HTTP status codes if backend message is missing or technical
  if (status === 401) {
    return 'Invalid credentials. Please check your email and password.';
  }
  if (status === 403) {
    return 'Access denied. You do not have permission to perform this action.';
  }
  if (status === 404) {
    return 'The requested service is temporarily unavailable. Please try again.';
  }
  if (status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return 'The server encountered an issue. Please try again shortly.';
  }

  // Network or timeout errors
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return 'The server took too long to respond. Please check your connection and try again.';
  }

  if (err.message === 'Network Error' || !err.response) {
    return 'Unable to connect to the server. Please verify your internet connection.';
  }

  return sanitizeErrorMessage(err.message, status) || fallback;
}

export function extractErrorCode(err) {
  return err.response?.data?.error?.code || null;
}

export function extractRequestId(err) {
  return err.response?.data?.requestId || err.response?.headers?.['x-request-id'] || null;
}

