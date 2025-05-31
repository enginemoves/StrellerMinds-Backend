import { MentorshipPreference } from '../entities/mentorship-preference.entity';

export interface MatchScore {
  mentorId: string;
  menteeId: string;
  score: number;
  matchDetails: {
    skillMatchScore: number;
    interestMatchScore: number;
    availabilityScore: number;
    experienceLevelScore: number;
    overallScore: number;
    matchedSkills: string[];
    matchedInterests: string[];
  };
}

export interface MatchingParameters {
  skillWeight?: number;
  interestWeight?: number;
  availabilityWeight?: number;
  experienceLevelWeight?: number;
  minScore?: number;
  prioritySkills?: string[];
  priorityInterests?: string[];
  limit?: number;
}

export interface MatchingResult {
  matches: MatchScore[];
  timestamp: Date;
  parameters: MatchingParameters;
}

export interface MatchingAlgorithm {
  findMatches(
    mentee: MentorshipPreference,
    mentors: MentorshipPreference[],
    parameters?: MatchingParameters,
  ): Promise<MatchingResult>;
  
  calculateCompatibilityScore(
    mentee: MentorshipPreference,
    mentor: MentorshipPreference,
    parameters?: MatchingParameters,
  ): Promise<MatchScore>;
}
