import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { Database } from "bun:sqlite";

const db = new Database("campaigns.db");
db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
        campaign_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        due_date TEXT,
        created_at TEXT NOT NULL
      )
  `);

if (!db.query("SELECT 1 FROM campaigns").get()) {
    db.run(`INSERT INTO campaigns (name, created_at) VALUES (?, ?)`, [
        "Cyber Monday",
        new Date().toISOString(),
    ]);
}

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
    .onError(({ code, error, status }) => {
        if (code === "NOT_FOUND") return status(404, { error: "Not found" });
        if (code === "VALIDATION")
            return status(422, { error: "Bad request data" });
        console.error(error);
        return status(500, { error: "Something went wrong, try again later." });
    })
    .get("/campaigns", () => {
        return {
            data: db
                .query(
                    "SELECT campaign_id AS campaignId, name, due_date AS dueDate, created_at AS createdAt FROM campaigns",
                )
                .all(),
        };
    })
    .get(
        "/campaigns/:id",
        ({ params: { id }, status }) => {
            const campaign = db
                .query(
                    "SELECT campaign_id AS campaignId, name, due_date AS dueDate, created_at AS createdAt FROM campaigns WHERE campaign_id = ?",
                )
                .get(id);

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
        ({ body, status }) => {
            const campaign = db
                .query(
                    `INSERT INTO campaigns(name, due_date, created_at)
          VALUES (?, ?,?)
          RETURNING campaign_id AS campaignId, name, due_date AS dueDate, created_at AS createdAt`,
                )
                .get(body.name, body.dueDate ?? null, new Date().toISOString());
            return status(201, { data: campaign });
        },
        {
            body: t.Object({
                name: t.String(),
                dueDate: t.Optional(t.String({ format: "date" })),
            }),
        },
    )
    .delete(
        "/campaigns/:id",
        ({ params: { id }, status }) => {
            const { changes } = db.run(
                `DELETE FROM campaigns WHERE campaign_id = ?`,
                [id],
            );
            if (changes === 0) {
                return status(404, { message: "Campaign not found" });
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
        ({ params: { id }, body, status }) => {
            const campaign = db
                .query(
                    `UPDATE campaigns SET name = ?, due_date = ? WHERE campaign_id = ?
          RETURNING campaign_id AS campaignId, name, due_date AS dueDate, created_at AS createdAt`,
                )
                .get(body.name, body.dueDate ?? null, id);

            if (!campaign) {
                return status(404);
            }

            return { data: campaign };
        },
        {
            params: t.Object({ id: t.Number() }),
            body: t.Object({
                name: t.String(),
                dueDate: t.Optional(t.String()),
            }),
        },
    )
    .get("/", () => "Hello Anggyar")
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
