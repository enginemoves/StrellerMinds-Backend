// tests/typescript/client.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { NestJSApiSDK, ApiError } from '../../packages/typescript/src';

describe('NestJS API SDK', () => {
  let sdk: NestJSApiSDK;
  const baseURL = 'https://api.example.com';

  beforeEach(() => {
    sdk = new NestJSApiSDK({
      baseURL,
      apiKey: 'test-api-key',
      debug: false
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Authentication', () => {
    it('should include API key in requests', async () => {
      const scope = nock(baseURL)
        .get('/test')
        .matchHeader('Authorization', 'Bearer test-api-key')
        .reply(200, { message: 'success' });

      await sdk.get('/test');
      expect(scope.isDone()).toBe(true);
    });

    it('should update API key dynamically', async () => {
      sdk.setApiKey('new-api-key');
      
      const scope = nock(baseURL)
        .get('/test')
        .matchHeader('Authorization', 'Bearer new-api-key')
        .reply(200, { message: 'success' });

      await sdk.get('/test');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors correctly', async () => {
      nock(baseURL)
        .get('/error')
        .reply(400, {
          message: 'Bad Request',
          code: 'VALIDATION_ERROR',
          details: { field: 'email' }
        });

      try {
        await sdk.get('/error');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('should retry on server errors', async () => {
      nock(baseURL)
        .get('/retry')
        .reply(500, 'Internal Server Error')
        .get('/retry')
        .reply(200, { message: 'success' });

      const response = await sdk.get('/retry');
      expect(response.success).toBe(true);
    });
  });

  describe('Users Resource', () => {
    it('should list users', async () => {
      const mockUsers = [
        { id: '1', name: 'John Doe', email: 'john@example.com' }
      ];

      nock(baseURL)
        .get('/users')
        .reply(200, mockUsers);

      const response = await sdk.users.list();
      expect(response.data).toEqual(mockUsers);
    });

    it('should create a user', async () => {
      const newUser = { name: 'Jane Doe', email: 'jane@example.com', password: 'password' };
      const createdUser = { id: '2', ...newUser };

      nock(baseURL)
        .post('/users', newUser)
        .reply(201, createdUser);

      const response = await sdk.users.create(newUser);
      expect(response.data).toEqual(createdUser);
      expect(response.status).toBe(201);
    });
  });
});