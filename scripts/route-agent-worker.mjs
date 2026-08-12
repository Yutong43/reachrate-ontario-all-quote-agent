import { chromium } from "playwright-core";

const routeConfigs = {
  allstate: { name: "Allstate", url: "https://www.allstate.ca/car-insurance/ontario" },
  aviva: { name: "Aviva Direct", url: "https://www.aviva.ca/en/direct/" },
  squareone: { name: "Square One", url: "https://www.squareone.ca/car" },
  rates: { name: "Rates.ca", url: "https://rates.ca/insurance-quotes/auto/ontario" },
  td: { name: "TD Insurance", url: "https://www.tdinsurance.com/products-services/auto-car-insurance" },
  desjardins: { name: "Desjardins Insurance", url: "https://www.desjardins.com/en/insurance/auto.html" },
  lowestrates: { name: "LowestRates.ca", url: "https://www.lowestrates.ca/insurance/auto/ontario" },
};

function emit(type, payload) {
  process.stdout.write(`${JSON.stringify({ type, [type]: payload })}\n`);
}

function workerEvent(message, tone = "active") {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, at: new Date().toISOString(), tone, message };
}

async function readInput() {
  let body = "";
  for await (const chunk of process.stdin) body += chunk;
  return JSON.parse(body.replace(/^\uFEFF/, ""));
}

