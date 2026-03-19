CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(50) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`entityName` varchar(255),
	`userId` int NOT NULL,
	`userName` varchar(255),
	`details` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `clients` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `flights` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `flights` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `media` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `media` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `deletedBy` int;