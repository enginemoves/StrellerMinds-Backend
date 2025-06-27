# Backup and Recovery Process

## Database Recovery

### Full Database Restore

```bash
# Stop the application
npm run stop

# Drop existing database (CAUTION!)
dropdb -h localhost -p 5432 -U postgres streller_minds

# Create new database
createdb -h localhost -p 5432 -U postgres streller_minds

# Restore from backup
psql -h localhost -p 5432 -U postgres -d streller_minds -f ./backups/db-backup-YYYY-MM-DDTHH-MM-SS.sql

# Start the application
npm run start:prod
```
