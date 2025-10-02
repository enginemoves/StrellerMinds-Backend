export const IPFS_DEFAULT_OPTIONS = {
  apiUrl: process.env.IPFS_API_URL || 'http://localhost:5001',
  projectId: process.env.IPFS_PROJECT_ID,
  projectSecret: process.env.IPFS_PROJECT_SECRET,
  pin: (process.env.IPFS_PIN ?? 'true') === 'true',
  maxRetries: Number(process.env.IPFS_MAX_RETRIES ?? 3),
};

export default IPFS_DEFAULT_OPTIONS;
