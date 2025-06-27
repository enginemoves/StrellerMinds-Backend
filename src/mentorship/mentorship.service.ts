import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mentorship } from './entities/mentorship.entity';
import { MentorshipSession } from './entities/mentorship-session.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MentorshipService {
  constructor(
    @InjectRepository(Mentorship)
    private mentorshipRepo: Repository<Mentorship>,
    @InjectRepository(MentorshipSession)
    private sessionRepo: Repository<MentorshipSession>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // Matching algorithm (simple: by skill/interests)
  async matchMentorMentee(menteeId: string, criteria: any): Promise<User[]> {
    // TODO: Implement real matching logic
    return this.userRepo.find({ where: { /* skills, interests, etc. */ } });
  }

  async createMentorship(mentorId: string, menteeId: string, goals?: string) {
    const mentor = await this.userRepo.findOne({ where: { id: mentorId } });
    const mentee = await this.userRepo.findOne({ where: { id: menteeId } });
    if (!mentor || !mentee) throw new Error('Mentor or mentee not found');
    const mentorship = this.mentorshipRepo.create({ mentor, mentee, goals });
    return this.mentorshipRepo.save(mentorship);
  }

  async trackMentorship(mentorshipId: string) {
    return this.mentorshipRepo.findOne({ where: { id: mentorshipId }, relations: ['sessions', 'mentor', 'mentee'] });
  }

  async createSession(mentorshipId: string, scheduledAt: Date, durationMinutes = 60, notes?: string) {
    const mentorship = await this.mentorshipRepo.findOne({ where: { id: mentorshipId } });
    if (!mentorship) throw new Error('Mentorship not found');
    const session = this.sessionRepo.create({ mentorship, scheduledAt, durationMinutes, notes });
    return this.sessionRepo.save(session);
  }

  async getMentorshipAnalytics() {
    // Example: count active mentorships, completed, etc.
    const total = await this.mentorshipRepo.count();
    const active = await this.mentorshipRepo.count({ where: { status: 'active' } });
    const completed = await this.mentorshipRepo.count({ where: { status: 'completed' } });
    return { total, active, completed };
  }
}
