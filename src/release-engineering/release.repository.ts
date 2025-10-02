import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Release } from './entities/release.entity';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class ReleaseRepository extends Repository<Release> {
  constructor(@InjectDataSource() private dataSource: DataSource) {
    super(Release, dataSource.createEntityManager());
  }

  // optional place for custom queries
}
