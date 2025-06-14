import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  stripe: {
    apiKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    mode: process.env.PAYPAL_MODE || 'sandbox'
  },
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  webhookEndpoints: {
    stripe: '/webhooks/stripe',
    paypal: '/webhooks/paypal'
  },
  subscriptionPlans: {
    basic: {
      amount: 9.99,
      currency: 'USD',
      features: ['Basic course access', 'Community support']
    },
    premium: {
      amount: 19.99,
      currency: 'USD',
      features: ['All course access', 'Priority support', 'Downloadable resources']
    },
    enterprise: {
      amount: 49.99,
      currency: 'USD',
      features: ['Everything in Premium', 'Custom integrations', 'Dedicated account manager']
    }
  }
}));