function normalize(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function remember(completedFields, field, message) {
  if (completedFields.includes(field)) return;
  completedFields.push(field);
  emit("event", workerEvent(message, "success"));
}

async function detectAccessBlocker(page, responseStatus = null) {
  const title = (await page.title().catch(() => "")).toLowerCase();
  const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  const markers = ["captcha", "verify you are human", "human verification", "access denied", "attention required", "unusual traffic", "security check", "are you a robot"];
  return responseStatus === 403 || markers.some((marker) => title.includes(marker) || body.includes(marker));
}

async function firstVisible(locators) {
  for (const locator of locators) {
    if ((await locator.count().catch(() => 0)) > 0 && (await locator.first().isVisible().catch(() => false))) return locator.first();
  }
  return null;
}

async function dismissNonMaterialBanners(page) {
  const button = await firstVisible([
    page.getByRole("button", { name: /accept all|accept cookies|allow all|i agree|got it/i }),
    page.getByRole("button", { name: /^accept$/i }),
  ]);
  if (button) await button.click({ timeout: 2_000 }).catch(() => undefined);
}

async function openQuoteStart(page) {
  const start = await firstVisible([
    page.getByRole("link", { name: /start.*quote|get.*quote|begin.*quote|car.*quote/i }),
    page.getByRole("button", { name: /start.*quote|get.*quote|begin.*quote|car.*quote/i }),
  ]);
  if (!start) return;
  await start.click({ timeout: 4_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
}

async function fillInput(page, locators, value, field, completedFields, message) {
  if (!value) return false;
  const input = await firstVisible(locators);
  if (!input) return false;
  const type = await input.getAttribute("type").catch(() => null);
  if (["checkbox", "radio", "file", "hidden"].includes(type ?? "")) return false;
  await input.fill(String(value)).catch(() => undefined);
  const actual = await input.inputValue().catch(() => "");
  if (!actual) return false;
  remember(completedFields, field, message);
  return true;
}

async function fillPostalCode(page, postalCode, completedFields) {
  const filled = await fillInput(
    page,
    [
      page.getByLabel(/postal code/i),
      page.locator('input[name*="postal" i]'),
      page.locator('input[autocomplete="postal-code"]'),
      page.locator('input[placeholder*="postal" i]'),
      page.locator('input[placeholder="A1A 1A1"]'),
    ],
    postalCode,
    "postal_code",
    completedFields,
    "Visible Agent filled the approved Ontario postal code.",
  );
  if (!filled) return false;
  const advance = await firstVisible([
    page.getByRole("button", { name: /get.*quote|start|continue|next|go/i }),
    page.getByRole("link", { name: /get.*quote|start|continue|next/i }),
  ]);
  if (advance) {
    await advance.click({ timeout: 3_000 }).catch(() => undefined);
    await page.waitForTimeout(900);
  }
  return true;
}

async function selectMatchingOption(page, desired, semanticName, completedFields) {
  const desiredNormalized = normalize(desired);
  if (!desiredNormalized) return false;
  const selects = page.locator("select:visible");
  const count = await selects.count();
  for (let index = 0; index < count; index += 1) {
    const select = selects.nth(index);
    const options = await select.locator("option").allTextContents();
    const match = options.find((option) => {
      const candidate = normalize(option);
      return candidate && (candidate === desiredNormalized || candidate.includes(desiredNormalized) || desiredNormalized.includes(candidate));
    });
    if (!match) continue;
    const changed = await select.selectOption({ label: match }).then(() => true).catch(() => false);
    if (!changed) continue;
    remember(completedFields, semanticName, `Visible Agent selected ${semanticName.replaceAll("_", " ")}.`);
    await page.waitForTimeout(450);
    return true;
  }
  return false;
}

async function clickChoice(page, expressions, field, completedFields) {
  for (const expression of expressions) {
    const choice = await firstVisible([
      page.getByRole("button", { name: expression }),
      page.getByRole("radio", { name: expression }),
      page.getByLabel(expression),
      page.getByText(expression, { exact: true }),
    ]);
    if (!choice) continue;
    const clicked = await choice.click({ timeout: 2_500 }).then(() => true).catch(() => false);
    if (!clicked) continue;
    remember(completedFields, field, `Visible Agent answered ${field.replaceAll("_", " ")}.`);
    await page.waitForTimeout(350);
    return true;
  }
  return false;
}

async function mapSafeVisibleFields(page, profile, completedFields) {
  await fillPostalCode(page, profile.postalCode, completedFields);
  await fillInput(page, [page.getByLabel(/first name/i), page.locator('input[name*="first" i]')], profile.firstName, "first_name", completedFields, "Visible Agent filled the approved first name.");
  await fillInput(page, [page.getByLabel(/last name/i), page.locator('input[name*="last" i]')], profile.lastName, "last_name", completedFields, "Visible Agent filled the approved last name.");
  await fillInput(page, [page.getByLabel(/date of birth|birth date/i), page.locator('input[type="date"]')], profile.dateOfBirth, "date_of_birth", completedFields, "Visible Agent filled the approved date of birth.");

  await selectMatchingOption(page, profile.vehicleYear, "vehicle_year", completedFields);
  await selectMatchingOption(page, profile.vehicleMake, "vehicle_make", completedFields);
  await selectMatchingOption(page, profile.vehicleModel, "vehicle_model", completedFields);
  await selectMatchingOption(page, profile.licenceClass, "licence_class", completedFields);
  await selectMatchingOption(page, profile.maritalStatus.replace("_", " "), "marital_status", completedFields);
  await selectMatchingOption(page, profile.employmentStatus, "employment_status", completedFields);
  await selectMatchingOption(page, profile.annualKilometres, "annual_kilometres", completedFields);

  await clickChoice(page, [profile.vehicleCondition === "new" ? /^new$/i : /^used$/i], "vehicle_condition", completedFields);
  await clickChoice(page, [profile.vehicleOwnership === "leased" ? /^leased$/i : profile.vehicleOwnership === "financed" ? /financ/i : /^owned$/i], "vehicle_ownership", completedFields);
  await clickChoice(page, [profile.primaryUse === "business" ? /business/i : /personal|pleasure/i], "primary_use", completedFields);
  await clickChoice(page, [profile.winterTires ? /^yes$/i : /^no$/i], "winter_tires", completedFields);
}

async function holdVisibleBrowser(browser, milliseconds) {
  if (milliseconds <= 0) return;
  await Promise.race([
    new Promise((resolve) => browser.once("disconnected", resolve)),
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ]);
}

let browser;
let currentRouteId = "allstate";
let completedFields = [];
try {
  const input = await readInput();
  const { routeId, profile, profileMode, holdMs } = input;
  currentRouteId = routeId;
  const config = routeConfigs[routeId];
  if (!config) throw new Error("Unsupported official route.");
  emit("event", workerEvent(`Starting visible ${config.name} browser route.`));

  browser = await chromium.launch({
    channel: "chrome",
    headless: process.env.REACHRATE_BROWSER_HEADLESS === "true",
    args: ["--new-window"],
  });
  const context = await browser.newContext({ locale: "en-CA", viewport: { width: 1360, height: 900 } });
  const page = await context.newPage();
  const response = await page.goto(config.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  emit("event", workerEvent("Official public route opened in a visible Chrome window."));
  await dismissNonMaterialBanners(page);

  if (await detectAccessBlocker(page, response?.status() ?? null)) {
    const result = { status: "access_blocked", routeId, completedFields, blocker: "CAPTCHA, Cloudflare or another human-verification page was detected. The Agent stopped without bypassing it." };
    emit("event", workerEvent(result.blocker, "warning"));
    emit("result", result);
    await holdVisibleBrowser(browser, holdMs);
  } else {
    await openQuoteStart(page);
    await dismissNonMaterialBanners(page);
    if (await detectAccessBlocker(page)) {
      const result = { status: "waiting_human", routeId, completedFields, blocker: "Human verification appeared at the quote start. Complete only that visible checkpoint, then return to ReachRate." };
      emit("event", workerEvent(result.blocker, "warning"));
      emit("result", result);
      await holdVisibleBrowser(browser, holdMs);
    } else {
      await mapSafeVisibleFields(page, profile, completedFields);
      const blocker = profileMode === "hypothetical"
        ? "Safe non-verifying fields were mapped. Because this is a hypothetical profile, the Agent stopped before any licence lookup, declaration, contact submission or purchase step."
        : "Safe mapped fields were filled. Review the visible journey before any identity lookup, declaration, contact submission or purchase step.";
      const result = { status: completedFields.length === 0 ? "unresolved" : "manual_handoff", routeId, completedFields, blocker: completedFields.length === 0 ? "The official route opened, but its current controls did not match the safe field adapters. No result was claimed." : blocker };
      emit("event", workerEvent(result.blocker, completedFields.length === 0 ? "warning" : "success"));
      emit("result", result);
      await holdVisibleBrowser(browser, holdMs);
    }
  }
} catch (error) {
  const result = { status: "unresolved", routeId: currentRouteId, completedFields, blocker: error instanceof Error ? error.message.split("\n")[0].slice(0, 280) : "Visible browser worker failed." };
  emit("event", workerEvent("Visible browser worker stopped with a recoverable error.", "warning"));
  emit("result", result);
  process.exitCode = 1;
} finally {
  if (browser?.isConnected()) await browser.close().catch(() => undefined);
}
