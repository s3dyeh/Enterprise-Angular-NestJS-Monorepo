import { registerAs } from '@nestjs/config';

export function readBoolean(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (!['true', 'false'].includes(value))
    throw new Error(`${name} must be true or false`);
  return value === 'true';
}

function integer(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} is outside its valid range`);
  return value;
}

export function loadRuntimeConfig() {
  const production = process.env.NODE_ENV === 'production';
  const recaptchaEnabled = readBoolean('RECAPTCHA_ENABLED');
  const siteKey = process.env.RECAPTCHA_SITE_KEY || '';
  const secretKey = process.env.RECAPTCHA_SECRET_KEY || '';
  const hostnames = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || '0.5');
  if (recaptchaEnabled && (!siteKey || !secretKey || !hostnames.length))
    throw new Error(
      'Enabled reCAPTCHA requires site key, secret key, and allowed hostnames',
    );
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 1)
    throw new Error('RECAPTCHA_MIN_SCORE must be between 0 and 1');
  const redisMode = process.env.REDIS_MODE || 'disabled';
  if (!['disabled', 'standalone', 'cluster'].includes(redisMode))
    throw new Error('Invalid REDIS_MODE');
  const redisUrl = process.env.REDIS_URL || '';
  const redisNodes = (process.env.REDIS_CLUSTER_NODES || '')
    .split(',')
    .filter(Boolean)
    .map((value) => {
      const url = new URL(value.trim());
      if (
        !['redis:', 'rediss:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error(
          'Cluster nodes must be redis URLs without embedded credentials',
        );
      return { host: url.hostname, port: Number(url.port || 6379) };
    });
  if (redisMode === 'standalone' && !redisUrl)
    throw new Error('REDIS_URL is required');
  if (redisMode === 'cluster' && !redisNodes.length)
    throw new Error('REDIS_CLUSTER_NODES is required');
  const prefix = process.env.REDIS_KEY_PREFIX || 'enterprise';
  if (!/^[a-zA-Z0-9:_-]{1,64}$/.test(prefix))
    throw new Error('Invalid REDIS_KEY_PREFIX');
  const origins = (
    process.env.APP_CORS_ORIGINS ||
    process.env.FRONTEND_DOMAIN ||
    ''
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (production && (!origins.length || origins.includes('*')))
    throw new Error('Production requires explicit frontend origins');
  if (production && process.env.DATABASE_SYNCHRONIZE === 'true')
    throw new Error(
      'Production schema synchronization is disabled; run migrations',
    );
  if (production && process.env.FILE_DRIVER === 'local')
    throw new Error('Production replicas require shared S3 storage');
  if (production && redisMode === 'disabled')
    throw new Error(
      'Production replicas require shared Redis authentication limits',
    );
  if (production && (process.env.METRICS_TOKEN || '').length < 32)
    throw new Error(
      'Production requires a metrics token of at least 32 characters',
    );
  if (production && !process.env.TRUST_PROXY)
    throw new Error('Production requires the trusted proxy CIDRs');
  if (
    production &&
    origins.some((origin) => new URL(origin).protocol !== 'https:')
  )
    throw new Error('Production frontend origins must use HTTPS');
  return {
    production,
    origins,
    recaptchaEnabled,
    siteKey,
    secretKey,
    hostnames,
    minScore,
    redisMode: redisMode as 'disabled' | 'standalone' | 'cluster',
    redisUrl,
    redisNodes,
    prefix,
    redisUsername: process.env.REDIS_USERNAME || undefined,
    redisPassword: process.env.REDIS_PASSWORD || undefined,
    redisTls: readBoolean('REDIS_TLS'),
    redisCa: process.env.REDIS_TLS_CA || undefined,
    rateLimit: integer('AUTH_RATE_LIMIT', 20, 1, 1000),
    rateWindowSeconds: integer('AUTH_RATE_WINDOW_SECONDS', 60, 1, 3600),
    trustProxy: process.env.TRUST_PROXY || '',
    metricsToken: process.env.METRICS_TOKEN || '',
    swaggerEnabled: readBoolean('SWAGGER_ENABLED', !production),
  };
}

export type RuntimeConfig = ReturnType<typeof loadRuntimeConfig>;
export default registerAs('runtime', loadRuntimeConfig);
