ALTER TABLE `flights` ADD `dronePilot` varchar(255);--> statement-breakpoint
ALTER TABLE `flights` ADD `faaLicenseNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `flights` ADD `laancAuthNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `flights` DROP COLUMN `pilotName`;--> statement-breakpoint
ALTER TABLE `flights` DROP COLUMN `pilotLicenseNumber`;--> statement-breakpoint
ALTER TABLE `flights` DROP COLUMN `pilotPhone`;--> statement-breakpoint
ALTER TABLE `flights` DROP COLUMN `pilotEmail`;