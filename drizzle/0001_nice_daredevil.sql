CREATE TABLE `flights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`protocol` varchar(64) NOT NULL,
	`status` varchar(128),
	`flightType` varchar(32),
	`operationType` varchar(64),
	`operationName` varchar(255),
	`operationStart` varchar(32),
	`operationFinish` varchar(32),
	`interval` varchar(64),
	`asaReason` text,
	`analisedAt` varchar(32),
	`canceled` varchar(32),
	`createdAtSarpas` varchar(32),
	`operationResponsible` json,
	`defaultOperator` json,
	`flightPilots` json,
	`aircrafts` json,
	`requestedArea` json,
	`shareToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flights_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_protocol_idx` UNIQUE(`userId`,`protocol`),
	CONSTRAINT `share_token_idx` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flightId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_idx` ON `flights` (`userId`);--> statement-breakpoint
CREATE INDEX `start_idx` ON `flights` (`operationStart`);--> statement-breakpoint
CREATE INDEX `flight_idx` ON `notes` (`flightId`);