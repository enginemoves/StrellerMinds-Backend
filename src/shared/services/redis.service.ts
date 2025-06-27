import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('cache.redis.host'),
      port: this.configService.get<number>('cache.redis.port'),
      password: this.configService.get<string>('cache.redis.password'),
      db: this.configService.get<number>('cache.redis.db'),
    });
  }

  onModuleDestroy() {
    if (this.client) this.client.quit();
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  // Token blacklisting
  async blacklistToken(token: string, expiresIn: number) {
    await this.set(`blacklist:${token}`, '1', expiresIn);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.exists(`blacklist:${token}`);
  }
} 