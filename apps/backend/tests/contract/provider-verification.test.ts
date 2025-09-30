import { Verifier, VerifierOptions } from '@pact-foundation/pact';
import path from 'path';

describe('Pact Provider Verification', () => {
  const verifierOptions: VerifierOptions = {
    provider: 'StrellerMinds-Backend',
    providerBaseUrl: 'http://localhost:3000',
    pactUrls: [path.resolve(process.cwd(), 'pacts')],
    pactBrokerUrl: process.env.PACT_BROKER_URL,
    pactBrokerToken: process.env.PACT_BROKER_TOKEN,
    publishVerificationResult: true,
    providerVersion: process.env.npm_package_version || '1.0.0',
    providerVersionBranch: process.env.GITHUB_REF_NAME || 'main',
    consumerVersionSelectors: [
      {
        mainBranch: true,
      },
      {
        deployedOrReleased: true,
      },
    ],
    enablePending: true,
    includeWipPactsSince: '2023-01-01',
    logLevel: 'info',
  };

  it('should verify all contracts', () => {
    return new Verifier().verifyProvider(verifierOptions);
  });
});
