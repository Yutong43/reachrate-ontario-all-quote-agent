/* global chrome, importScripts, REACHRATE_ROUTES */

importScripts("routes.js");

const VERSION = chrome.runtime.getManifest().version;
const LOCAL_APP_PATTERNS = ["http://127.0.0.1:3000/*", "http://localhost:3000/*"];

function sessionKey(tabId) {
  return `route-session:${tabId}`;
}

function isLocalAppUrl(value) {
  try {
    const url = new URL(value);
    return (
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      url.port === "3000"
    );
  } catch {
    return false;
  }
}

function hostMatches(route, hostname) {
  return route.hosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  );
}

function entryUrlFor(route, profile) {
  const postal = String(profile?.postalCode ?? "").replace(/\s+/g, "");
  return route.entryUrl.replaceAll("{postal}", encodeURIComponent(postal));
}

async function broadcastToApp(message) {
  const tabs = await chrome.tabs.query({ url: LOCAL_APP_PATTERNS });
  await Promise.all(
    tabs.map((tab) =>
      tab.id == null
        ? Promise.resolve()
        : chrome.tabs.sendMessage(tab.id, message).catch(() => undefined)
    )
  );
}

async function saveSession(tabId, session) {
  await chrome.storage.session.set({ [sessionKey(tabId)]: session });
}

async function readSession(tabId) {
  const result = await chrome.storage.session.get(sessionKey(tabId));
  return result[sessionKey(tabId)] ?? null;
}

async function findSession(runId, routeId) {
  const all = await chrome.storage.session.get(null);
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith("route-session:") || !value) continue;
    if (value.runId === runId && value.routeId === routeId) {
      return { tabId: Number(key.slice("route-session:".length)), session: value };
    }
  }
  return null;
}

async function recoverRecentSession(tabId, tabUrl) {
  let hostname = "";
  try {
    hostname = new URL(tabUrl ?? "").hostname;
  } catch {
    return null;
  }
  if (!hostname) return null;

  const all = await chrome.storage.session.get(null);
  const now = Date.now();
  const candidates = Object.entries(all)
    .filter(([key, value]) => {
      if (!key.startsWith("route-session:") || !value?.route) return false;
      const startedAt = Date.parse(value.startedAt ?? "");
      return hostMatches(value.route, hostname) && Number.isFinite(startedAt) && now - startedAt <= 30 * 60 * 1000;
    })
    .map(([, value]) => value)
    .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt));

  const session = candidates[0] ?? null;
  if (!session) return null;
  await saveSession(tabId, session);
  return session;
}

async function sessionForTab(tabId, tabUrl) {
  const attached = await readSession(tabId);
  if (attached) {
    try {
      const hostname = new URL(tabUrl ?? "").hostname;
      if (hostMatches(attached.route, hostname)) return attached;
    } catch {
      // Fall through to the bounded recovery path.
    }
  }
  return recoverRecentSession(tabId, tabUrl);
}

async function activeRouteSession() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return null;
  const session = await sessionForTab(tab.id, tab.url);
  if (!session) return null;
  return { tabId: tab.id, tab, session };
}

function plausiblePremium(amount, period) {
  return Number.isFinite(amount) && amount > 0 && (
    (period === "monthly" && amount <= 2500) ||
    (period === "annual" && amount <= 30000)
  );
}

async function popupState() {
  const active = await activeRouteSession();
  if (!active) {
    return {
      ok: true,
      connected: false,
      version: VERSION,
      message: "Open an official quote route from ReachRate first."
    };
  }
  const profile = active.session.profile ?? {};
  return {
    ok: true,
    connected: true,
    version: VERSION,
    tabId: active.tabId,
    routeId: active.session.routeId,
    routeName: active.session.route.name,
    underwriter: active.session.route.underwriter ?? "",
    intermediary: active.session.route.intermediary ?? null,
    profileName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Reviewed profile",
    postalCode: profile.postalCode ?? "",
    vehicle: [profile.vehicleYear, profile.vehicleMake, profile.vehicleModel].filter(Boolean).join(" "),
    pageUrl: active.tab.url ?? ""
  };
}

