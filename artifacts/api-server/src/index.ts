import app from "./app";
import { startDiscordBot } from "./lib/discord";
import { logger } from "./lib/logger";
import { startRenderKeepAlive } from "./lib/render-keep-alive";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startRenderKeepAlive();
});

startDiscordBot().catch((error) => {
  logger.error({ err: error }, "Unable to start Discord bot");
});
