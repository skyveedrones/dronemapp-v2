import Stripe from "stripe";
import { Request, Response } from "express";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Map Stripe price IDs to subscription tiers
 */
const PRICE_TO_TIER: Record<string, "starter" | "professional" | "business"> = {
  // Starter tier
  "price_1T6Xu3GEMT6mikKwPibBZGCg": "starter",
  "price_1T6Xu4GEMT6mikKwqmc0MCVL": "starter",
  // Professional tier
  "price_1T6Xu4GEMT6mikKwINYKHcuI": "professional",
  "price_1T6Xu4GEMT6mikKwqgE63wB7": "professional",
  // Business tier
  "price_1T6Xu5GEMT6mikKwaxgTw2dy": "business",
  "price_1T6Xu5GEMT6mikKwCUBCrmlB": "business",
};

/**
 * Extract billing period from Stripe price/subscription
 */
function extractBillingPeriod(
  subscription: Stripe.Subscription
): "monthly" | "annual" {
  if (!subscription.items.data[0]) return "monthly";

  const price = subscription.items.data[0].price;
  if ((price as any).recurring?.interval === "year") {
    return "annual";
  }
  return "monthly";
}

/**
 * Extract subscription tier from Stripe subscription
 */
function extractSubscriptionTier(
  subscription: Stripe.Subscription
): "starter" | "professional" | "business" | "free" {
  if (!subscription.items.data[0]) return "free";

  const priceId = subscription.items.data[0].price.id;
  return PRICE_TO_TIER[priceId] || "free";
}

/**
 * Handle checkout.session.completed event
 * Creates or updates user subscription when payment succeeds
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("[Webhook] Processing checkout.session.completed", session.id);

  if (!session.client_reference_id) {
    console.error("[Webhook] No client_reference_id in session");
    return;
  }

  const userId = parseInt(session.client_reference_id, 10);
  if (isNaN(userId)) {
    console.error("[Webhook] Invalid user ID:", session.client_reference_id);
    return;
  }

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Webhook] Database not available");
      return;
    }

    // Retrieve the subscription from Stripe
    if (!session.subscription) {
      console.error("[Webhook] No subscription in session");
      return;
    }

    const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "");
    const subscription = await stripeClient.subscriptions.retrieve(
      session.subscription as string
    );

    const tier = extractSubscriptionTier(subscription);
    const billingPeriod = extractBillingPeriod(subscription);

    // Update user subscription in database
    await db
      .update(users)
      .set({
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        subscriptionTier: tier,
        subscriptionStatus: subscription.status as any,
        billingPeriod: billingPeriod,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000
        ),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end ? "yes" : "no",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(
      `[Webhook] Updated user ${userId} to ${tier} tier (subscription: ${subscription.id})`
    );
  } catch (error) {
    console.error("[Webhook] Error processing checkout.session.completed:", error);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 * Updates subscription status when subscription changes
 */
async function handleCustomerSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  console.log(
    "[Webhook] Processing customer.subscription.updated",
    subscription.id
  );

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Webhook] Database not available");
      return;
    }

    // Find user by stripe subscription ID
    const userResult = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscription.id)).limit(1);
    const user = userResult.length > 0 ? userResult[0] : null;

    if (!user) {
      console.warn(
        "[Webhook] No user found for subscription:",
        subscription.id
      );
      return;
    }

    const tier = extractSubscriptionTier(subscription);
    const billingPeriod = extractBillingPeriod(subscription);

    // Update subscription status
    await db
      .update(users)
      .set({
        subscriptionStatus: subscription.status as any,
        subscriptionTier: tier,
        billingPeriod: billingPeriod,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000
        ),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end ? "yes" : "no",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log(
      `[Webhook] Updated user ${user.id} subscription status to ${subscription.status}`
    );
  } catch (error) {
    console.error(
      "[Webhook] Error processing customer.subscription.updated:",
      error
    );
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 * Downgrades user to free tier when subscription is canceled
 */
async function handleCustomerSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  console.log(
    "[Webhook] Processing customer.subscription.deleted",
    subscription.id
  );

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Webhook] Database not available");
      return;
    }

    // Find user by stripe subscription ID
    const userResult = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscription.id)).limit(1);
    const user = userResult.length > 0 ? userResult[0] : null;

    if (!user) {
      console.warn(
        "[Webhook] No user found for subscription:",
        subscription.id
      );
      return;
    }

    // Downgrade to free tier
    await db
      .update(users)
      .set({
        subscriptionTier: "free",
        subscriptionStatus: "canceled",
        stripeSubscriptionId: null,
        billingPeriod: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: "no",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log(`[Webhook] Downgraded user ${user.id} to free tier`);
  } catch (error) {
    console.error(
      "[Webhook] Error processing customer.subscription.deleted:",
      error
    );
    throw error;
  }
}

/**
 * Handle invoice.payment_succeeded event
 * Logs successful invoice payments
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(
    "[Webhook] Processing invoice.payment_succeeded",
    invoice.id,
    "for customer",
    invoice.customer
  );

  // Invoice payment succeeded - subscription is active
  // This is handled by customer.subscription.updated, but we log it for audit
}

/**
 * Main webhook handler
 * Verifies signature and routes to appropriate handler
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    console.error("[Webhook] Missing stripe-signature header");
    return res.status(400).json({ error: "Missing signature" });
  }

  let event: Stripe.Event;

  try {
    const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "");
    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("[Webhook] Signature verification failed:", error);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  // Handle test events for development
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
