CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`refereeName` varchar(255) NOT NULL,
	`refereeEmail` varchar(255) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`emailSent` boolean NOT NULL DEFAULT false,
	`refereeUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
