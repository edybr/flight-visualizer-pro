CREATE TABLE `actual_flights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`flightName` varchar(255) NOT NULL,
	`droneModel` varchar(128),
	`sourceFormat` varchar(16) NOT NULL,
	`sourceFileName` varchar(255),
	`startedAt` varchar(32),
	`endedAt` varchar(32),
	`flightDate` varchar(16),
	`durationSeconds` int,
	`distanceMeters` int,
	`maxAltitudeMeters` int,
	`maxSpeedMs` int,
	`pointsCount` int,
	`locationLabel` varchar(255),
	`trajectory` json,
	`relatedFlightId` int,
	`shareToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actual_flights_id` PRIMARY KEY(`id`),
	CONSTRAINT `actual_share_token_idx` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE INDEX `actual_user_idx` ON `actual_flights` (`userId`);--> statement-breakpoint
CREATE INDEX `actual_date_idx` ON `actual_flights` (`flightDate`);