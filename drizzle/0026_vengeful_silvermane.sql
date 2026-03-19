ALTER TABLE `media` ADD `duration` int;--> statement-breakpoint
ALTER TABLE `media` ADD `resolution` varchar(50);--> statement-breakpoint
ALTER TABLE `media` ADD `frameRate` int;--> statement-breakpoint
ALTER TABLE `media` ADD `telemetryPath` json;--> statement-breakpoint
ALTER TABLE `media` ADD `uploadSessionId` varchar(255);--> statement-breakpoint
ALTER TABLE `media` ADD `processingStatus` enum('pending','processing','completed','failed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `media` ADD `processingError` text;