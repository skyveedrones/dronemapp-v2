ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','starter','professional','business','enterprise') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','canceled','past_due','trialing','incomplete');--> statement-breakpoint
ALTER TABLE `users` ADD `billingPeriod` enum('monthly','annual');--> statement-breakpoint
ALTER TABLE `users` ADD `currentPeriodStart` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `currentPeriodEnd` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `cancelAtPeriodEnd` enum('yes','no') DEFAULT 'no';