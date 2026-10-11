const MIN_AUTH_SECRET_LENGTH = 32;
const DEFAULT_DB_PORT = 1433;
const DEFAULT_SESSION_HOURS = 12;

export interface DatabaseConfig {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
}

export interface AuthConfig {
  secret: string;
  sessionHours: number;
}

function requireVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  return value === undefined ? fallback : value.toLowerCase() === 'true';
}

function readPositiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive number`);
  }
  return parsed;
}

// Read lazily so that `next build` does not require runtime secrets
export function getDatabaseConfig(): DatabaseConfig {
  return {
    server: requireVariable('DB_SERVER'),
    port: readPositiveNumber('DB_PORT', DEFAULT_DB_PORT),
    database: requireVariable('DB_NAME'),
    user: requireVariable('DB_USER'),
    password: requireVariable('DB_PASSWORD'),
    encrypt: readBoolean('DB_ENCRYPT', false),
    trustServerCertificate: readBoolean('DB_TRUST_SERVER_CERTIFICATE', true),
  };
}

export function getAuthConfig(): AuthConfig {
  const secret = requireVariable('AUTH_SECRET');
  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(`AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters`);
  }
  return { secret, sessionHours: readPositiveNumber('AUTH_SESSION_HOURS', DEFAULT_SESSION_HOURS) };
}
