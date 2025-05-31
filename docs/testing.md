# Testing Guide

This document outlines the testing practices and patterns used in the StrellerMinds Backend project.

## Test Structure

```
test/
├── unit/               # Unit tests
│   ├── services/      # Service tests
│   ├── controllers/   # Controller tests
│   └── utils/         # Utility function tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
└── utils/            # Test utilities and helpers
```

## Running Tests

- `npm test` - Run all unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

## Testing Patterns

### Unit Tests
- Test individual components in isolation
- Use mocks for dependencies
- Focus on business logic
- One test file per component

### Integration Tests
- Test component interactions
- Use test database
- Mock external services

### E2E Tests
- Test complete flows
- Use test database
- Test API endpoints

## Best Practices

1. **Arrange-Act-Assert**: Structure tests in three parts
   - Arrange: Set up test data and conditions
   - Act: Execute the code being tested
   - Assert: Verify the results

2. **Naming Conventions**
   - Test files: `*.spec.ts` for unit tests, `*.e2e-spec.ts` for E2E tests
   - Test descriptions should clearly state what is being tested

3. **Mocking**
   - Use Jest's mock functions for dependencies
   - Create reusable mock factories
   - Mock external services and databases

4. **Coverage**
   - Aim for high coverage but focus on critical paths
   - Use coverage reports to identify untested code

## Example Test

```typescript
import { Test } from '@nestjs/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService],
    }).compile();
    
    service = module.get(UserService);
  });
  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Test Utilities

Common test utilities are available in the `test/utils` directory:
- Mock factories
- Test data generators
- Common test setup functions
