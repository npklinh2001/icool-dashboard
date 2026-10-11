type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, string | number | boolean | undefined>;

function write(level: LogLevel, message: string, context: LogContext): void {
  const entry = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...context });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.log(entry);
}

// Callers must never pass secrets (PIN, token, password) in the context
export const logger = {
  debug: (message: string, context: LogContext = {}) => write('debug', message, context),
  info: (message: string, context: LogContext = {}) => write('info', message, context),
  warn: (message: string, context: LogContext = {}) => write('warn', message, context),
  error: (message: string, context: LogContext = {}) => write('error', message, context),
};
