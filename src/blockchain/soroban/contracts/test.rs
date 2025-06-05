#![cfg(test)]

use super::{CourseAchievementsContract, CourseAchievementsContractClient, Achievement, Error};
use soroban_sdk::{Env, Symbol, Vec};

#[test]
fn test_issue_achievement() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CourseAchievementsContract);
    let client = CourseAchievementsContractClient::new(&env, &contract_id);

    let course_id = 101;
    let user_id = 1;
    let metadata_uri = Symbol::new(&env, "ipfs://QmW");

    let result = client.issue(&course_id, &user_id, &metadata_uri);
    assert!(result.is_ok());

    let achievement = result.unwrap();
    assert_eq!(achievement.id, 1);
    assert_eq!(achievement.course_id, course_id);
    assert_eq!(achievement.user_id, user_id);
    assert_eq!(achievement.metadata_uri, metadata_uri);

    let achievements = client.get_user_achievements(&user_id).unwrap();
    assert_eq!(achievements.len(), 1);
    assert_eq!(achievements.get(0).unwrap().id, 1);
}

#[test]
fn test_verify_achievement() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CourseAchievementsContract);
    let client = CourseAchievementsContractClient::new(&env, &contract_id);

    let course_id = 101;
    let user_id = 1;
    let metadata_uri = Symbol::new(&env, "ipfs://QmW");

    let issued_achievement = client.issue(&course_id, &user_id, &metadata_uri).unwrap();

    let is_verified = client.verify(&issued_achievement.id, &user_id).unwrap();
    assert!(is_verified);

    let is_not_verified = client.verify(&issued_achievement.id, &2).unwrap(); // Wrong user
    assert!(!is_not_verified);

    let is_not_verified_wrong_id = client.verify(&999, &user_id).unwrap(); // Wrong achievement ID
    assert!(!is_not_verified_wrong_id);
}

#[test]
fn test_get_user_achievements() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CourseAchievementsContract);
    let client = CourseAchievementsContractClient::new(&env, &contract_id);

    let user1_id = 1;
    let user2_id = 2;

    // Issue achievements for user 1
    client.issue(&101, &user1_id, &Symbol::new(&env, "ipfs://QmW1")).unwrap();
    client.issue(&102, &user1_id, &Symbol::new(&env, "ipfs://QmW2")).unwrap();

    // Issue an achievement for user 2
    client.issue(&201, &user2_id, &Symbol::new(&env, "ipfs://QmW3")).unwrap();

    let user1_achievements = client.get_user_achievements(&user1_id).unwrap();
    assert_eq!(user1_achievements.len(), 2);
    assert_eq!(user1_achievements.get(0).unwrap().user_id, user1_id);
    assert_eq!(user1_achievements.get(1).unwrap().user_id, user1_id);

    let user2_achievements = client.get_user_achievements(&user2_id).unwrap();
    assert_eq!(user2_achievements.len(), 1);
    assert_eq!(user2_achievements.get(0).unwrap().user_id, user2_id);

    let user3_achievements = client.get_user_achievements(&3).unwrap();
    assert_eq!(user3_achievements.len(), 0);
}