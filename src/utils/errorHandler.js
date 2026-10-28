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
    // If validation details exist, format simply
    if (Array.isArray(data.error?.details) && data.error.details.length > 0) {
      const detailsList = data.error.details
        .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
        .join('; ');
      return sanitizeErrorMessage(`${data.message || 'Validation error'}: ${detailsList}`, status);
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

