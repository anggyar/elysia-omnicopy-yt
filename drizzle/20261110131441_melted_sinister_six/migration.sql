CREATE TABLE "campaigns" (
	"campaignId" serial PRIMARY KEY,
	"name" text NOT NULL,
	"dueDate" date,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
