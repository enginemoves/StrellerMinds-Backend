import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipPreference, UserRole } from '../entities/mentorship-preference.entity';
import { MentorAvailability } from '../entities/mentor-availability.entity';
import { MatchingAlgorithm, MatchingParameters, MatchingResult, MatchScore } from '../interfaces/matching-algorithm.interface';

@Injectable()
export class MatchingService implements MatchingAlgorithm {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(MentorshipPreference)
    private readonly preferenceRepository: Repository<MentorshipPreference>,
    @InjectRepository(MentorAvailability)
    private readonly availabilityRepository: Repository<MentorAvailability>,
  ) {}

  /**
   * Find potential mentor matches for a mentee
   */
  async findMatches(
    mentee: MentorshipPreference,
    mentors: MentorshipPreference[],
    parameters: MatchingParameters = {},
  ): Promise<MatchingResult> {
    const {
      limit = 5,
      minScore = 0,
    } = parameters;

    this.logger.log(`Finding matches for mentee ${mentee.userId} with ${mentors.length} potential mentors`);

    // Calculate compatibility scores for each mentor
    const matchPromises = mentors.map(mentor => 
      this.calculateCompatibilityScore(mentee, mentor, parameters)
    );
    
    const allMatches = await Promise.all(matchPromises);
    
    // Filter by minimum score and sort by score (descending)
    const filteredMatches = allMatches
      .filter(match => match.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      matches: filteredMatches,
      timestamp: new Date(),
      parameters,
    };
  }

  /**
   * Calculate compatibility score between a mentee and a mentor
   */
  async calculateCompatibilityScore(
    mentee: MentorshipPreference,
    mentor: MentorshipPreference,
    parameters: MatchingParameters = {},
  ): Promise<MatchScore> {
    const {
      skillWeight = 0.4,
      interestWeight = 0.3,
      availabilityWeight = 0.2,
      experienceLevelWeight = 0.1,
      prioritySkills = [],
      priorityInterests = [],
    } = parameters;

    // Calculate skill match score
    const skillMatchScore = this.calculateSkillMatchScore(
      mentee.skills || [],
      mentor.skills || [],
      mentee.skillWeights || {},
      prioritySkills,
    );

    // Calculate interest match score
    const interestMatchScore = this.calculateInterestMatchScore(
      mentee.interests || [],
      mentor.interests || [],
      mentee.interestWeights || {},
      priorityInterests,
    );

    // Calculate availability score
    const availabilityScore = await this.calculateAvailabilityScore(mentor.userId);

    // Calculate experience level score (prefer mentors with higher experience)
    const experienceLevelScore = this.calculateExperienceLevelScore(mentor.experienceLevel || 0);

    // Calculate overall score using weighted average
    const overallScore = (
      skillMatchScore * skillWeight +
      interestMatchScore * interestWeight +
      availabilityScore * availabilityWeight +
      experienceLevelScore * experienceLevelWeight
    ) * 100; // Convert to 0-100 scale

    // Get matched skills and interests
    const matchedSkills = this.getMatchedItems(mentee.skills || [], mentor.skills || []);
    const matchedInterests = this.getMatchedItems(mentee.interests || [], mentor.interests || []);

    return {
      mentorId: mentor.userId,
      menteeId: mentee.userId,
      score: Math.round(overallScore),
      matchDetails: {
        skillMatchScore: Math.round(skillMatchScore * 100),
        interestMatchScore: Math.round(interestMatchScore * 100),
        availabilityScore: Math.round(availabilityScore * 100),
        experienceLevelScore: Math.round(experienceLevelScore * 100),
        overallScore: Math.round(overallScore),
        matchedSkills,
        matchedInterests,
      },
    };
  }

  /**
   * Calculate skill match score between mentee and mentor
   */
  private calculateSkillMatchScore(
    menteeSkills: string[],
    mentorSkills: string[],
    skillWeights: Record<string, number>,
    prioritySkills: string[],
  ): number {
    if (menteeSkills.length === 0 || mentorSkills.length === 0) {
      return 0;
    }

    let totalWeight = 0;
    let weightedMatches = 0;

    for (const skill of menteeSkills) {
      // Determine weight for this skill
      let weight = skillWeights[skill] || 1;
      
      // Boost priority skills
      if (prioritySkills.includes(skill)) {
        weight *= 1.5;
      }
      
      totalWeight += weight;
      
      // Check if mentor has this skill
      if (mentorSkills.includes(skill)) {
        weightedMatches += weight;
      }
    }

    return totalWeight > 0 ? weightedMatches / totalWeight : 0;
  }

  /**
   * Calculate interest match score between mentee and mentor
   */
  private calculateInterestMatchScore(
    menteeInterests: string[],
    mentorInterests: string[],
    interestWeights: Record<string, number>,
    priorityInterests: string[],
  ): number {
    if (menteeInterests.length === 0 || mentorInterests.length === 0) {
      return 0;
    }

    let totalWeight = 0;
    let weightedMatches = 0;

    for (const interest of menteeInterests) {
      // Determine weight for this interest
      let weight = interestWeights[interest] || 1;
      
      // Boost priority interests
      if (priorityInterests.includes(interest)) {
        weight *= 1.5;
      }
      
      totalWeight += weight;
      
      // Check if mentor has this interest
      if (mentorInterests.includes(interest)) {
        weightedMatches += weight;
      }
    }

    return totalWeight > 0 ? weightedMatches / totalWeight : 0;
  }

  /**
   * Calculate availability score for a mentor
   */
  private async calculateAvailabilityScore(mentorId: string): Promise<number> {
    // Get mentor's availability slots for the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const availabilitySlots = await this.availabilityRepository.count({
      where: {
        mentorId,
        isActive: true,
        startTime: new Date(),
        endTime: thirtyDaysFromNow,
      },
    });

    // Score based on number of available slots in the next 30 days
    // 0 slots = 0, 1-2 slots = 0.3, 3-5 slots = 0.6, 6+ slots = 1.0
    if (availabilitySlots === 0) return 0;
    if (availabilitySlots <= 2) return 0.3;
    if (availabilitySlots <= 5) return 0.6;
    return 1.0;
  }

  /**
   * Calculate experience level score
   */
  private calculateExperienceLevelScore(experienceLevel: number): number {
    // Normalize experience level to 0-1 scale (assuming experience is 0-10)
    return experienceLevel / 10;
  }

  /**
   * Get matched items between two arrays
   */
  private getMatchedItems(items1: string[], items2: string[]): string[] {
    return items1.filter(item => items2.includes(item));
  }

  /**
   * Find active mentors for matching
   */
  async findActiveMentors(): Promise<MentorshipPreference[]> {
    return this.preferenceRepository.find({
      where: {
        role: UserRole.MENTOR,
        isActive: true,
      },
    });
  }

  /**
   * Find active mentees for matching
   */
  async findActiveMentees(): Promise<MentorshipPreference[]> {
    return this.preferenceRepository.find({
      where: {
        role: UserRole.MENTEE,
        isActive: true,
      },
    });
  }
}
