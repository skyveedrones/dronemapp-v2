CREATE TABLE `project_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','vendor','viewer') NOT NULL DEFAULT 'viewer',
	`canEdit` enum('yes','no') NOT NULL DEFAULT 'no',
	`canDeleteMedia` enum('yes','no') NOT NULL DEFAULT 'no',
	`canCreateFlights` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_invitations` MODIFY COLUMN `role` enum('viewer','editor','vendor') NOT NULL DEFAULT 'viewer';