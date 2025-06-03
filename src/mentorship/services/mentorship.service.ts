import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipPreference, UserRole } from '../entities/mentorship-preference.entity';
import { MentorshipMatch, MatchStatus, MatchType } from '../entities/mentorship-match.entity';
import { MentorAvailability } from '../entities/mentor-availability.entity';
import { CreatePreferenceDto } from '../dto/create-preference.dto';
import { CreateAvailabilityDto } from '../dto/create-availability.dto';
import { MatchRequestDto } from '../dto/match-request.dto';
import { UpdateMatchStatusDto } from '../dto/update-match-status.dto';
import { MatchingService } from './matching.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class MentorshipService {
  private readonly logger = new Logger(MentorshipService.name);

  constructor(
    @InjectRepository(MentorshipPreference)
    private readonly preferenceRepository: Repository<MentorshipPreference>,
    @InjectRepository(MentorshipMatch)
    private readonly matchRepository: Repository<MentorshipMatch>,
    @InjectRepository(MentorAvailability)
    private readonly availabilityRepository: Repository<MentorAvailability>,
    private readonly matchingService: MatchingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create or update a user's mentorship preferences
   */
  async createOrUpdatePreference(
    userId: string,
    createPreferenceDto: CreatePreferenceDto,
  ): Promise<MentorshipPreference> {
    // Check if preference already exists
    let preference = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (preference) {
      // Update existing preference
      this.preferenceRepository.merge(preference, createPreferenceDto);
    } else {
      // Create new preference
      preference = this.preferenceRepository.create({
        userId,
        ...createPreferenceDto,
      });
    }

    return this.preferenceRepository.save(preference);
  }

  /**
   * Get a user's mentorship preferences
   */
  async getPreference(userId: string): Promise<MentorshipPreference> {
    const preference = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preference) {
      throw new NotFoundException(`Mentorship preference not found for user ${userId}`);
    }

    return preference;
  }

  /**
   * Create a new availability slot for a mentor
   */
  async createAvailability(
    mentorId: string,
    createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<MentorAvailability> {
    // Verify user is a mentor
    const mentorPreference = await this.preferenceRepository.findOne({
      where: { userId: mentorId, role: UserRole.MENTOR },
    });

    if (!mentorPreference) {
      throw new BadRequestException(`User ${mentorId} is not registered as a mentor`);
    }

    // Create availability slot
    const availability = this.availabilityRepository.create({
      mentorId,
      startTime: new Date(createAvailabilityDto.startTime),
      endTime: new Date(createAvailabilityDto.endTime),
      recurrenceType: createAvailabilityDto.recurrenceType,
      recurrenceInterval: createAvailabilityDto.recurrenceInterval,
      recurrenceEndDate: createAvailabilityDto.recurrenceEndDate 
        ? new Date(createAvailabilityDto.recurrenceEndDate) 
        : null,
      isActive: createAvailabilityDto.isActive ?? true,
      notes: createAvailabilityDto.notes,
      durationMinutes: createAvailabilityDto.durationMinutes ?? 60,
      maxBookingsPerSlot: createAvailabilityDto.maxBookingsPerSlot ?? 1,
      additionalDetails: createAvailabilityDto.additionalDetails,
    });

    return this.availabilityRepository.save(availability);
  }

  /**
   * Get availability slots for a mentor
   */
  async getMentorAvailability(mentorId: string): Promise<MentorAvailability[]> {
    return this.availabilityRepository.find({
      where: { mentorId, isActive: true },
      order: { startTime: 'ASC' },
    });
  }

  /**
   * Create a mentorship match (manual or automatic)
   */
  async createMatch(userId: string, matchRequestDto: MatchRequestDto): Promise<MentorshipMatch | MentorshipMatch[]> {
    const { matchType = MatchType.AUTOMATIC } = matchRequestDto;

    if (matchType === MatchType.MANUAL) {
      return this.createManualMatch(userId, matchRequestDto);
    } else {
      return this.createAutomaticMatches(userId, matchRequestDto);
    }
  }

  /**
   * Create a manual match between specific mentor and mentee
   */
  private async createManualMatch(
    requesterId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MentorshipMatch> {
    const { mentorId, menteeId } = matchRequestDto;

    if (!mentorId || !menteeId) {
      throw new BadRequestException('Both mentorId and menteeId are required for manual matching');
    }

    // Verify mentor and mentee exist and have the correct roles
    const mentorPreference = await this.preferenceRepository.findOne({
      where: { userId: mentorId, role: UserRole.MENTOR },
    });

    const menteePreference = await this.preferenceRepository.findOne({
      where: { userId: menteeId, role: UserRole.MENTEE },
    });

    if (!mentorPreference) {
      throw new BadRequestException(`User ${mentorId} is not registered as a mentor`);
    }

    if (!menteePreference) {
      throw new BadRequestException(`User ${menteeId} is not registered as a mentee`);
    }

    // Check if a match already exists between these users
    const existingMatch = await this.matchRepository.findOne({
      where: [
        { mentorId, menteeId, status: MatchStatus.PENDING },
        { mentorId, menteeId, status: MatchStatus.ACCEPTED },
      ],
    });

    if (existingMatch) {
      throw new BadRequestException(
        `A match already exists between mentor ${mentorId} and mentee ${menteeId} with status ${existingMatch.status}`,
      );
    }

    // Calculate compatibility score
    const compatibilityScore = await this.matchingService.calculateCompatibilityScore(
      menteePreference,
      mentorPreference,
    );

    // Create the match
    const match = this.matchRepository.create({
      mentorId,
      menteeId,
      status: MatchStatus.PENDING,
      matchType: MatchType.MANUAL,
      compatibilityScore: compatibilityScore.score,
      matchDetails: compatibilityScore.matchDetails,
    });

    const savedMatch = await this.matchRepository.save(match);

    // Send notifications to both users
    await this.sendMatchNotifications(savedMatch);

    return savedMatch;
  }

  /**
   * Create automatic matches for a user
   */
  private async createAutomaticMatches(
    userId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MentorshipMatch[]> {
    const { limit = 5, minScore = 70, prioritySkills, priorityInterests } = matchRequestDto;

    // Get user's preference
    const userPreference = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!userPreference) {
      throw new NotFoundException(`Mentorship preference not found for user ${userId}`);
    }

    // Determine if user is mentor or mentee
    if (userPreference.role === UserRole.MENTOR) {
      // Find matching mentees for this mentor
      const mentees = await this.matchingService.findActiveMentees();
      
      const matchingResult = await this.matchingService.findMatches(
        userPreference,
        mentees,
        {
          limit,
          minScore,
          prioritySkills,
          priorityInterests,
        },
      );

      // Create match records for each match
      const matches = await Promise.all(
        matchingResult.matches.map(async (match) => {
          const newMatch = this.matchRepository.create({
            mentorId: userId,
            menteeId: match.menteeId,
            status: MatchStatus.PENDING,
            matchType: MatchType.AUTOMATIC,
            compatibilityScore: match.score,
            matchDetails: match.matchDetails,
          });

          return this.matchRepository.save(newMatch);
        }),
      );

      // Send notifications for each match
      await Promise.all(matches.map(match => this.sendMatchNotifications(match)));

      return matches;
    } else {
      // Find matching mentors for this mentee
      const mentors = await this.matchingService.findActiveMentors();
      
      const matchingResult = await this.matchingService.findMatches(
        userPreference,
        mentors,
        {
          limit,
          minScore,
          prioritySkills,
          priorityInterests,
        },
      );

      // Create match records for each match
      const matches = await Promise.all(
        matchingResult.matches.map(async (match) => {
          const newMatch = this.matchRepository.create({
            mentorId: match.mentorId,
            menteeId: userId,
            status: MatchStatus.PENDING,
            matchType: MatchType.AUTOMATIC,
            compatibilityScore: match.score,
            matchDetails: match.matchDetails,
          });

          return this.matchRepository.save(newMatch);
        }),
      );

      // Send notifications for each match
      await Promise.all(matches.map(match => this.sendMatchNotifications(match)));

      return matches;
    }
  }

  /**
   * Update the status of a mentorship match
   */
  async updateMatchStatus(
    userId: string,
    matchId: string,
    updateMatchStatusDto: UpdateMatchStatusDto,
  ): Promise<MentorshipMatch> {
    const match = await this.matchRepository.findOne({ where: { id: matchId } });

    if (!match) {
      throw new NotFoundException(`Mentorship match ${matchId} not found`);
    }

    // Only mentor or mentee involved can update status
    if (match.mentorId !== userId && match.menteeId !== userId) {
      throw new BadRequestException('User not authorized to update this match status');
    }

    match.status = updateMatchStatusDto.status;
    const updatedMatch = await this.matchRepository.save(match);

    // Notify both parties about status change
    await this.sendStatusUpdateNotification(updatedMatch, userId);

    return updatedMatch;
  }

  /**
   * Internal helper to send notifications on match creation
   */
  private async sendMatchNotifications(match: MentorshipMatch): Promise<void> {
    try {
      // Notify mentor
      await this.notificationsService.sendNotification({
        userId: match.mentorId,
        type: 'MENTORSHIP_MATCH_CREATED',
        payload: {
          menteeId: match.menteeId,
          matchId: match.id,
          compatibilityScore: match.compatibilityScore,
          matchDetails: match.matchDetails,
          matchType: match.matchType,
        },
      });

      // Notify mentee
      await this.notificationsService.sendNotification({
        userId: match.menteeId,
        type: 'MENTORSHIP_MATCH_CREATED',
        payload: {
          mentorId: match.mentorId,
          matchId: match.id,
          compatibilityScore: match.compatibilityScore,
          matchDetails: match.matchDetails,
          matchType: match.matchType,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send mentorship match notifications for match ${match.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Internal helper to send notifications on match status updates
   */
  private async sendStatusUpdateNotification(match: MentorshipMatch, updatedByUserId: string): Promise<void> {
    try {
      // Notify mentor except if mentor made the update
      if (match.mentorId !== updatedByUserId) {
        await this.notificationsService.sendNotification({
          userId: match.mentorId,
          type: 'MENTORSHIP_MATCH_STATUS_UPDATED',
          payload: {
            matchId: match.id,
            newStatus: match.status,
            updatedBy: updatedByUserId,
          },
        });
      }

      // Notify mentee except if mentee made the update
      if (match.menteeId !== updatedByUserId) {
        await this.notificationsService.sendNotification({
          userId: match.menteeId,
          type: 'MENTORSHIP_MATCH_STATUS_UPDATED',
          payload: {
            matchId: match.id,
            newStatus: match.status,
            updatedBy: updatedByUserId,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send mentorship match status update notifications for match ${match.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Run the automatic matching job, which performs matches for eligible users
   */
  async runMatchingJob(): Promise<void> {
    try {
      // Use the matching service to run automatic matching process
      // It should return an array of created matches
      const matches: MentorshipMatch[] = await this.matchingService.runAutoMatching();

      for (const match of matches) {
        try {
          await this.sendMatchNotifications(match);
        } catch (error) {
          this.logger.error(
            `Failed to send match notifications for mentor ${match.mentorId} and mentee ${match.menteeId}: ${error.message}`,
            error.stack,
          );
        }

        try {
          await this.sendStatusUpdateNotification(match, 'system'); // 'system' as the updater user ID
        } catch (error) {
          this.logger.error(
            `Failed to send status update notification for mentor ${match.mentorId} and mentee ${match.menteeId}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (err) {
      this.logger.error(`runMatchingJob failed: ${err.message}`, err.stack);
    }
  }
}
