import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { RespondToFeedbackDto } from './dto/respond-to-feedback.dto';
import { NotificationsService } from 'src/notification/notification.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    private readonly notificationService: NotificationsService,
  ) {}

  async create(senderId: string, dto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = this.feedbackRepository.create({
      ...dto,
      senderId: dto.isAnonymous ? null : senderId,
    });
    const saved = await this.feedbackRepository.save(feedback);

    await this.notificationService.notifyUser(
      dto.recipientId,
      '📨 You have received new feedback from a peer!',
    );

    return saved;
  }

  async getByRecipient(recipientId: string): Promise<Feedback[]> {
    return this.feedbackRepository.find({
      where: { recipientId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });
  }

  async getBySender(senderId: string): Promise<Feedback[]> {
    return this.feedbackRepository.find({
      where: { senderId },
      relations: ['recipient'],
      order: { createdAt: 'DESC' },
    });
  }

  async respondToFeedback(feedbackId: string, recipientId: string, dto: RespondToFeedbackDto): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId, recipientId },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    feedback.response = dto.response;
    feedback.respondedAt = new Date();
    
    return this.feedbackRepository.save(feedback);
  }

  async getFeedbackStats(userId: string) {
    const [received, sent] = await Promise.all([
      this.feedbackRepository.find({ where: { recipientId: userId } }),
      this.feedbackRepository.find({ where: { senderId: userId } }),
    ]);

    const stats = {
      received: {
        total: received.length,
        byCategory: this.groupByCategory(received),
        averageRating: this.calculateAverageRating(received),
      },
      sent: {
        total: sent.length,
        byCategory: this.groupByCategory(sent),
      },
    };

    return stats;
  }

  private groupByCategory(feedbacks: Feedback[]) {
    return feedbacks.reduce((acc, feedback) => {
      acc[feedback.category] = (acc[feedback.category] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAverageRating(feedbacks: Feedback[]) {
    const ratedFeedbacks = feedbacks.filter(f => f.rating);
    if (ratedFeedbacks.length === 0) return 0;
    
    const sum = ratedFeedbacks.reduce((acc, f) => acc + f.rating, 0);
    return sum / ratedFeedbacks.length;
  }

  async flagFeedback(id: string): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Feedback not found');

    feedback.isFlagged = true;
    return this.feedbackRepository.save(feedback);
  }

  async removeFlagged(id: string): Promise<void> {
    const result = await this.feedbackRepository.softDelete(id);
    if (!result.affected) throw new NotFoundException('Feedback not found or already deleted');
  }
}
