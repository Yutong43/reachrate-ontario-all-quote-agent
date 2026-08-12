/* global chrome */

const APP_SOURCE = "reachrate-app";
const EXTENSION_SOURCE = "reachrate-extension";

function isAllowedOrigin(origin) {
  try {
    const url = new URL(origin);
    return (
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      url.port === "3000"
    );
  } catch {
    return false;
  }
}

function postToApp(message) {
  window.postMessage(message, window.location.origin);
}

function runtimeMessage(message, callback) {
  try {
    if (!globalThis.chrome?.runtime?.id || typeof chrome.runtime.sendMessage !== "function") {
      callback?.(null, new Error("The ReachRate extension was reloaded. Refresh this ReachRate tab once, then retry the quote route."));
      return;
    }
    chrome.runtime.sendMessage(message, (response) => {
      let runtimeError = null;
      try {
        runtimeError = chrome.runtime.lastError ?? null;
      } catch {
        runtimeError = { message: "The extension connection was replaced." };
      }
      callback?.(response, runtimeError ? new Error(runtimeError.message) : null);
    });
  } catch (error) {
    callback?.(
      null,
      error instanceof Error
        ? error
        : new Error("The ReachRate extension connection is unavailable."),
    );
  }
}

function announce() {
  runtimeMessage({ type: "REACHRATE_PING" }, (response, error) => {
    if (error || !response?.ok) {
      postToApp({
        source: EXTENSION_SOURCE,
        type: "DISCONNECTED",
        message: error?.message ?? "The ReachRate extension is not responding."
      });
      return;
    }
    postToApp({
      source: EXTENSION_SOURCE,
      type: "READY",
      version: response.version
    });
  });
}

window.addEventListener("message", (event) => {
  if (event.source !== window || !isAllowedOrigin(event.origin)) return;
  const message = event.data;
  if (!message || message.source !== APP_SOURCE) return;

  if (message.type === "PING") {
    announce();
    return;
  }

  if (message.type === "RUN_ROUTE") {
    runtimeMessage(
      {
        type: "REACHRATE_RUN_ROUTE",
        runId: message.runId,
        routeId: message.routeId,
        profile: message.profile,
        profileMode: message.profileMode
      },
      (response, error) => {
        if (!error && response?.ok) return;
        const blocker = error?.message ?? response?.error ?? "The extension could not open this route.";
        postToApp({
          source: EXTENSION_SOURCE,
          type: "ROUTE_EVENT",
          runId: message.runId,
          routeId: message.routeId,
          event: {
            status: "blocked",
            message: blocker,
            blocker,
            completedFields: []
          }
        });
      }
    );
    return;
  }

  if (message.type === "RESUME_ROUTE") {
    runtimeMessage(
      {
        type: "REACHRATE_RESUME_ROUTE",
        runId: message.runId,
        routeId: message.routeId,
        sensitiveAutofill: message.sensitiveAutofill
      },
      (response, error) => {
        if (!error && response?.ok) return;
        const blocker = error?.message ?? response?.error ?? "The extension could not resume this route.";
        postToApp({
          source: EXTENSION_SOURCE,
          type: "ROUTE_EVENT",
          runId: message.runId,
          routeId: message.routeId,
          event: { status: "blocked", message: blocker, blocker, completedFields: [] }
        });
      }
    );
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "REACHRATE_ROUTE_EVENT") return;
  postToApp({
    source: EXTENSION_SOURCE,
    type: "ROUTE_EVENT",
    runId: message.runId,
    routeId: message.routeId,
    event: message.event
  });
});

announce();
document.addEventListener("DOMContentLoaded", announce, { once: true });
window.setTimeout(announce, 1200);
