/* global chrome */

const byId = (id) => document.getElementById(id);
let activeState = null;

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.ok) return reject(new Error(response?.error ?? "Extension action failed."));
      resolve(response);
    });
  });
}

function feedback(message, error = false) {
  const node = byId("feedback");
  node.hidden = false;
  node.classList.toggle("error", error);
  node.textContent = message;
}

async function loadState() {
  try {
    const state = await send({ type: "REACHRATE_POPUP_STATE" });
    activeState = state;
    byId("state").querySelector("span").textContent = state.connected ? "Connected to official quote" : "No active quote route";
    byId("state").classList.toggle("connected", state.connected);
    byId("route-panel").hidden = !state.connected;
    byId("empty-panel").hidden = state.connected;
    if (!state.connected) return;
    byId("profile-name").textContent = state.profileName;
    byId("profile-detail").textContent = [state.postalCode, state.vehicle].filter(Boolean).join(" · ");
    byId("route-name").textContent = state.routeName;
    byId("source-brand").value = state.intermediary ? "" : state.routeName;
    byId("underwriter").value = state.underwriter ?? "";
  } catch (error) {
    feedback(error instanceof Error ? error.message : "Unable to read the active quote tab.", true);
  }
}

byId("autofill")?.addEventListener("click", async () => {
  const button = byId("autofill");
  button.disabled = true;
  button.textContent = "Autofill running…";
  try {
    await send({ type: "REACHRATE_POPUP_AUTOFILL" });
    feedback(`Autofill started on ${activeState?.routeName ?? "the official quote"}.`);
    window.setTimeout(() => window.close(), 650);
  } catch (error) {
    feedback(error instanceof Error ? error.message : "Autofill failed.", true);
    button.disabled = false;
    button.textContent = "Autofill this quote";
  }
});

byId("manual-toggle")?.addEventListener("click", () => {
  const form = byId("manual-form");
  form.hidden = !form.hidden;
  byId("manual-toggle").textContent = form.hidden ? "Manually update a visible price" : "Hide manual price update";
});

byId("manual-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = byId("send-result");
  button.disabled = true;
  button.textContent = "Sending to ReachRate…";
  try {
    await send({
      type: "REACHRATE_POPUP_MANUAL_RESULT",
      sourceBrand: byId("source-brand").value.trim(),
      legalUnderwriter: byId("underwriter").value.trim(),
      premiumAmount: byId("premium").value,
      premiumPeriod: byId("period").value
    });
    feedback("Price sent to the matching ReachRate route card.");
    window.setTimeout(() => window.close(), 850);
  } catch (error) {
    feedback(error instanceof Error ? error.message : "Unable to send the result.", true);
    button.disabled = false;
    button.textContent = "Send price to ReachRate";
  }
});

byId("open-app")?.addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ url: ["http://127.0.0.1:3000/*", "http://localhost:3000/*"] });
  if (tabs[0]?.id != null) await chrome.tabs.update(tabs[0].id, { active: true });
  else await chrome.tabs.create({ url: "http://127.0.0.1:3000/" });
  window.close();
});

void loadState();
