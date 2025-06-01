import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MentorshipService } from '../services/mentorship.service';
import { CreatePreferenceDto } from '../dto/create-preference.dto';
import { CreateAvailabilityDto } from '../dto/create-availability.dto';
import { MatchRequestDto } from '../dto/match-request.dto';
import { UpdateMatchStatusDto } from '../dto/update-match-status.dto';
import { MentorshipPreference } from '../entities/mentorship-preference.entity';
import { MentorAvailability } from '../entities/mentor-availability.entity';
import { MentorshipMatch, MatchStatus } from '../entities/mentorship-match.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Mentorship')
@Controller('mentorship')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  @Post('preferences')
  @ApiOperation({ summary: 'Create or update mentorship preferences' })
  @ApiResponse({
    status: 201,
    description: 'Preferences created or updated successfully',
    type: MentorshipPreference,
  })
  async createOrUpdatePreference(
    @Req() req,
    @Body() createPreferenceDto: CreatePreferenceDto,
  ): Promise<MentorshipPreference> {
    return this.mentorshipService.createOrUpdatePreference(
      req.user.id,
      createPreferenceDto,
    );
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user\'s mentorship preferences' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user\'s mentorship preferences',
    type: MentorshipPreference,
  })
  async getPreferences(@Req() req): Promise<MentorshipPreference> {
    return this.mentorshipService.getPreference(req.user.id);
  }

  @Post('availability')
  @ApiOperation({ summary: 'Create a new availability slot (for mentors only)' })
  @ApiResponse({
    status: 201,
    description: 'Availability slot created successfully',
    type: MentorAvailability,
  })
  async createAvailability(
    @Req() req,
    @Body() createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<MentorAvailability> {
    return this.mentorshipService.createAvailability(
      req.user.id,
      createAvailabilityDto,
    );
  }

  @Get('availability/:mentorId')
  @ApiOperation({ summary: 'Get availability slots for a mentor' })
  @ApiResponse({
    status: 200,
    description: 'Returns the mentor\'s availability slots',
    type: [MentorAvailability],
  })
  async getMentorAvailability(
    @Param('mentorId') mentorId: string,
  ): Promise<MentorAvailability[]> {
    return this.mentorshipService.getMentorAvailability(mentorId);
  }

  @Post('match')
  @ApiOperation({ summary: 'Create a mentorship match (manual or automatic)' })
  @ApiResponse({
    status: 201,
    description: 'Match(es) created successfully',
    type: [MentorshipMatch],
  })
  async createMatch(
    @Req() req,
    @Body() matchRequestDto: MatchRequestDto,
  ): Promise<MentorshipMatch | MentorshipMatch[]> {
    return this.mentorshipService.createMatch(req.user.id, matchRequestDto);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Get all matches for the current user' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MatchStatus,
    description: 'Filter matches by status',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all matches for the user',
    type: [MentorshipMatch],
  })
  async getUserMatches(
    @Req() req,
    @Query('status') status?: MatchStatus,
  ): Promise<MentorshipMatch[]> {
    return this.mentorshipService.getUserMatches(req.user.id, status);
  }

  @Get('matches/:matchId')
  @ApiOperation({ summary: 'Get a specific match by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the match details',
    type: MentorshipMatch,
  })
  async getMatchById(
    @Req() req,
    @Param('matchId') matchId: string,
  ): Promise<MentorshipMatch> {
    return this.mentorshipService.getMatchById(req.user.id, matchId);
  }

  @Patch('matches/:matchId/status')
  @ApiOperation({ summary: 'Update the status of a match' })
  @ApiResponse({
    status: 200,
    description: 'Match status updated successfully',
    type: MentorshipMatch,
  })
  async updateMatchStatus(
    @Req() req,
    @Param('matchId') matchId: string,
    @Body() updateMatchStatusDto: UpdateMatchStatusDto,
  ): Promise<MentorshipMatch> {
    return this.mentorshipService.updateMatchStatus(
      req.user.id,
      matchId,
      updateMatchStatusDto,
    );
  }
}
