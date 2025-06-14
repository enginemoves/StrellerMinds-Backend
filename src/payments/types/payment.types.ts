export enum PaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded'
  }
  
  export enum PaymentMethod {
    CREDIT_CARD = 'credit_card',
    DEBIT_CARD = 'debit_card',
    PAYPAL = 'paypal',
    STRIPE = 'stripe',
    BANK_TRANSFER = 'bank_transfer'
  }
  
  export enum SubscriptionStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    CANCELLED = 'cancelled',
    PAST_DUE = 'past_due',
    TRIALING = 'trialing'
  }
  
  export enum SubscriptionPlan {
    BASIC = 'basic',
    PREMIUM = 'premium',
    ENTERPRISE = 'enterprise'
  }
  
  export interface PaymentRequest {
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    customerId: string;
    courseId?: string;
    subscriptionId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }
  
  export interface SubscriptionRequest {
    customerId: string;
    plan: SubscriptionPlan;
    paymentMethod: PaymentMethod;
    trialDays?: number;
  }
  
  export interface RefundRequest {
    paymentId: string;
    amount?: number;
    reason: string;
  }
  