async function popupAutofill() {
  const active = await activeRouteSession();
  if (!active) throw new Error("Open a ReachRate quote route before using Autofill.");
  await chrome.tabs.update(active.tabId, { active: true });
  await chrome.tabs.sendMessage(active.tabId, {
    type: "REACHRATE_AUTOFILL",
    sensitiveAutofill: { address: false, contact: false }
  });
  return { ok: true, tabId: active.tabId };
}

async function popupManualResult(message) {
  const active = await activeRouteSession();
  if (!active) throw new Error("Open a ReachRate quote route before sending a result.");
  const premiumPeriod = message.premiumPeriod === "annual" ? "annual" : "monthly";
  const premiumAmount = Number(String(message.premiumAmount ?? "").replace(/[$,\s]/g, ""));
  const sourceBrand = String(message.sourceBrand ?? "").trim();
  const legalUnderwriter = String(message.legalUnderwriter ?? "").trim();
  if (!plausiblePremium(premiumAmount, premiumPeriod)) {
    throw new Error("Enter a plausible monthly or annual premium visible on this official page.");
  }
  if (!sourceBrand) throw new Error("Enter the company or returned insurer shown beside the price.");
  const resolvedUnderwriter = legalUnderwriter || active.session.route.underwriter || "";
  const returnedCarrierRequired = Boolean(active.session.route.intermediary) || !active.session.route.underwriter;
  const entryNames = [active.session.route.name, active.session.route.intermediary]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
  if (!resolvedUnderwriter || (returnedCarrierRequired && entryNames.includes(resolvedUnderwriter.toLowerCase()))) {
    throw new Error("This is not the underwriting company. Enter the returned insurer / legal underwriter shown with the price.");
  }

  const candidate = {
    premiumAmount,
    premiumPeriod,
    sourceBrand,
    legalUnderwriter: resolvedUnderwriter,
    intermediary: active.session.route.intermediary ?? null,
    resultType: active.session.route.resultType,
    reference: "",
    sourceUrl: active.tab.url ?? active.session.route.entryUrl,
    evidence: `User manually entered a ${premiumPeriod} premium visible on the official ${active.session.route.name} page at ${new Date().toISOString()}. ReachRate added it to the matching route card and preserved the source page.`,
    manualEntry: true
  };
  await broadcastToApp({
    type: "REACHRATE_ROUTE_EVENT",
    runId: active.session.runId,
    routeId: active.session.routeId,
    event: {
      status: "price_candidate",
      message: `A manually entered ${premiumPeriod} premium candidate was sent from ${active.session.route.name}.`,
      completedFields: [],
      candidate
    }
  });
  await focusApp({ appTabId: active.session.appTabId }, { tab: active.tab });
  return { ok: true };
}

async function startRoute(message, sender) {
  if (!isLocalAppUrl(sender.url ?? "")) {
    throw new Error("Quote routes may only be launched from the local ReachRate app.");
  }

  const route = REACHRATE_ROUTES[message.routeId];
  if (!route) throw new Error("This destination is not on the extension allowlist.");
  if (!message.profile || typeof message.profile !== "object") {
    throw new Error("A reviewed quote profile is required.");
  }

  // Attach the session before navigating so the destination content script can
  // never race the session write on a fast page load.
  const tab = await chrome.tabs.create({ url: "about:blank", active: true });
  if (tab.id == null) throw new Error("Chrome did not return a quote tab.");

  const session = {
    runId: String(message.runId),
    routeId: String(message.routeId),
    profile: message.profile,
    profileMode: message.profileMode === "personal_live" ? "personal_live" : "hypothetical",
    route,
    startedAt: new Date().toISOString(),
    appTabId: sender.tab?.id ?? null
  };
  await saveSession(tab.id, session);
  await chrome.tabs.update(tab.id, { url: entryUrlFor(route, message.profile), active: true });
  await broadcastToApp({
    type: "REACHRATE_ROUTE_EVENT",
    runId: session.runId,
    routeId: session.routeId,
    event: {
      status: "navigating",
      message: `${route.name} opened in a supervised browser tab.`,
      completedFields: []
    }
  });
  return { ok: true, tabId: tab.id };
}

