import {
  Injectable,
  Logger,
  OnModuleInit,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cluster, Redis } from 'ioredis';
import { RuntimeConfig } from './runtime.config';

const WINDOW_SCRIPT = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}`;
const RESET_ONCE_SCRIPT = `if redis.call('EXISTS',KEYS[2])==1 then return 0 end; redis.call('SET',KEYS[2],'1','EX',ARGV[1]); redis.call('DEL',KEYS[1]); return 1`;

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  readonly config: RuntimeConfig;
  private client?: Redis | Cluster;
  private readonly resetOperations = new Map<string, number>();
  private readonly counters = new Map<
    string,
    { count: number; expires: number }
  >();

  constructor(config: ConfigService) {
    this.config = config.getOrThrow<RuntimeConfig>('runtime');
  }

  async onModuleInit() {
    const config = this.config;
    if (config.redisMode === 'disabled') return;
    const options = {
      username: config.redisUsername,
      password: config.redisPassword,
      connectTimeout: 3000,
      commandTimeout: 3000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      tls: config.redisTls
        ? { rejectUnauthorized: true, ca: config.redisCa }
        : undefined,
    };
    this.client =
      config.redisMode === 'cluster'
        ? new Cluster(config.redisNodes, {
            lazyConnect: true,
            enableOfflineQueue: false,
            redisOptions: options,
            clusterRetryStrategy: (times) => Math.min(times * 200, 2000),
          })
        : new Redis(config.redisUrl, { ...options, lazyConnect: true });
    this.client.on('error', () =>
      this.logger.error('Redis connection unavailable'),
    );
    await this.client.connect();
  }

  onApplicationShutdown() {
    this.client?.disconnect();
  }

  async ready(): Promise<boolean> {
    if (!this.client) return this.config.redisMode === 'disabled';
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async consume(
    key: string,
    seconds: number,
  ): Promise<{ count: number; retryAfter: number }> {
    if (this.config.redisMode === 'disabled') {
      const now = Date.now();
      for (const [name, entry] of this.counters)
        if (entry.expires <= now) this.counters.delete(name);
      if (this.counters.size >= 10000 && !this.counters.has(key))
        throw new ServiceUnavailableException('Rate-limit capacity reached');
      const current = this.counters.get(key) ?? {
        count: 0,
        expires: now + seconds * 1000,
      };
      current.count++;
      this.counters.set(key, current);
      return {
        count: current.count,
        retryAfter: Math.max(1, Math.ceil((current.expires - now) / 1000)),
      };
    }
    try {
      const result = (await this.client!.eval(
        WINDOW_SCRIPT,
        1,
        `${this.config.prefix}:rate:{${key}}`,
        seconds,
      )) as number[];
      return { count: result[0], retryAfter: Math.max(1, result[1]) };
    } catch {
      throw new ServiceUnavailableException(
        'Authentication protection is temporarily unavailable',
      );
    }
  }

  async cacheVersion(namespace: string): Promise<string> {
    if (!this.client) return '0';
    return (
      (await this.client.get(
        `${this.config.prefix}:cache-version:${namespace}`,
      )) ?? '0'
    );
  }

  async invalidate(namespace: string): Promise<void> {
    if (this.client)
      await this.client.incr(
        `${this.config.prefix}:cache-version:${namespace}`,
      );
  }

  async reset(key: string): Promise<void> {
    if (this.client)
      await this.client.del(`${this.config.prefix}:rate:{${key}}`);
    else this.counters.delete(key);
  }

  async resetOnce(key: string, operationId: string): Promise<void> {
    // Both keys share the same Redis Cluster hash tag; DEL and deduplication are atomic.
    if (this.config.redisMode !== 'disabled') {
      if (!this.client)
        throw new ServiceUnavailableException('Redis unavailable');
      await this.client.eval(
        RESET_ONCE_SCRIPT,
        2,
        `${this.config.prefix}:rate:{${key}}`,
        `${this.config.prefix}:reset:{${key}}:${operationId}`,
        7 * 86400,
      );
      return;
    }
    const now = Date.now();
    for (const [id, expires] of this.resetOperations)
      if (expires <= now) this.resetOperations.delete(id);
    if (this.resetOperations.has(operationId)) return;
    if (this.resetOperations.size >= 10000)
      throw new ServiceUnavailableException('Reset capacity reached');
    this.counters.delete(key);
    this.resetOperations.set(operationId, now + 7 * 86400000);
  }

  async cached<T>(
    namespace: string,
    key: string,
    load: () => Promise<T>,
    ttl = 60,
  ): Promise<T> {
    if (!this.client) return load();
    let cacheKey: string;
    try {
      cacheKey = `${this.config.prefix}:cache:${namespace}:${await this.cacheVersion(namespace)}:${key}`;
      const value = await this.client.get(cacheKey);
      if (value) return JSON.parse(value) as T;
    } catch {
      return load();
    }
    const value = await load();
    try {
      await this.client.set(cacheKey, JSON.stringify(value), 'EX', ttl);
    } catch {
      this.logger.warn('Cache write skipped');
    }
    return value;
  }
}
