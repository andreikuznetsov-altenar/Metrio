import { serve } from "@hono/node-server";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";
import { MetrioStore, seedDevUsers } from "./db/store.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = process.env.METRIO_DB_PATH
  ?? path.join(__dirname, "..", ".data", "metrio.json");

const store = new MetrioStore(dataPath);
if (store.snapshot().users.length === 0) {
  store.update((db) => {
    db.users = seedDevUsers();
  });
}

const jwtSecret = process.env.METRIO_API_JWT_SECRET ?? "dev-jwt-secret-change-me";
const devSecret = process.env.METRIO_DEV_AUTH_SECRET ?? "dev-local-secret";
const allowDevAuth = process.env.METRIO_ALLOW_DEV_AUTH === "1";

const app = createApp({
  store,
  jwtSecret,
  devAuthSecret: devSecret,
  allowDevAuth,
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Metrio API listening on http://127.0.0.1:${port}`);
});