async function resumeRoute(message) {
  const match = await findSession(String(message.runId), String(message.routeId));
  if (!match) throw new Error("The quote tab is no longer connected to this run.");
  const sensitiveAutofill = {
    address: match.session.sensitiveAutofill?.address === true || message.sensitiveAutofill?.address === true,
    contact: match.session.sensitiveAutofill?.contact === true || message.sensitiveAutofill?.contact === true
  };
  match.session.sensitiveAutofill = sensitiveAutofill;
  await saveSession(match.tabId, match.session);
  await chrome.tabs.update(match.tabId, { active: true });
  await chrome.tabs.sendMessage(match.tabId, { type: "REACHRATE_RESUME", sensitiveAutofill });
  return { ok: true, tabId: match.tabId };
}

async function focusApp(message, sender) {
  const session = sender.tab?.id == null ? null : await readSession(sender.tab.id);
  const preferredTabId = session?.appTabId ?? message.appTabId ?? null;
  if (preferredTabId != null) {
    await chrome.tabs.update(preferredTabId, { active: true }).catch(() => undefined);
    return { ok: true };
  }
  const tabs = await chrome.tabs.query({ url: LOCAL_APP_PATTERNS });
  if (tabs[0]?.id != null) await chrome.tabs.update(tabs[0].id, { active: true });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handle = async () => {
    if (message?.type === "REACHRATE_PING") {
      return { ok: true, version: VERSION };
    }

    if (message?.type === "REACHRATE_POPUP_STATE") {
      return popupState();
    }

    if (message?.type === "REACHRATE_POPUP_AUTOFILL") {
      return popupAutofill();
    }

    if (message?.type === "REACHRATE_POPUP_MANUAL_RESULT") {
      return popupManualResult(message);
    }

    if (message?.type === "REACHRATE_RUN_ROUTE") {
      return startRoute(message, sender);
    }

    if (message?.type === "REACHRATE_RESUME_ROUTE") {
      if (!isLocalAppUrl(sender.url ?? "")) throw new Error("Local app only.");
      return resumeRoute(message);
    }

    if (message?.type === "REACHRATE_GET_SESSION") {
      if (sender.tab?.id == null) return { ok: false, session: null };
      const session = await sessionForTab(sender.tab.id, sender.url);
      if (!session) return { ok: false, session: null };
      return { ok: true, session };
    }

    if (message?.type === "REACHRATE_ROUTE_EVENT") {
      if (sender.tab?.id == null) throw new Error("A quote tab is required.");
      const session = await readSession(sender.tab.id);
      if (!session) throw new Error("No supervised route session is attached to this tab.");
      const payload = {
        type: "REACHRATE_ROUTE_EVENT",
        runId: session.runId,
        routeId: session.routeId,
        event: message.event
      };
      await broadcastToApp(payload);
      return { ok: true };
    }

    if (message?.type === "REACHRATE_FOCUS_APP") {
      return focusApp(message, sender);
    }

    return { ok: false, error: "Unknown extension message." };
  };

  handle()
    .then((result) => sendResponse(result))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Extension action failed."
      })
    );
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(sessionKey(tabId)).catch(() => undefined);
});

chrome.webNavigation.onErrorOccurred.addListener((details) => {
  if (details.frameId !== 0) return;
  // Chromium reports a normal redirect/replacement navigation as ERR_ABORTED.
  // It is not evidence that the insurer page is unavailable.
  if (details.error === "net::ERR_ABORTED") return;
  void (async () => {
    const session = await readSession(details.tabId);
    if (!session) return;
    const blocker = `The official ${session.route.name} journey failed to load (${details.error}). No premium was returned.`;
    await broadcastToApp({
      type: "REACHRATE_ROUTE_EVENT",
      runId: session.runId,
      routeId: session.routeId,
      event: {
        status: "access_blocked",
        message: blocker,
        blocker,
        completedFields: [],
        pageUrl: details.url,
        at: new Date().toISOString()
      }
    });
  })().catch(() => undefined);
});
