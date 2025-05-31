**StrellerMinds-Backend**

StrellerMinds-Backend is the NestJS-based API server powering StarkMinds, a pioneering blockchain education platform built on Stellar. This repository provides secure, scalable endpoints for user authentication, course management, data persistence, and integration with Stellar smart contracts.

**Features**  
• Secure JWT-based authentication and authorization  
• RESTful APIs for managing courses and user data  
• Integration with Stellar smart contracts for on-chain interactions  
• Modular architecture with environment-based configuration  
• Comprehensive logging, error handling, and testing (Jest)  
• Auto-generated API docs with Swagger  
• CI/CD pipeline integration for continuous delivery

**Getting Started**

_Prerequisites:_  
• Node.js v14 or higher  
• npm  
• PostgreSQL
• Docker (optional, for containerized development)

_Installation:_  
1. Clone the repository:  
   `git clone https://github.com/your-username/strellerminds-backend.git`  
2. Change to the project directory:  
   `cd starkminds-backend`  
3. Install dependencies:  
   `npm install`  
4. Create a `.env` file based on the provided `.env.example`.  
5. Start the development server:  
   `npm run start:dev`

_Contribution Guidelines:_  
• Fork the repository and create a feature branch.  
• Follow the established ESLint/Prettier configurations.  
• Write tests for new features and ensure all existing tests pass.  
• Submit a detailed pull request describing your changes.

**Contact**  
For questions or feedback, please open an issue or contact the maintainers.

# User Data Retention Policy

## Overview

This document outlines the data retention policies for user accounts within our platform, focusing on how user data is handled during account deactivation and deletion processes. These policies have been designed to comply with privacy regulations while maintaining the integrity of blockchain credentials where necessary.

## Account States

User accounts may exist in one of the following states:

1. **Active** - Normal operational state
2. **Deactivated** - Temporarily suspended but recoverable
3. **Pending Deletion** - Awaiting confirmation for permanent deletion
4. **Deleted** - Permanently removed (soft-deleted with data scrubbing)

## Data Categories

User data is categorized as follows:

### Personal Identifiable Information (PII)
- Full name
- Email address
- Profile picture
- Biography
- Other personal details

### Account Data
- User ID
- Account credentials (password hash)
- Role information
- Account creation and activity timestamps

### Blockchain Credentials
- Wallet address
- Chain ID
- Wallet type
- Associated blockchain credentials

### Activity Data
- Learning progress
- Course completion records
- Transaction history (if applicable)

## Retention Periods

| Data Category | Active Account | Deactivated Account | Post-Deletion |
|---------------|----------------|---------------------|--------------|
| PII | Retained | Retained | Scrubbed immediately |
| Account Data | Retained | Retained | Soft-deleted for 30 days, then hard-deleted |
| Blockchain Credentials | Retained | Retained | Preserved indefinitely for compliance* |
| Activity Data | Retained | Retained | Soft-deleted for 30 days, then hard-deleted |

\* *Retention of blockchain credentials is necessary for compliance with financial regulations and to maintain the integrity of blockchain transactions. These credentials are dissociated from personal information upon account deletion.*

## Data Handling Procedures

### Account Deactivation

When an account is deactivated:
- All data is preserved
- Access to the account is suspended
- User can reactivate the account at any time
- Deactivation is logged for audit purposes

### Account Deletion Request

When a user requests account deletion:
1. User must confirm deletion via a secure link sent to their email
2. Account is marked as "Pending Deletion"
3. User has 24 hours to cancel the deletion request
4. Request is logged for audit purposes

### Account Deletion Process

When account deletion is confirmed:
1. Personal identifiable information is immediately scrubbed:
   - Name fields are replaced with "[REDACTED]"
   - Email is anonymized
   - Profile picture and bio are removed
2. Account is soft-deleted and marked as "Deleted"
3. Blockchain credentials are preserved but dissociated from personal information
4. Learning progress data is soft-deleted
5. Deletion is logged for audit purposes
6. Complete data purge is scheduled after the retention period

### Final Data Purge

After the 30-day retention period:
1. All remaining user data is permanently deleted from the system
2. Blockchain credentials are reviewed and retained only if necessary for legal compliance
3. Purge is logged for audit purposes

## Compliance Considerations

This data retention policy is designed to comply with:
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Other applicable privacy regulations

The policy provides users with the "right to be forgotten" while maintaining necessary data for legal and operational requirements.

## Audit Trail

All account state changes and data handling operations are logged with:
- Action type
- Timestamp
- User ID (or system identifier for automated processes)
- Details of the action performed

Audit logs are retained for a minimum of 2 years for compliance purposes.

## Special Considerations for Blockchain Data

Due to the immutable nature of blockchain technology:
- Transactions recorded on the blockchain cannot be removed
- Wallet addresses and public keys remain on the blockchain
- Our system preserves the minimum necessary information to maintain blockchain integrity
- All preserved blockchain data is dissociated from personal information

## Policy Review

This data retention policy is reviewed annually and updated as necessary to comply with evolving regulations and platform requirements.
