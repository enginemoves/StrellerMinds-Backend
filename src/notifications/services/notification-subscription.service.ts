import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationSubscription,
  NotificationEventType,
  SubscriptionScope,
} from '../entities/notification-subscription.entity';
import { UsersService } from '../../users/services/users.service';

export interface CreateSubscriptionDto {
  userId: string;
  eventType: NotificationEventType;
  scope: SubscriptionScope;
  scopeId?: string;
  preferences?: {
    realtime?: boolean;
    email?: boolean;
    push?: boolean;
  };
}

export interface UpdateSubscriptionDto {
  isActive?: boolean;
  preferences?: {
    realtime?: boolean;
    email?: boolean;
    push?: boolean;
  };
}

@Injectable()
export class NotificationSubscriptionService {
  private readonly logger = new Logger(NotificationSubscriptionService.name);

  constructor(
    @InjectRepository(NotificationSubscription)
    private readonly subscriptionRepository: Repository<NotificationSubscription>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new subscription
   */
  async subscribe(dto: CreateSubscriptionDto): Promise<NotificationSubscription> {
    try {
      // Verify user exists
      const user = await this.usersService.findOne(dto.userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }

      // Check if subscription already exists
      const existingSubscription = await this.subscriptionRepository.findOne({
        where: {
          userId: dto.userId,
          eventType: dto.eventType,
          scope: dto.scope,
          scopeId: dto.scopeId || null,
        },
      });

      if (existingSubscription) {
        if (existingSubscription.isActive) {
          throw new ConflictException(
            'Subscription already exists and is active',
          );
        } else {
          // Reactivate existing subscription
          existingSubscription.isActive = true;
          existingSubscription.preferences = dto.preferences || {
            realtime: true,
            email: false,
            push: false,
          };
          const updated = await this.subscriptionRepository.save(existingSubscription);
          
          this.logger.log(
            `Reactivated subscription ${updated.id} for user ${dto.userId}`,
          );
          
          return updated;
        }
      }

      // Create new subscription
      const subscription = this.subscriptionRepository.create({
        userId: dto.userId,
        eventType: dto.eventType,
        scope: dto.scope,
        scopeId: dto.scopeId,
        isActive: true,
        preferences: dto.preferences || {
          realtime: true,
          email: false,
          push: false,
        },
      });

      const savedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(
        `Created subscription ${savedSubscription.id} for user ${dto.userId}`,
      );

      return savedSubscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove/deactivate a subscription
   */
  async unsubscribe(
    userId: string,
    eventType: NotificationEventType,
    scope: SubscriptionScope,
    scopeId?: string,
  ): Promise<void> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          userId,
          eventType,
          scope,
          scopeId: scopeId || null,
        },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (!subscription.isActive) {
        this.logger.warn(
          `Attempting to unsubscribe from already inactive subscription ${subscription.id}`,
        );
        return;
      }

      subscription.isActive = false;
      await this.subscriptionRepository.save(subscription);

      this.logger.log(
        `Deactivated subscription ${subscription.id} for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to unsubscribe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all active subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<NotificationSubscription[]> {
    try {
      return await this.subscriptionRepository.find({
        where: {
          userId,
          isActive: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get user subscriptions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get users subscribed to a specific event type and scope
   */
  async getSubscribedUsers(
    eventType: NotificationEventType,
    scope: SubscriptionScope,
    scopeId?: string,
  ): Promise<string[]> {
    try {
      const subscriptions = await this.subscriptionRepository.find({
        where: {
          eventType,
          scope,
          scopeId: scopeId || null,
          isActive: true,
        },
        select: ['userId'],
      });

      return subscriptions.map(sub => sub.userId);
    } catch (error) {
      this.logger.error(`Failed to get subscribed users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update subscription preferences
   */
  async updateSubscription(
    subscriptionId: string,
    userId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<NotificationSubscription> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          id: subscriptionId,
          userId,
        },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (dto.isActive !== undefined) {
        subscription.isActive = dto.isActive;
      }

      if (dto.preferences) {
        subscription.preferences = {
          ...subscription.preferences,
          ...dto.preferences,
        };
      }

      const updatedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.debug(
        `Updated subscription ${subscriptionId} for user ${userId}`,
      );

      return updatedSubscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user is subscribed to an event
   */
  async isUserSubscribed(
    userId: string,
    eventType: NotificationEventType,
    scope: SubscriptionScope,
    scopeId?: string,
  ): Promise<boolean> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          userId,
          eventType,
          scope,
          scopeId: scopeId || null,
          isActive: true,
        },
      });

      return !!subscription;
    } catch (error) {
      this.logger.error(`Failed to check subscription status: ${error.message}`);
      return false;
    }
  }

  /**
   * Bulk subscribe users to an event
   */
  async bulkSubscribe(
    userIds: string[],
    eventType: NotificationEventType,
    scope: SubscriptionScope,
    scopeId?: string,
  ): Promise<NotificationSubscription[]> {
    try {
      const subscriptions: NotificationSubscription[] = [];

      for (const userId of userIds) {
        try {
          const subscription = await this.subscribe({
            userId,
            eventType,
            scope,
            scopeId,
            preferences: {
              realtime: true,
              email: false,
              push: false,
            },
          });
          subscriptions.push(subscription);
        } catch (error) {
          // Log error but continue with other users
          this.logger.warn(
            `Failed to subscribe user ${userId}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Bulk subscribed ${subscriptions.length}/${userIds.length} users to ${eventType}`,
      );

      return subscriptions;
    } catch (error) {
      this.logger.error(`Failed to bulk subscribe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<{
    totalActive: number;
    totalInactive: number;
    byEventType: Record<string, number>;
    byScope: Record<string, number>;
  }> {
    try {
      const totalActive = await this.subscriptionRepository.count({
        where: { isActive: true },
      });

      const totalInactive = await this.subscriptionRepository.count({
        where: { isActive: false },
      });

      // Get counts by event type
      const eventTypeCounts = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select(['subscription.eventType', 'COUNT(*) as count'])
        .where('subscription.isActive = :active', { active: true })
        .groupBy('subscription.eventType')
        .getRawMany();

      const byEventType = eventTypeCounts.reduce((acc, item) => {
        acc[item.subscription_eventType] = parseInt(item.count);
        return acc;
      }, {});

      // Get counts by scope
      const scopeCounts = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select(['subscription.scope', 'COUNT(*) as count'])
        .where('subscription.isActive = :active', { active: true })
        .groupBy('subscription.scope')
        .getRawMany();

      const byScope = scopeCounts.reduce((acc, item) => {
        acc[item.subscription_scope] = parseInt(item.count);
        return acc;
      }, {});

      return {
        totalActive,
        totalInactive,
        byEventType,
        byScope,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription stats: ${error.message}`);
      throw error;
    }
  }
}
