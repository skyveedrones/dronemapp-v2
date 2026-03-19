ALTER TABLE `media` ADD `thumbnailKey` varchar(500);--> statement-breakpoint
ALTER TABLE `media` ADD `originalWidth` int;--> statement-breakpoint
ALTER TABLE `media` ADD `originalHeight` int;--> statement-breakpoint
ALTER TABLE `media` ADD `thumbnailWidth` int;--> statement-breakpoint
ALTER TABLE `media` ADD `thumbnailHeight` int;--> statement-breakpoint
ALTER TABLE `media` ADD `isHighResolution` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `media` ADD `highResUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `media` ADD `highResKey` varchar(500);--> statement-breakpoint
ALTER TABLE `media` ADD `highResFileSize` int;