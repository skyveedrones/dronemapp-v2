# Stripe Webhook Testing Guide for MAPIT

This guide walks you through testing Stripe webhooks in sandbox mode to verify subscription status updates are working correctly.

## Prerequisites

- Stripe account with test mode enabled
- MAPIT application running locally or deployed
- Webhook endpoint configured in Stripe Dashboard
- Access to your Stripe Dashboard

## Step 1: Verify Your Webhook Endpoint is Registered

### In Stripe Dashboard:

1. Go to **Developers** → **Webhooks** (left sidebar)
2. Look for your webhook endpoint URL (should be something like `https://yourdomain.com/api/stripe/webhook`)
3. Verify the endpoint is **Active** (green checkmark)
4. Click on the endpoint to view details
5. Under **Events to send**, confirm these are enabled:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`

If the endpoint doesn't exist, you need to add it:
1. Click **Add endpoint**
2. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
3. Select the events listed above
4. Click **Add endpoint**

## Step 2: Get Your Webhook Signing Secret

1. In the **Webhooks** section, click on your endpoint
2. Scroll down to **Signing secret**
3. Click **Reveal** to show the secret (starts with `whsec_`)
4. Copy this secret
5. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

Your application should already have this configured, but verify it's set correctly.

## Step 3: Test Checkout Flow (Manual)

This creates a real test subscription that you can monitor:

1. **Open your MAPIT application** in browser
2. **Navigate to Pricing page** (`/pricing`)
3. **Select a plan** (e.g., Professional Monthly)
4. **Click "Subscribe"** button
5. You'll be redirected to Stripe Checkout
6. **Use test card**: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - Billing name: Any name (e.g., "Test User")
7. **Click "Pay"** to complete the checkout
8. You should be redirected back to your app with success message

### What happens behind the scenes:

- Stripe creates a `checkout.session` with status `complete`
- Stripe fires `checkout.session.completed` webhook event
- Your webhook handler receives the event and:
  - Creates a Stripe customer record
  - Creates a subscription in your database
  - Updates the user's `subscriptionTier` and `stripeSubscriptionId`

## Step 4: Monitor Webhook Events in Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Scroll down to **Events** section
4. You should see recent events listed with timestamps
5. Click on any event to see:
   - Event ID
   - Event type (e.g., `checkout.session.completed`)
   - Request body (the data sent to your webhook)
   - Response status (should be `200 OK`)

### Expected Events After Checkout:

1. **checkout.session.completed** - Checkout session finished
2. **customer.subscription.created** - Subscription created
3. **invoice.created** - First invoice generated
4. **invoice.finalized** - Invoice finalized
5. **invoice.payment_succeeded** - Payment processed

## Step 5: Test Webhook Events Using Stripe CLI (Advanced)

The Stripe CLI allows you to send test events without going through the full checkout flow.

### Install Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl https://files.stripe.com/stripe-cli/install.sh -o install.sh && sudo bash install.sh

# Windows
choco install stripe
```

### Login to Stripe:

```bash
stripe login
```

This will open a browser window to authenticate. Approve the login.

### Forward Webhook Events to Local Machine:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This command:
- Connects to your Stripe account
- Listens for all webhook events
- Forwards them to your local webhook endpoint
- Displays events in the terminal as they arrive

### Send Test Events:

In another terminal window, use `stripe trigger` to send test events:

```bash
# Test checkout.session.completed
stripe trigger checkout.session.completed

# Test customer.subscription.updated
stripe trigger customer.subscription.updated

# Test customer.subscription.deleted
stripe trigger customer.subscription.deleted

# Test invoice.payment_succeeded
stripe trigger invoice.payment_succeeded
```

### Monitor Events:

The `stripe listen` terminal will show output like:

```
2026-03-02 10:15:23   checkout.session.completed [evt_test_...]
2026-03-02 10:15:24   customer.subscription.created [evt_test_...]
2026-03-02 10:15:25   invoice.payment_succeeded [evt_test_...]
```

## Step 6: Verify Database Updates

After webhook events are processed, verify the database was updated:

### Using the Management UI:

1. Go to your MAPIT project Management UI
2. Click **Database** panel
3. Open the `users` table
4. Find your test user
5. Verify these fields were updated:
   - `stripeCustomerId` - Should have a value like `cus_...`
   - `stripeSubscriptionId` - Should have a value like `sub_...`
   - `subscriptionTier` - Should show `starter`, `professional`, or `business`
   - `subscriptionStatus` - Should show `active`
   - `billingPeriod` - Should show `month` or `year`
   - `currentPeriodStart` - Should have a timestamp
   - `currentPeriodEnd` - Should have a future timestamp

### Using SQL Query:

```sql
SELECT 
  id, 
  email, 
  subscriptionTier, 
  subscriptionStatus, 
  stripeCustomerId, 
  stripeSubscriptionId,
  billingPeriod,
  currentPeriodStart,
  currentPeriodEnd
FROM users 
WHERE email = 'your-test-email@example.com';
```

