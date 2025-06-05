# Course Achievements Soroban Smart Contract

This Soroban smart contract is designed to track and verify course achievements on the Stellar network. It allows for the issuance of unique achievements to users upon completion of courses, provides a mechanism to verify these achievements, and enables retrieval of all achievements for a given user.

## Contract Structure

The contract defines an `Achievement` struct and implements the `CourseAchievementsContract` with the following functions:

- `issue(env: Env, course_id: u32, user_id: u32, metadata_uri: Symbol) -> Result<Achievement, Error>`: Issues a new course achievement to a user. The `metadata_uri` can point to external metadata, such as an IPFS hash, describing the achievement.
- `verify(env: Env, achievement_id: u32, user_id: u32) -> Result<bool, Error>`: Verifies if a specific achievement belongs to a given user.
- `get_user_achievements(env: Env, user_id: u32) -> Result<Vec<Achievement>, Error>`: Retrieves all achievements issued to a specific user.

## Achievement Metadata

The `metadata_uri` field in the `Achievement` struct is intended to store a URI (e.g., an IPFS hash or a URL) that points to off-chain metadata for the achievement. This metadata can include details such as:

- Achievement name
- Description
- Image/icon
- Issuing organization
- Date of completion
- Criteria for achievement

## Error Handling

The contract defines an `Error` enum to handle specific error conditions:

- `NotFound`: Indicates that a requested achievement or resource was not found.
- `Unauthorized`: Indicates that the caller does not have the necessary permissions to perform an action (though not explicitly used in the current functions, it's a placeholder for future access control).

## Usage

### Issuing an Achievement

To issue an achievement, call the `issue` function with the `course_id`, `user_id`, and a `metadata_uri`. The contract will generate a unique `id` and record the `issued_at` timestamp.

```rust
// Example of issuing an achievement
let achievement = client.issue(&course_id, &user_id, &metadata_uri).unwrap();
```

### Verifying an Achievement

To verify an achievement, call the `verify` function with the `achievement_id` and `user_id`. It will return `true` if the user possesses that specific achievement, and `false` otherwise.

```rust
// Example of verifying an achievement
let is_verified = client.verify(&achievement_id, &user_id).unwrap();
```

### Retrieving User Achievements

To get all achievements for a user, call the `get_user_achievements` function with the `user_id`. It will return a `Vec` of `Achievement` structs.

```rust
// Example of retrieving user achievements
let user_achievements = client.get_user_achievements(&user_id).unwrap();
```

## Development and Testing

The contract includes comprehensive unit tests in `test.rs` to ensure the correctness of its functions. These tests cover:

- Issuance of new achievements.
- Verification of existing achievements.
- Retrieval of achievements for a specific user.

To run tests, navigate to the `src/blockchain/soroban/contracts` directory and use the Cargo test command (requires Rust and Soroban SDK setup):

```bash
cargo test
```

## Best Practices

- **Immutability**: Once an achievement is issued, its core properties are immutable.
- **Storage Management**: The contract uses `env.storage().instance().extend_ttl` to manage the time-to-live of the contract instance, ensuring its data persists.
- **Clear Functionality**: Each function has a clear and single responsibility.
- **Comprehensive Testing**: Unit tests cover the main functionalities and edge cases.