CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`logoUrl` varchar(500),
	`brandColor` varchar(20),
	`type` enum('drone_service_provider','municipality','engineering_firm','other') NOT NULL DEFAULT 'drone_service_provider',
	`subscriptionTier` enum('starter','professional','pilot') NOT NULL DEFAULT 'starter',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `orgRole` enum('PROVIDER','ORG_ADMIN','ORG_USER');