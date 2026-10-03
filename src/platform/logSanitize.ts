/**
 * Redacts sensitive or overly verbose fragments before messages reach app.log.
 */
export function sanitizeLogMessage(message: string): string {
  let sanitized = message.replace(/\r?\n/g, ' ');
  sanitized = sanitized.replace(/https?:\/\/[^\s)\]]+/gi, '[url_redacted]');
  sanitized = sanitized.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
  sanitized = sanitized.replace(/refresh_token/gi, '[redacted_token]');
  sanitized = sanitized.replace(/access_token/gi, '[redacted_token]');
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[email_redacted]',
  );
  sanitized = sanitized.replace(/\/Users\/[^/\s]+/g, '/Users/[user]');
  return sanitized;
}
