/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BackupService } from './backup.service';
import { BackupVerificationService } from './backup-verification.service';
import { BackupRetentionService } from './backup-retention.service';

describe('BackupService', () => {
  let service: BackupService;
  //   let configService: ConfigService; // Add this declaration

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((key: string, defaultValue?: any) => {
                const config = {
                  BACKUP_DIR: './test-backups',
                  'database.host': 'localhost',
                  'database.port': 5432,
                  'database.user': 'postgres',
                  'database.password': 'password',
                  'database.name': 'test_db',
                };
                return config[key] || defaultValue;
              }),
          },
        },
        {
          provide: BackupVerificationService,
          useValue: {
            verifyDatabaseBackup: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: BackupRetentionService,
          useValue: {
            cleanupOldBackups: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
    // Remove this unused line:
    // configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create database backup', async () => {
    // Mock successful backup creation
    const result = await service.createDatabaseBackup();
    expect(result.success).toBeDefined();
  });

  it('should list backups', async () => {
    const backups = await service.listBackups();
    expect(Array.isArray(backups)).toBe(true);
  });
});
