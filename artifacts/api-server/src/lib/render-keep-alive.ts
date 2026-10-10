import { logger } from "./logger";

const PING_INTERVAL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

let pingInProgress = false;

function getHealthCheckUrl() {
  const publicUrl =
    process.env["RENDER_PUBLIC_URL"]?.trim() ||
    process.env["RENDER_EXTERNAL_URL"]?.trim();
  if (!publicUrl) return null;

  let baseUrl: URL;
  try {
    baseUrl = new URL(publicUrl);
  } catch {
    logger.error(
      "RENDER_PUBLIC_URL must be a valid public Render URL, including https://",
    );
    return null;
  }

  if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    logger.error("RENDER_PUBLIC_URL must use http:// or https://");
    return null;
  }

  baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, "")}/api/healthz`;
  baseUrl.search = "";
  baseUrl.hash = "";
  return baseUrl;
}

async function pingRenderService(url: URL) {
  if (pingInProgress) return;
  pingInProgress = true;

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { "user-agent": "Marvel-Rivals-Render-Keep-Alive/1.0" },
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, host: url.host },
        "Render keep-alive request returned a non-success status",
      );
      return;
    }

    logger.debug({ host: url.host }, "Render keep-alive request succeeded");
  } catch (error) {
    logger.warn(
      { err: error, host: url.host },
      "Render keep-alive request failed",
    );
  } finally {
    pingInProgress = false;
  }
}

export function startRenderKeepAlive() {
  const healthCheckUrl = getHealthCheckUrl();
  if (!healthCheckUrl) {
    logger.info(
      "Render keep-alive disabled; set RENDER_PUBLIC_URL or provide Render's RENDER_EXTERNAL_URL",
    );
    return;
  }

  logger.info(
    { host: healthCheckUrl.host, intervalMinutes: PING_INTERVAL_MS / 60_000 },
    "Render keep-alive enabled",
  );

  void pingRenderService(healthCheckUrl);
  const interval = setInterval(
    () => void pingRenderService(healthCheckUrl),
    PING_INTERVAL_MS,
  );
  interval.unref();
}