import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  /**
   * Generate a secure verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate token expiry date
   */
  private getTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + this.TOKEN_EXPIRY_HOURS);
    return expiry;
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(email: string): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.isEmailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // Generate new token and expiry
      const verificationToken = this.generateVerificationToken();
      const tokenExpiry = this.getTokenExpiry();

      // Update user with new token
      await this.userRepository.update(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: tokenExpiry,
      });

      // Send verification email
      await this.emailService.sendVerificationEmail(
        email,
        verificationToken,
        user.id
      );

      this.logger.log(`Verification email sent to ${email}`);

      return {
        message: 'Verification email sent successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<{ message: string; user: Partial<User> }> {
    try {
      const user = await this.userRepository.findOne({
        where: { emailVerificationToken: token },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      if (user.isEmailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // Check if token is expired
      if (new Date() > user.emailVerificationTokenExpiry) {
        throw new BadRequestException('Verification token has expired');
      }

      // Verify the email
      await this.userRepository.update(user.id, {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      });

      this.logger.log(`Email verified for user ${user.email}`);

      return {
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          isEmailVerified: true,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to verify email with token ${token}`, error.stack);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.isEmailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // Check if we can resend (rate limiting)
      if (user.emailVerificationTokenExpiry && 
          new Date() < new Date(user.emailVerificationTokenExpiry.getTime() - (23 * 60 * 60 * 1000))) {
        throw new BadRequestException('Please wait before requesting another verification email');
      }

      return await this.sendVerificationEmail(email);
    } catch (error) {
      this.logger.error(`Failed to resend verification email to ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if user email is verified
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      select: ['isEmailVerified']
    });
    
    return user?.isEmailVerified || false;
  }

  /**
   * Clean up expired tokens (can be called by a cron job)
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.userRepository.update(
        {
          emailVerificationTokenExpiry: new Date(),
          isEmailVerified: false,
        },
        {
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
        }
      );

      this.logger.log(`Cleaned up ${result.affected} expired verification tokens`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error.stack);
    }
  }
}
