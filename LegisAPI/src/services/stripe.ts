import { D1Database } from '@cloudflare/workers-types';
import type { Stripe } from 'stripe';
import { UserService } from './user';
import { PlansService } from './plans';
import { BillingCycleService } from './billing-cycle';

export interface StripeConfig {
  webhookSecret: string;
  apiKey: string;
}

export class StripeService {
  constructor(
    private db: D1Database,
    private config: StripeConfig
  ) {}

  async verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    // In production, use Stripe's webhook signature verification
    // For now, we'll do a simple check
    return signature.includes(this.config.webhookSecret);
  }

  async handleWebhookEvent(event: any): Promise<void> {
    const userService = new UserService(this.db);
    const plansService = new PlansService(this.db);
    const billingCycleService = new BillingCycleService(this.db);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await this.handleSubscriptionUpdate(subscription, userService, plansService, billingCycleService);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this.handleSubscriptionCancellation(subscription, userService, plansService);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await this.handleSuccessfulPayment(invoice, userService, billingCycleService);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await this.handleFailedPayment(invoice, userService);
        break;
      }

      case 'customer.created': {
        const customer = event.data.object;
        await this.handleCustomerCreated(customer, userService);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleSubscriptionUpdate(
    subscription: any,
    userService: UserService,
    plansService: PlansService,
    billingCycleService: BillingCycleService
  ): Promise<void> {
    const stripePriceId = subscription.items.data[0]?.price.id;
    const stripeCustomerId = subscription.customer;

    if (!stripePriceId || !stripeCustomerId) {
      console.error('Missing price or customer ID in subscription');
      return;
    }

    // Find user by Stripe customer ID
    const user = await userService.getUserByStripeCustomerId(stripeCustomerId);
    if (!user) {
      console.error(`User not found for Stripe customer: ${stripeCustomerId}`);
      return;
    }

    // Find plan by Stripe price ID
    const plan = await plansService.getPlanByStripePrice(stripePriceId);
    if (!plan) {
      console.error(`Plan not found for Stripe price: ${stripePriceId}`);
      return;
    }

    // Update user subscription
    await this.db.prepare(`
      UPDATE users 
      SET 
        current_plan_id = ?,
        subscription_status = ?,
        stripe_subscription_id = ?,
        mcp_calls_limit = ?,
        subscription_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      plan.id,
      subscription.status,
      subscription.id,
      plan.mcp_calls_limit,
      user.id
    ).run();

    // Update billing cycle information
    await billingCycleService.updateBillingCycle(user.id, {
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: subscription.status
    });

    console.log(`Updated subscription for user ${user.email} to plan ${plan.name}`);
  }

  private async handleSubscriptionCancellation(
    subscription: any,
    userService: UserService,
    plansService: PlansService
  ): Promise<void> {
    const stripeCustomerId = subscription.customer;

    // Find user by Stripe customer ID
    const user = await userService.getUserByStripeCustomerId(stripeCustomerId);
    if (!user) {
      console.error(`User not found for Stripe customer: ${stripeCustomerId}`);
      return;
    }

    // Get free plan
    const freePlan = await plansService.getPlanBySlug('free');
    if (!freePlan) {
      console.error('Free plan not found');
      return;
    }

    // Downgrade to free plan
    await this.db.prepare(`
      UPDATE users 
      SET 
        current_plan_id = ?,
        subscription_status = 'free',
        stripe_subscription_id = NULL,
        subscription_ended_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      freePlan.id,
      user.id
    ).run();

    console.log(`Cancelled subscription for user ${user.email}, downgraded to free plan`);
  }

  private async handleSuccessfulPayment(
    invoice: any,
    userService: UserService,
    billingCycleService: BillingCycleService
  ): Promise<void> {
    const stripeCustomerId = invoice.customer;

    // Find user by Stripe customer ID
    const user = await userService.getUserByStripeCustomerId(stripeCustomerId);
    if (!user) {
      console.error(`User not found for Stripe customer: ${stripeCustomerId}`);
      return;
    }

    // Log successful payment
    await this.db.prepare(`
      INSERT INTO payment_history (
        user_id,
        stripe_invoice_id,
        amount,
        currency,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, 'succeeded', CURRENT_TIMESTAMP)
    `).bind(
      user.id,
      invoice.id,
      invoice.amount_paid,
      invoice.currency
    ).run();

    // Handle billing cycle and usage reset
    if (invoice.lines && invoice.lines.data.length > 0) {
      const periodStart = new Date(invoice.lines.data[0].period.start * 1000);
      const periodEnd = new Date(invoice.lines.data[0].period.end * 1000);
      
      await billingCycleService.handleSuccessfulPayment(user.id, {
        invoiceId: invoice.id,
        periodStart,
        periodEnd,
        amount: invoice.amount_paid,
        currency: invoice.currency
      });
    }

    console.log(`Recorded successful payment for user ${user.email}`);
  }

  private async handleFailedPayment(
    invoice: any,
    userService: UserService
  ): Promise<void> {
    const stripeCustomerId = invoice.customer;

    // Find user by Stripe customer ID
    const user = await userService.getUserByStripeCustomerId(stripeCustomerId);
    if (!user) {
      console.error(`User not found for Stripe customer: ${stripeCustomerId}`);
      return;
    }

    // Update subscription status
    await this.db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'past_due',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(user.id).run();

    // Log failed payment
    await this.db.prepare(`
      INSERT INTO payment_history (
        user_id,
        stripe_invoice_id,
        amount,
        currency,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, 'failed', CURRENT_TIMESTAMP)
    `).bind(
      user.id,
      invoice.id,
      invoice.amount_due,
      invoice.currency
    ).run();

    console.log(`Recorded failed payment for user ${user.email}`);
  }

  private async handleCustomerCreated(
    customer: any,
    userService: UserService
  ): Promise<void> {
    // Update user with Stripe customer ID if email matches
    if (customer.email) {
      await this.db.prepare(`
        UPDATE users 
        SET 
          stripe_customer_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = ? AND stripe_customer_id IS NULL
      `).bind(
        customer.id,
        customer.email
      ).run();

      console.log(`Associated Stripe customer ${customer.id} with email ${customer.email}`);
    }
  }
}