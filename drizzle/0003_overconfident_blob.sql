CREATE TABLE `activity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`company` varchar(255),
	`segment` varchar(64),
	`source` varchar(64) NOT NULL DEFAULT 'site',
	`status` enum('new','contacted','qualified','converted','lost') NOT NULL DEFAULT 'new',
	`message` text,
	`convertedUserId` int,
	`convertedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`priceCents` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'BRL',
	`interval` enum('month','year','lifetime','free') NOT NULL DEFAULT 'free',
	`maxFlights` int,
	`features` json,
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('active','trialing','past_due','canceled','expired') NOT NULL DEFAULT 'active',
	`amountCents` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'BRL',
	`interval` enum('month','year','lifetime','free') NOT NULL DEFAULT 'free',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`currentPeriodEnd` timestamp,
	`canceledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `activity_user_idx` ON `activity_events` (`userId`);--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `activity_type_idx` ON `activity_events` (`type`);--> statement-breakpoint
CREATE INDEX `lead_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `lead_source_idx` ON `leads` (`source`);--> statement-breakpoint
CREATE INDEX `lead_created_idx` ON `leads` (`createdAt`);--> statement-breakpoint
CREATE INDEX `sub_user_idx` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `sub_status_idx` ON `subscriptions` (`status`);