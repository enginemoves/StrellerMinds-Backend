#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Achievement {
    pub id: u32,
    pub course_id: u32,
    pub user_id: u32,
    pub issued_at: u64,
    pub metadata_uri: Symbol,
}

#[contract]
pub struct CourseAchievementsContract;

#[contractimpl]
impl CourseAchievementsContract {
    /// Issues a new course achievement.
    ///
    /// # Arguments
    ///
    /// * `env` - The contract environment.
    /// * `course_id` - The ID of the course.
    /// * `user_id` - The ID of the user receiving the achievement.
    /// * `metadata_uri` - A URI pointing to the achievement's metadata (e.g., IPFS hash).
    pub fn issue(env: Env, course_id: u32, user_id: u32, metadata_uri: Symbol) -> Result<Achievement, Error> {
        let mut achievements: Vec<Achievement> = env.storage().instance().get(&symbol_short!("achievements")).unwrap_or(Vec::new(&env));
        let id = achievements.len() as u32 + 1;
        let issued_at = env.ledger().timestamp();

        let achievement = Achievement {
            id,
            course_id,
            user_id,
            issued_at,
            metadata_uri,
        };

        achievements.push_back(achievement.clone());
        env.storage().instance().set(&symbol_short!("achievements"), &achievements);
        env.storage().instance().extend_ttl(1000, 1000);

        Ok(achievement)
    }

    /// Verifies if a user has a specific achievement.
    ///
    /// # Arguments
    ///
    /// * `env` - The contract environment.
    /// * `achievement_id` - The ID of the achievement to verify.
    /// * `user_id` - The ID of the user to verify against.
    pub fn verify(env: Env, achievement_id: u32, user_id: u32) -> Result<bool, Error> {
        let achievements: Vec<Achievement> = env.storage().instance().get(&symbol_short!("achievements")).unwrap_or(Vec::new(&env));

        for achievement in achievements.iter() {
            if achievement.id == achievement_id && achievement.user_id == user_id {
                return Ok(true);
            }
        }
        Ok(false)
    }

    /// Retrieves all achievements for a given user.
    ///
    /// # Arguments
    ///
    /// * `env` - The contract environment.
    /// * `user_id` - The ID of the user.
    pub fn get_user_achievements(env: Env, user_id: u32) -> Result<Vec<Achievement>, Error> {
        let achievements: Vec<Achievement> = env.storage().instance().get(&symbol_short!("achievements")).unwrap_or(Vec::new(&env));
        let mut user_achievements = Vec::new(&env);

        for achievement in achievements.iter() {
            if achievement.user_id == user_id {
                user_achievements.push_back(achievement.clone());
            }
        }
        Ok(user_achievements)
    }
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotFound = 1,
    Unauthorized = 2,
}