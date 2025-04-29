import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: +process.env.REDIS_PORT,
    });
  }

  async set(key: string, value: string, ttl?: number) {
    await this.client.set(key, value, 'EX', ttl);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async scan(pattern: string): Promise<string[]> {
    let cursor = '0';
    const keys: string[] = [];

    do {
      const [newCursor, matchedKeys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );

      cursor = newCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    return keys;
  }
}
