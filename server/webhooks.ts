import Stripe from "stripe";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

/**
 * Handle checkout.session.completed event
 * Creates or updates the user's subscription in the database
 */
export async function handleCheckoutSessionCompleted(event: WebhookEvent) {
  const session = event.data.object as any;
  
  if (!session.client_reference_id || !session.subscription) {
    console.warn("Missing client_reference_id or subscription in checkout session");
    return;
  }

  const userId = parseInt(session.client_reference_id, 10);
  const subscriptionId = typeof session.subscription === "string" 
    ? session.subscription 
    : session.subscription.id;

  // Get the subscription details to determine the plan
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
  const priceId = subscription.items.data[0]?.price.id;

  // Map price ID to plan tier
  let planTier: "free" | "starter" | "professional" | "business" | "enterprise" = "free";
  if (priceId?.includes("starter")) {
    planTier = "starter";
  } else if (priceId?.includes("professional")) {
    planTier = "professional";
  } else if (priceId?.includes("business")) {
    planTier = "business";
  }

  const db = await getDb();

  // Update user subscription
  if (db) {
    await db
      .update(users)
      .set({
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        subscriptionTier: planTier,
        subscriptionStatus: "active",
        billingPeriod: (subscription.items.data[0]?.price.recurring?.interval === "year" ? "annual" : "monthly") as "monthly" | "annual",
        currentPeriodStart: new Date((subscription.current_period_start as number || 0) * 1000),
        currentPeriodEnd: new Date((subscription.current_period_end as number || 0) * 1000),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  console.log(`[Webhook] Subscription created for user ${userId}: ${subscriptionId}`);
}

/**
 * Handle customer.subscription.updated event
 * Updates the user's subscription status in the database
 */
export async function handleSubscriptionUpdated(event: WebhookEvent) {
  const subscription = event.data.object as any;
  
  if (!subscription.metadata?.user_id) {
    console.warn("Missing user_id in subscription metadata");
    return;
  }

  const userId = parseInt(subscription.metadata.user_id, 10);
  const priceId = subscription.items.data[0]?.price.id;

  // Map price ID to plan tier
  let planTier: "free" | "starter" | "professional" | "business" | "enterprise" = "free";
  if (priceId?.includes("starter")) {
    planTier = "starter";
  } else if (priceId?.includes("professional")) {
    planTier = "professional";
  } else if (priceId?.includes("business")) {
    planTier = "business";
  }

  const db = await getDb();

  // Update user subscription
  if (db) {
    await db
      .update(users)
      .set({
        subscriptionTier: planTier,
        subscriptionStatus: subscription.status as "active" | "past_due" | "canceled" | "trialing" | "incomplete",
        billingPeriod: (subscription.items.data[0]?.price.recurring?.interval === "year" ? "annual" : "monthly") as "monthly" | "annual",
        currentPeriodStart: new Date((subscription.current_period_start as number || 0) * 1000),
        currentPeriodEnd: new Date((subscription.current_period_end as number || 0) * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end ? "yes" : "no",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  console.log(`[Webhook] Subscription updated for user ${userId}: ${subscription.id}`);
}

/**
 * Handle customer.subscription.deleted event
 * Marks the user's subscription as canceled
 */
export async function handleSubscriptionDeleted(event: WebhookEvent) {
  const subscription = event.data.object as any;
  
  if (!subscription.metadata?.user_id) {
    console.warn("Missing user_id in subscription metadata");
    return;
  }

  const userId = parseInt(subscription.metadata.user_id, 10);
  const db = await getDb();

  // Downgrade user to free tier
  if (db) {
    await db
      .update(users)
      .set({
        subscriptionTier: "free",
        subscriptionStatus: "canceled",
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  console.log(`[Webhook] Subscription canceled for user ${userId}: ${subscription.id}`);
}

/**
 * Handle invoice.payment_succeeded event
 * Confirms successful payment
 */
export async function handleInvoicePaymentSucceeded(event: WebhookEvent) {
  const invoice = event.data.object as any;
  
  const subscriptionId = invoice.subscription as string | undefined;
  if (!subscriptionId) {
    console.warn("Missing subscription in invoice");
    return;
  }

  console.log(`[Webhook] Payment succeeded for subscription ${subscriptionId}`);
  // Additional logic can be added here (e.g., send receipt email)
}

/**
 * Handle invoice.payment_failed event
 * Handles failed payment
 */
export async function handleInvoicePaymentFailed(event: WebhookEvent) {
  const invoice = event.data.object as any;
  
  const subscriptionId = invoice.subscription as string | undefined;
  if (!subscriptionId) {
    console.warn("Missing subscription in invoice");
    return;
  }

  // Get subscription to find user
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
  
  if (!subscription.metadata?.user_id) {
    console.warn("Missing user_id in subscription metadata");
    return;
  }

  const userId = parseInt(subscription.metadata.user_id, 10);
  const db = await getDb();

  // Update subscription status to past_due
  if (db) {
    await db
      .update(users)
      .set({
        subscriptionStatus: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  console.log(`[Webhook] Payment failed for subscription ${subscriptionId}`);
  // Additional logic can be added here (e.g., send payment failure email)
}

/**
 * Route webhook events to appropriate handlers
 */
export async function processWebhookEvent(event: WebhookEvent) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event);
      break;
    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }
}
