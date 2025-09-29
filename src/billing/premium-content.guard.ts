import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CoursesModule } from '../courses/courses.module';
import { CourseService } from '../courses/courses.service';
import { BillingService } from './billing.service';
import { SubscriptionPlan } from '../payment/entities/subscription.entity';

function planRank(plan?: SubscriptionPlan | null): number {
  switch (plan) {
    case SubscriptionPlan.BASIC:
      return 1;
    case SubscriptionPlan.PREMIUM:
      return 2;
    case SubscriptionPlan.ENTERPRISE:
      return 3;
    case SubscriptionPlan.STUDENT:
      return 0; // student treat as below basic for gating
    default:
      return 0;
  }
}

@Injectable()
export class PremiumContentGuard implements CanActivate {
  constructor(
    private readonly courseService: CourseService,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req?.user?.id || req.query['userId'];

    const courseId: string | undefined = req.params?.id;
    if (!courseId) return true; // non-course route

    const course = await this.courseService.findOne(courseId);
    if (!course.isPremium) return true;

    if (!userId) throw new ForbiddenException('Authentication required for premium content');

    const sub = await this.billingService.getMySubscription(userId);
    if (!sub || sub.status !== 'active') {
      throw new ForbiddenException('Active subscription required');
    }

    const needed = planRank(course.requiredPlan || SubscriptionPlan.PREMIUM);
    const have = planRank(sub.plan);
    if (have < needed) {
      throw new ForbiddenException('Insufficient subscription tier');
    }

    return true;
  }
}