## Step 7: Test Subscription Updates

### Test Plan Upgrade:

1. **Go to Billing page** (`/billing`)
2. **Select a higher tier** (e.g., upgrade from Starter to Professional)
3. **Click "Upgrade"** button
4. Complete checkout with test card
5. Verify in database:
   - `subscriptionTier` updated to new tier
   - `stripeSubscriptionId` updated (new subscription)
   - `currentPeriodEnd` extended

### Test Subscription Cancellation:

1. **Go to Billing page** (`/billing`)
2. **Click "Cancel Subscription"** button (if implemented)
3. Verify webhook event `customer.subscription.deleted` is received
4. Verify in database:
   - `subscriptionStatus` changed to `canceled`
   - `cancelAtPeriodEnd` set to `yes`

## Step 8: Test Error Scenarios

### Test Invalid Price ID:

1. Temporarily change a price ID in `server/products.ts` to an invalid value
2. Try to create a checkout session
3. Verify error is logged and user sees error message
4. Revert the change

### Test Missing Webhook Secret:

1. Temporarily remove `STRIPE_WEBHOOK_SECRET` from environment
2. Send a test webhook event
3. Verify webhook is rejected (should see 401 error in Stripe Dashboard)
4. Restore the secret

### Test Duplicate Webhook Processing:

1. Send the same webhook event twice
2. Verify idempotency - subscription should not be created twice
3. Check that the second event is handled gracefully

## Step 9: Common Issues and Troubleshooting

### Issue: Webhook events not being received

**Solution:**
- Check webhook endpoint URL is correct in Stripe Dashboard
- Verify endpoint is **Active** (green checkmark)
- Check application logs for errors
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify firewall/network allows Stripe to reach your endpoint

### Issue: Webhook received but database not updated

**Solution:**
- Check application logs for errors in webhook handler
- Verify database connection is working
- Check that user exists in database
- Verify `stripeCustomerId` matches in Stripe and database

### Issue: Subscription status not updating

**Solution:**
- Verify webhook handler is processing the correct event type
- Check that the event data contains expected fields
- Verify database columns exist and are not read-only
- Check for any database constraints preventing updates

### Issue: Test events not triggering with Stripe CLI

**Solution:**
- Verify Stripe CLI is logged in: `stripe status`
- Verify webhook forwarding is active: `stripe listen --forward-to ...`
- Check that event type exists: `stripe trigger --help`
- Verify application is running and webhook endpoint is accessible

## Step 10: Production Readiness Checklist

Before going live, verify:

- [ ] Webhook endpoint is registered in Stripe Dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` is set in production environment
- [ ] Webhook handler logs all events for audit trail
- [ ] Error handling is robust (retries, dead letter queue)
- [ ] Database updates are idempotent (no duplicate subscriptions)
- [ ] User receives confirmation email after subscription
- [ ] Billing page displays correct subscription status
- [ ] Plan limits are enforced based on subscription tier
- [ ] Upgrade/downgrade flow works end-to-end
- [ ] Cancellation flow works and updates status correctly
- [ ] Webhook events are monitored in production (Stripe Dashboard)

## Useful Stripe Dashboard Links

- **Test Mode Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Test Mode Events**: https://dashboard.stripe.com/test/events
- **Test Mode Customers**: https://dashboard.stripe.com/test/customers
- **Test Mode Subscriptions**: https://dashboard.stripe.com/test/subscriptions
- **API Keys**: https://dashboard.stripe.com/test/apikeys/overview

## Testing Checklist

Use this checklist to verify all webhook functionality:

- [ ] Checkout creates subscription successfully
- [ ] User record updated with `stripeCustomerId`
- [ ] User record updated with `stripeSubscriptionId`
- [ ] User record updated with `subscriptionTier`
- [ ] User record updated with `billingPeriod`
- [ ] User record updated with `currentPeriodStart` and `currentPeriodEnd`
- [ ] Billing page displays correct plan
- [ ] Billing page shows correct next billing date
- [ ] Plan upgrade creates new subscription
- [ ] Plan downgrade creates new subscription
- [ ] Subscription cancellation updates status
- [ ] Webhook events appear in Stripe Dashboard
- [ ] All events show `200 OK` response status
- [ ] No errors in application logs
- [ ] Database remains consistent (no duplicate records)

## Next Steps

After testing webhooks:

1. **Monitor in production** - Set up alerts for webhook failures
2. **Add email notifications** - Send confirmation emails for subscription events
3. **Implement retry logic** - Handle temporary webhook failures
4. **Add audit logging** - Log all subscription changes for compliance
5. **Set up monitoring** - Track webhook delivery rates and latency

---

For more information, see:
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Test Cards](https://stripe.com/docs/testing)
