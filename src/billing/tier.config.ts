export type TierKey = 'basic' | 'premium' | 'enterprise' | 'student';

export interface TierConfig {
  name: string;
  description?: string;
  priceIdMonthly?: string;
  priceIdYearly?: string;
  meteredPriceId?: string; // for usage-based metrics if any
  seatBased?: boolean;
  defaultSeats?: number;
  features?: Record<string, any>;
}

// Load from env to avoid hardcoding sensitive IDs
export const TIERS: Record<TierKey, TierConfig> = {
  basic: {
    name: 'Basic',
    description: 'Basic access',
    priceIdMonthly: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    priceIdYearly: process.env.STRIPE_PRICE_BASIC_YEARLY,
    seatBased: false,
  },
  premium: {
    name: 'Premium',
    description: 'Premium content and features',
    priceIdMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    priceIdYearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    meteredPriceId: process.env.STRIPE_PRICE_PREMIUM_METERED,
    seatBased: true,
    defaultSeats: 1,
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Enterprise plan with seats',
    priceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    priceIdYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    seatBased: true,
    defaultSeats: 5,
  },
  student: {
    name: 'Student',
    description: 'Student discounted plan',
    priceIdMonthly: process.env.STRIPE_PRICE_STUDENT_MONTHLY,
    priceIdYearly: process.env.STRIPE_PRICE_STUDENT_YEARLY,
    seatBased: false,
  },
};
