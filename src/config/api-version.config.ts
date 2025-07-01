export const apiVersionConfig = {
  defaultVersion: 'v1',
  supportedVersions: ['v1', 'v2'],
  deprecatedVersions: [
    {
      version: 'v1',
      deprecatedIn: '2024-01-01',
      removedIn: '2024-12-31',
      migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2'
    }
  ]
};

