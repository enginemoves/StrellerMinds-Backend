# 🌟 StrellerMinds Backend

A blockchain-ready NestJS backend for interacting with the [Stellar Network](https://stellar.org) and [Soroban Smart Contracts](https://soroban.stellar.org/). This project includes full mocking support for local testing and a scalable structure for extending blockchain functionality.

---

## 🚀 Features

- ✅ Stellar account and transaction management
- ✅ Soroban smart contract invocation support (mock-ready)
- ✅ Configurable mocking for unit testing

---

## 🏗️ Project Structure

\`\`\`bash
src/
│
├── blockchain/
│ ├── stellar/ # Stellar client + service
│ ├── soroban/ # Soroban client + service
│ └── blockchain.module.ts
│
├── test/
│ └── mocks/ # SDK mocks for unit testing
│
├── app.module.ts
└── main.ts
\`\`\`

---

## 🧰 Technologies Used

- [NestJS](https://nestjs.com)
- [TypeScript](https://www.typescriptlang.org/)
- [Stellar SDK](https://www.stellar.org/developers/reference/)
- [Jest](https://jestjs.io/) for unit testing

---

## 🔧 Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/your-username/strellerminds-backend.git
cd strellerminds-backend
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Setup Environment Variables

Create a \`.env\` file and add:

\`\`\`env
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
\`\`\`

You can also use the public testnet without the \`.env\` file.

---

## 🧪 Running Tests

\`\`\`bash
npm run test
\`\`\`

This project uses **mocked SDKs** to run unit tests without real network calls. You’ll find them in:

\`\`\`bash
test/mocks/stellar-sdk.mock.ts
test/mocks/soroban.mock.ts
\`\`\`

---

## 📂 Mocking Guide

### Stellar Mock

- Mocks \`Keypair\`, \`Server\`, \`TransactionBuilder\`, and \`Operation\`
- Located at: \`test/mocks/stellar-sdk.mock.ts\`

### Soroban Mock

- Simulates smart contract method calls
- Located at: \`test/mocks/soroban.mock.ts\`

---

## 🧪 Mock Usage

To ensure fast, reliable, and isolated tests, the app uses **custom mocks** for both the Stellar SDK and Soroban client logic.

### 📁 Mock Location

\`\`\`
test/mocks/
├── stellar-sdk.mock.ts // Mocks for Stellar blockchain
└── soroban.mock.ts // Mocks for Soroban smart contract client
\`\`\`

### 🛠️ How It Works

Mocks are injected using \`jest.mock\` or \`provide: useValue\`.

#### Example: Stellar

\`\`\`ts
jest.mock('@stellar/stellar-sdk', () => mockStellarSdk);
\`\`\`

#### Example: Soroban

\`\`\`ts
{ provide: SorobanClient, useValue: mockSorobanClient }
\`\`\`

### ✅ Supported Mock Scenarios

#### Stellar

| Method                         | Behavior                          |
| ------------------------------ | --------------------------------- |
| \`loadAccount()\`              | Returns a mock account            |
| \`submitTransaction()\`        | Returns a mocked transaction hash |
| \`TransactionBuilder.build()\` | Returns a signed transaction stub |
| \`Keypair.fromSecret()\`       | Returns a mock keypair object     |
| \`Operation.payment()\`        | Returns mock payment data         |

#### Soroban

| Method               | Behavior                            |
| -------------------- | ----------------------------------- |
| \`invokeContract()\` | Returns mock result or throws error |

### 💥 Simulated Failure Example

\`\`\`ts
mockSorobanClient.invokeContract.mockImplementationOnce(() => {
throw new Error('Contract call failed');
});
\`\`\`

### 🔁 Customizing Mock Behavior

\`\`\`ts
mockStellarSdk.Server().submitTransaction.mockImplementationOnce(() => {
throw new Error('Horizon error');
});
\`\`\`

## 📌 Design Notes

- Services are cleanly decoupled from SDKs via injected clients.
- Mocks are configurable for success/failure scenarios.
- Tests focus on logic, not blockchain uptime.
