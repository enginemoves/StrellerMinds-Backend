import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { MentorshipService } from './mentorship.service';

@Controller('mentorship')
export class MentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  @Post('match')
  async matchMentor(@Body() body: { menteeId: string; criteria: any }) {
    return this.mentorshipService.matchMentorMentee(body.menteeId, body.criteria);
  }

  @Post()
  async createMentorship(@Body() body: { mentorId: string; menteeId: string; goals?: string }) {
    return this.mentorshipService.createMentorship(body.mentorId, body.menteeId, body.goals);
  }

  @Get(':id')
  async trackMentorship(@Param('id') id: string) {
    return this.mentorshipService.trackMentorship(id);
  }

  @Post(':id/session')
  async createSession(@Param('id') mentorshipId: string, @Body() body: { scheduledAt: Date; durationMinutes?: number; notes?: string }) {
    return this.mentorshipService.createSession(mentorshipId, body.scheduledAt, body.durationMinutes, body.notes);
  }

  @Get('analytics/summary')
  async getAnalytics() {
    return this.mentorshipService.getMentorshipAnalytics();
  }
}
