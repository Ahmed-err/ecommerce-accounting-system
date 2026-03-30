const ALERT_THRESHOLDS = {
  errorRatePct: Number(process.env.ALERT_5XX_RATE_PCT || 2),
  checkoutFailurePct: Number(process.env.ALERT_CHECKOUT_FAILURE_RATE_PCT || 5),
  dbSaturationPct: Number(process.env.ALERT_DB_SATURATION_PCT || 85),
};

function toJsonSafe(payload = {}) {
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return { detail: "unserializable_payload" };
  }
}

async function postWebhook(url, body) {
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Never break request flow because of monitoring transport failures.
  }
}

export async function captureException(error, context = {}) {
  const webhook = process.env.ERROR_TRACKING_WEBHOOK_URL || process.env.SENTRY_WEBHOOK_URL;
  if (!webhook) return;
  const err = error instanceof Error ? error : new Error(String(error || "unknown_error"));
  await postWebhook(webhook, {
    type: "exception",
    ts: new Date().toISOString(),
    message: err.message,
    stack: err.stack || null,
    context: toJsonSafe(context),
  });
}

export async function emitAlert(event, payload = {}) {
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (!webhook) return;
  await postWebhook(webhook, {
    type: "alert",
    event,
    thresholds: ALERT_THRESHOLDS,
    ts: new Date().toISOString(),
    payload: toJsonSafe(payload),
  });
}

export { ALERT_THRESHOLDS };
