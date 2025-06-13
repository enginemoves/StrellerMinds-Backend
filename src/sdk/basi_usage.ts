// examples/typescript/basic-usage.ts
import { NestJSApiSDK } from '@your-org/nestjs-api-sdk';

async function main() {
  // Initialize SDK
  const sdk = new NestJSApiSDK({
    baseURL: 'https://api.yourapp.com',
    apiKey: 'your-api-key',
    debug: true
  });

  try {
    // List users
    const users = await sdk.users.list({ page: 1, limit: 10 });
    console.log('Users:', users.data);

    // Create a user
    const newUser = await sdk.users.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'securepassword'
    });
    console.log('Created user:', newUser.data);

    // Update user
    const updatedUser = await sdk.users.update(newUser.data.id, {
      name: 'John Smith'
    });
    console.log('Updated user:', updatedUser.data);

    // Custom request
    const customData = await sdk.get('/custom-endpoint');
    console.log('Custom data:', customData.data);

  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error ${error.status}: ${error.message}`);
      console.error('Error code:', error.code);
      console.error('Details:', error.details);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

main();