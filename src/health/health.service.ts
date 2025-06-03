import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(private dataSource: DataSource) {}

  async checkDatabase(): Promise<{ database: string; timestamp: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { database: 'connected', timestamp: new Date().toISOString() };
    } catch (error) {
      return { database: 'disconnected', timestamp: new Date().toISOString() };
    }
  }
}
