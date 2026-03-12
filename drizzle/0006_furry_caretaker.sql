CREATE TABLE `warranty_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`reminderEmail` varchar(320) NOT NULL,
	`intervals` varchar(100) NOT NULL,
	`emailSubject` varchar(255),
	`emailMessage` text,
	`enabled` enum('yes','no') NOT NULL DEFAULT 'yes',
	`lastSentAt` timestamp,
	`nextReminderDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warranty_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `warrantyStartDate` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `warrantyEndDate` timestamp;