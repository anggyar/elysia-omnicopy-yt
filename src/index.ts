import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
// import { Database } from "bun:sqlite";
import { campaigns } from "./db/schema.js";

import { drizzle } from "drizzle-orm/node-postgres";
import { cors } from "@elysia/cors";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-typebox";

const _insertCampaign = createInsertSchema(campaigns);
const campaignBody = t.Omit(_insertCampaign, ["campaignId", "createdAt"]);
const db = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL!,
    },
});

// const campaigns = [
//     {
//         campaignId: 1,
//         name: "Summer Sale",
//         dueDate: new Date(),
//         createdAt: new Date(),
//     },
//     {
//         campaignId: 2,
//         name: "Black Friday Sale",
//         dueDate: new Date(),
//         createdAt: new Date(),
//     },
// ];
const app = new Elysia({ prefix: "api/v1" })
    .use(openapi())
    .use(cors({ origin: true }))
    .onError(({ code, error, status }) => {
        if (code === "NOT_FOUND") return status(404, { error: "Not found" });
        if (code === "VALIDATION")
            return status(422, { error: "Bad request data" });
        console.error(error);
        return status(500, { error: "Something went wrong, try again later." });
    })
    .get("/campaigns", async () => {
        return {
            data: await db.select().from(campaigns),
        };
    })
    .get(
        "/campaigns/:id",
        async ({ params: { id }, status }) => {
            const [campaign] = await db
                .select()
                .from(campaigns)
                .where(eq(campaigns.campaignId, id));

            if (!campaign) {
                return status(404, { message: "Campaign not found" });
            }

            return { data: campaign };
        },
        {
            params: t.Object({
                id: t.Number(),
            }),
        },
    )
    .post(
        "/campaigns",
        async ({ body, status }) => {
            const [campaign] = await db
                .insert(campaigns)
                .values(body)
                .returning();

            return status(201, { data: campaign });
        },
        {
            body: campaignBody,
        },
    )
    .delete(
        "/campaigns/:id",
        async ({ params: { id }, status }) => {
            const deleted = await db
                .delete(campaigns)
                .where(eq(campaigns.campaignId, id))
                .returning();

            if (deleted.length === 0) {
                return status(404, { error: "Delete item failed" });
            }
            return status(204, { message: "Campaign deleted successfully" });
        },
        {
            params: t.Object({
                id: t.Number(),
            }),
        },
    )
    .put(
        "/campaigns/:id",
        async ({ params: { id }, body, status }) => {
            const [campaign] = await db
                .update(campaigns)
                .set({
                    name: body.name,
                    dueDate: body.dueDate,
                })
                .where(eq(campaigns.campaignId, id))
                .returning();

            if (!campaign) {
                return status(404);
            }

            return { data: campaign };
        },
        {
            params: t.Object({ id: t.Number() }),
            body: campaignBody,
        },
    )
    .get("/", () => "Hello Anggyar")
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
