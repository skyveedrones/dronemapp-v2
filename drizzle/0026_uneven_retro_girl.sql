CREATE TABLE `project_overlays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fileUrl` varchar(512) NOT NULL,
	`opacity` decimal(4,2) DEFAULT '0.5',
	`coordinates` json DEFAULT ('[ [0,0],[0,0],[0,0],[0,0] ]'),
	`isActive` int DEFAULT 1,
	`label` varchar(100) DEFAULT 'Initial Plan',
	`version_number` int DEFAULT 1,
	`rotation` decimal(7,4) DEFAULT '0',
	`original_coordinates` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_overlays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','webmaster','client') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `client_project_assignments` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `media` ADD `transcodedUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `media` ADD `transcodedKey` varchar(500);--> statement-breakpoint
ALTER TABLE `media` ADD `transcodeStatus` enum('none','pending','processing','completed','failed') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `media` ADD `transcodeError` text;--> statement-breakpoint
ALTER TABLE `media` ADD `videoCodec` varchar(50);