/* global chrome */

(() => {
  if (window.top !== window || document.getElementById("reachrate-copilot")) return;

  const completedFields = new Set();
  const clickedAdvances = new Set();
  let session = null;
  let running = false;
  let paused = false;
  let overlay = null;
  let stablePasses = 0;
  let sensitiveReviewPending = false;

  const wait = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function normalize(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]/g, "");
  }

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity || "1") > 0 &&
      box.width > 0 &&
      box.height > 0
    );
  }

  function textOf(element) {
    if (!(element instanceof HTMLElement)) return "";
    const parts = [
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("alt"),
      element.getAttribute("title"),
      element.getAttribute("name"),
      element.id
    ];
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label) parts.push(label.textContent);
    }
    const wrappingLabel = element.closest("label");
    if (wrappingLabel) parts.push(wrappingLabel.textContent);
    const fieldset = element.closest("fieldset, [role='group'], [role='radiogroup']");
    if (fieldset) parts.push(fieldset.textContent?.slice(0, 500));
    return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  function dispatchValueEvents(element) {
    for (const type of ["input", "change", "blur"]) {
      element.dispatchEvent(new Event(type, { bubbles: true }));
    }
  }

  function setInputValue(input, value) {
    const prototype = input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(input, String(value));
    else input.value = String(value);
    dispatchValueEvents(input);
  }

  function mark(field) {
    completedFields.add(field);
  }

  function sendEvent(status, message, extra = {}) {
    if (!session) return;
    chrome.runtime.sendMessage({
      type: "REACHRATE_ROUTE_EVENT",
      event: {
        status,
        message,
        completedFields: [...completedFields],
        pageUrl: window.location.href,
        pageTitle: document.title,
        at: new Date().toISOString(),
        ...extra
      }
    });
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    const root = document.createElement("aside");
    root.id = "reachrate-copilot";
    root.dataset.tone = "active";
    root.innerHTML = `
      <div class="rr-panel">
        <div class="rr-head">
          <div class="rr-mark">RR</div>
          <div class="rr-head-copy">
            <p class="rr-kicker">Supervised quote agent</p>
            <p class="rr-route"></p>
          </div>
          <button class="rr-hide" type="button" aria-label="Minimize ReachRate">−</button>
        </div>
        <div class="rr-body">
          <span class="rr-status">Connecting</span>
          <h2 class="rr-title">Preparing this route</h2>
          <p class="rr-detail">ReachRate fills only the reviewed profile and stops before consent, identity lookup, CAPTCHA or purchase.</p>
          <div class="rr-progress">0 mapped fields</div>
          <div class="rr-actions">
            <button class="rr-button rr-button-primary rr-resume" type="button">Run safe fill</button>
            <button class="rr-button rr-app" type="button">Open ReachRate</button>
            <button class="rr-button rr-manual-toggle" type="button">Enter result manually</button>
          </div>
          <form class="rr-manual-form" hidden>
            <p class="rr-manual-title">Official result fallback</p>
            <label>Company / brand<input class="rr-manual-brand" placeholder="Returned insurer or brand shown" required /></label>
            <label>Legal underwriter<input class="rr-manual-underwriter" placeholder="If shown on the result" /></label>
            <div class="rr-manual-row">
              <label>Premium (CAD)<input class="rr-manual-premium" type="text" inputmode="decimal" pattern="[0-9$,. ]+" placeholder="200.00" autocomplete="off" required /></label>
              <label>Period<select class="rr-manual-period"><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
            </div>
            <button class="rr-button rr-button-primary rr-manual-submit" type="submit">Send candidate to ReachRate</button>
            <p class="rr-manual-note">Use only a price visible on this official page. ReachRate will ask you to confirm it before saving.</p>
          </form>
        </div>
      </div>`;
    (document.body || document.documentElement).appendChild(root);
    root.querySelector(".rr-hide")?.addEventListener("click", () => {
      root.classList.toggle("rr-collapsed");
      const button = root.querySelector(".rr-hide");
      if (button) button.textContent = root.classList.contains("rr-collapsed") ? "+" : "−";
    });
    root.querySelector(".rr-resume")?.addEventListener("click", () => {
      paused = false;
      void runAutomation();
    });
    root.querySelector(".rr-app")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "REACHRATE_FOCUS_APP" });
    });
    root.querySelector(".rr-manual-toggle")?.addEventListener("click", () => {
      const form = root.querySelector(".rr-manual-form");
      if (!(form instanceof HTMLFormElement)) return;
      form.hidden = !form.hidden;
      const button = root.querySelector(".rr-manual-toggle");
      if (button) button.textContent = form.hidden ? "Enter result manually" : "Hide manual entry";
    });
    root.querySelector(".rr-manual-form")?.addEventListener("submit", submitManualCandidate);
    overlay = root;
    return root;
  }

  function updateOverlay({ status, title, detail, tone = "active", button = "Run safe fill" }) {
    const root = ensureOverlay();
    root.dataset.tone = tone;
    const route = root.querySelector(".rr-route");
    const statusNode = root.querySelector(".rr-status");
    const titleNode = root.querySelector(".rr-title");
    const detailNode = root.querySelector(".rr-detail");
    const progress = root.querySelector(".rr-progress");
    const resume = root.querySelector(".rr-resume");
    const manualBrand = root.querySelector(".rr-manual-brand");
    const manualUnderwriter = root.querySelector(".rr-manual-underwriter");
    if (route) route.textContent = session?.route?.name ?? "Official quote route";
    if (statusNode) statusNode.textContent = status;
    if (titleNode) titleNode.textContent = title;
    if (detailNode) detailNode.textContent = detail;
    if (progress) progress.textContent = `${completedFields.size} mapped field${completedFields.size === 1 ? "" : "s"} · ${new URL(window.location.href).hostname}`;
    if (resume) resume.textContent = button;
    if (manualBrand instanceof HTMLInputElement && !manualBrand.value && !session?.route?.intermediary) manualBrand.value = session?.route?.name ?? "";
    if (manualUnderwriter instanceof HTMLInputElement && !manualUnderwriter.value) manualUnderwriter.value = session?.route?.underwriter ?? "";
  }

  function visibleControls(selector) {
    return [...document.querySelectorAll(selector)].filter((element) => !element.closest("#reachrate-copilot") && visible(element));
  }

  function checkboxText(checkbox) {
    return textOf(checkbox).toLowerCase();
  }

  function detectCheckpoint() {
    const body = (document.body?.innerText ?? "").toLowerCase();
    const title = document.title.toLowerCase();
    const captchaMarkers = [
      "verify you are human",
      "human verification",
      "are you a robot",
      "unusual traffic",
      "attention required",
      "security check"
    ];
    if (
      visibleControls("iframe[src*='captcha' i], iframe[title*='captcha' i], [class*='captcha' i], [id*='captcha' i]").length > 0 ||
      captchaMarkers.some((marker) => body.includes(marker) || title.includes(marker))
    ) {
      return {
        kind: "captcha_or_access_control",
        blocker: "Human verification or an access-control page is visible. Complete it yourself; ReachRate will not bypass it."
      };
    }

    const cardInput = visibleControls("input[autocomplete='cc-number'], input[name*='card' i]")[0];
    const purchaseAction = visibleControls("button, a").find((element) => {
      const label = (element.textContent ?? "").replace(/\s+/g, " ").trim();
      return /^(?:bind(?: policy)?|buy now|purchase(?: policy)?|pay now|make payment|continue to purchase|complete purchase)$/i.test(label);
    });
    const quoteResultContext = /your (?:auto insurance )?(?:quote|premium|rate)|quote summary|coverage summary|total premium|estimated (?:monthly|annual) premium/i.test(body) ||
      /\/(?:quote|summary|result|coverage|checkout|payment|bind)(?:\/|$)/i.test(window.location.pathname);
    if (cardInput || (purchaseAction && quoteResultContext)) {
      return {
        kind: "purchase_or_payment",
        blocker: "The journey reached purchase, bind or payment. ReachRate stops after the quote and will not buy a policy."
      };
    }

    const licence = visibleControls("input, select").find((element) =>
      /driver'?s? licen[cs]e (number|no|#)|licen[cs]e number/i.test(textOf(element))
    );
    if (licence) {
      return {
        kind: "licence_lookup",
        blocker: "A driver's licence number or official-record lookup is required. Enter and authorize it personally, then resume."
      };
    }

    const vin = visibleControls("input").find((element) => /\bvin\b|vehicle identification number/i.test(textOf(element)));
    if (vin && !session?.profile?.hasVin && (vin.required || session?.routeId === "sonnet")) {
      return {
        kind: "vin_required",
        blocker: "This page requires a VIN, but the reviewed profile is a planned vehicle with no VIN. ReachRate will not fabricate one."
      };
    }

    const address = visibleControls("input").find((element) => {
      const text = textOf(element);
      return /street address|home address|residential address|mailing address/i.test(text) && !/postal|zip/i.test(text);
    });
    if (address && (!session?.profile?.streetAddress || !session?.sensitiveAutofill?.address)) {
      return {
        kind: "full_address_required",
        blocker: session?.profile?.streetAddress
          ? "A complete street address is required. Approve one-route address autofill in ReachRate, or enter and select the official address suggestion yourself."
          : "A complete authorized street address is required. The test profile contains only a postal code, so ReachRate paused instead of inventing an address."
      };
    }

    const contactInputs = visibleControls("input").filter((element) => {
      const type = element.getAttribute("type")?.toLowerCase();
      return type === "email" || type === "tel" || /email|phone|mobile/i.test(textOf(element));
    });
    const contact = contactInputs[0];
    const missingContact = contactInputs.some((element) => !String(element.value ?? "").trim());
    const consentCheckbox = visibleControls("input[type='checkbox']").find((element) => {
      if (element.checked) return false;
      return /\b(i agree|agree to|consent|authorize|certify|declare|confirm|permission|privacy|terms|contact me|follow.?up|marketing|newsletter)\b/i.test(checkboxText(element));
    });
    const contactProfileReady = Boolean(session?.profile?.contactEmail && session?.profile?.contactPhone);
    const contactAutofillReady = contactProfileReady && session?.sensitiveAutofill?.contact;
    if (contact && missingContact && !contactAutofillReady) {
      return {
        kind: "contact_and_consent",
        blocker: contactProfileReady
          ? "Required contact fields are visible. Approve one-route contact autofill in ReachRate, or enter them yourself; any follow-up consent remains your manual choice."
          : "Contact details and consent to follow-up are required. Review and choose this yourself, then resume."
      };
    }
    if ((consentCheckbox && !(contact && missingContact && contactAutofillReady)) || (contact && !missingContact && /agree|consent|contact|follow.?up|marketing|newsletter/i.test(body))) {
      return {
        kind: contact ? "contact_consent_click" : "application_declaration",
        blocker: contact
          ? "Contact fields are ready, but the follow-up, disclosure or marketing consent is a separate manual decision. Read it and click it yourself, then resume."
          : "An application declaration, consent or confirmation checkbox is visible. Read and click it yourself, then resume."
      };
    }

    const avivaConfirmation = visibleControls("button, a").find((element) =>
      /yes,? that'?s correct/i.test(element.textContent ?? "")
    );
    if (avivaConfirmation && /double.?check|assumption|confirm/i.test(body)) {
      return {
        kind: "application_declaration",
        blocker: "The insurer is asking you to confirm its underwriting assumptions. Review them and click Yes, that's correct yourself, then resume."
      };
    }

    if (session?.routeId === "thepersonal" && /group|organization|employer|association|member/i.test(body)) {
      const groupControl = visibleControls("input, select, button").find((element) =>
        /group|organization|employer|association|member/i.test(textOf(element))
      );
      if (groupControl) {
        return {
          kind: "affinity_membership",
          blocker: "The Personal requires a real eligible group relationship. Select your own group before resuming."
        };
      }
    }

    return null;
  }

  function inputMappings(profile) {
    return [
      { field: "first_name", pattern: /first name|given name/i, value: profile.firstName },
      { field: "last_name", pattern: /last name|surname|family name/i, value: profile.lastName },
      { field: "postal_code", pattern: /postal code|zip code/i, value: profile.postalCode },
      { field: "street_address", pattern: /street address|home address|residential address|garaging address|parking address|where.*vehicle.*parked/i, value: profile.streetAddress },
      { field: "contact_email", pattern: /email/i, value: profile.contactEmail },
      { field: "contact_phone", pattern: /phone|mobile/i, value: profile.contactPhone },
      { field: "date_of_birth", pattern: /date of birth|birth date|dob/i, value: profile.dateOfBirth },
      { field: "vehicle_year", pattern: /vehicle year|car year|model year|year.*car.*manufactured|what.?s the year/i, value: profile.vehicleYear },
      { field: "first_licensed_year", pattern: /first licen[cs]ed.*year|year.*first licen[cs]ed/i, value: profile.firstLicensedYear },
      { field: "licence_origin", pattern: /province.*first licen[cs]ed|where.*first licen[cs]ed|original.*licen[cs].*(province|country|jurisdiction)/i, value: profile.licensingHistory === "transferred" ? profile.licenceOrigin : "" },
      { field: "ontario_licence_issue_date", pattern: /ontario.*licen[cs].*(issue|transfer|exchange|date)|(?:issue|transfer|exchange).*ontario.*licen[cs]/i, value: profile.licensingHistory === "transferred" ? profile.ontarioLicenceIssueDate : "" },
      { field: "g1_licence_date", pattern: /g1.*(date|since|obtained)|date.*g1/i, value: profile.licensingHistory === "ontario_graduated" ? profile.g1LicenceDate : "" },
      { field: "g2_licence_date", pattern: /g2.*(date|since|obtained)|date.*g2/i, value: profile.licensingHistory === "ontario_graduated" ? profile.g2LicenceDate : "" },
      { field: "g_licence_date", pattern: /(?:full )?g.*(date|since|obtained)|date.*(?:full )?g\b/i, value: profile.licensingHistory === "ontario_graduated" ? profile.gLicenceDate : "" },
      { field: "annual_kilometres", pattern: /annual.*(km|kilomet)|total.*(km|kilomet).*year|kilomet.*annually/i, value: profile.annualKilometres },
      { field: "commute_kilometres", pattern: /one.?way commute|commute.*(km|kilomet)|distance.*work|distance.*school/i, value: profile.commuteKilometres },
      { field: "policy_start_date", pattern: /policy start|effective date|coverage start/i, value: profile.policyStartDate }
    ];
  }

  function selectMappings(profile) {
    return [
      { field: "vehicle_year", pattern: /vehicle year|car year|model year|year.*car.*manufactured|what.?s the year/i, value: profile.vehicleYear },
      { field: "vehicle_make", pattern: /vehicle make|car make|manufacturer|make of your car|what.?s the make/i, value: profile.vehicleMake },
      { field: "vehicle_model", pattern: /vehicle model|car model|model of your car|what.?s the model|\bmodel\b/i, value: profile.vehicleModel },
      { field: "licence_class", pattern: /licen[cs]e class|type of licen[cs]e|current licen[cs]e/i, value: profile.licenceClass },
      { field: "gender", pattern: /gender|sex/i, value: profile.gender },
      { field: "marital_status", pattern: /marital status/i, value: profile.maritalStatus.replace("_", " ") },
      { field: "employment_status", pattern: /employment status|occupation status/i, value: profile.employmentStatus },
      { field: "annual_kilometres", pattern: /annual.*(km|kilomet)|kilomet.*year/i, value: profile.annualKilometres },
      { field: "commute_kilometres", pattern: /commute.*(km|kilomet)|distance.*work|distance.*school/i, value: profile.commuteKilometres },
      { field: "overnight_parking", pattern: /park.*overnight|keep.*overnight/i, value: "private garage" }
    ];
  }

  function fillInputs(profile) {
    let changed = 0;
    for (const input of visibleControls("input:not([type='hidden']):not([type='checkbox']):not([type='radio']), textarea")) {
      if (input.disabled || input.readOnly || String(input.value ?? "").trim()) continue;
      const descriptor = textOf(input);
      const isAddress = /street address|home address|residential address|garaging address|parking address|where.*vehicle.*parked/i.test(descriptor);
      const isContact = /email|phone|mobile/i.test(descriptor);
      if (/licen[cs]e number|\bvin\b|payment|card/i.test(descriptor)) continue;
      if (isAddress && !session?.sensitiveAutofill?.address) continue;
      if (isContact && !session?.sensitiveAutofill?.contact) continue;
      const mapping = inputMappings(profile).find((item) => item.value && item.pattern.test(descriptor));
      if (!mapping) continue;
      setInputValue(input, mapping.value);
      mark(mapping.field);
      if (isAddress) sensitiveReviewPending = true;
      changed += 1;
    }
    return changed;
  }

  function selectBestOption(select, desired) {
    const desiredValue = normalize(desired);
    const options = [...select.options].filter((option) => !option.disabled);
    return options.find((option) => normalize(option.textContent) === desiredValue) ??
      options.find((option) => normalize(option.textContent).includes(desiredValue)) ??
      options.find((option) => desiredValue.includes(normalize(option.textContent)));
  }

  function fillSelects(profile) {
    let changed = 0;
    for (const select of visibleControls("select")) {
      if (select.disabled) continue;
      const descriptor = textOf(select);
      const mapping = selectMappings(profile).find((item) => item.pattern.test(descriptor));
      if (!mapping) continue;
      const option = selectBestOption(select, mapping.value);
      if (!option || select.value === option.value) continue;
      select.value = option.value;
      dispatchValueEvents(select);
      mark(mapping.field);
      changed += 1;
    }
    return changed;
  }

  function answerMappings(profile) {
    return [
      { field: "vehicle_condition", question: /new or used|vehicle condition|car condition|condition of your car/i, answer: profile.vehicleCondition === "new" ? /^new$/i : /^used$/i },
      { field: "vehicle_ownership", question: /owned.*financ.*leased|own.*lease|vehicle.*financ/i, answer: profile.vehicleOwnership === "financed" ? /financ/i : profile.vehicleOwnership === "leased" ? /leas/i : /^owned|^own$/i },
      { field: "winter_tires", question: /winter tire/i, answer: profile.winterTires ? /^yes$/i : /^no$/i },
      { field: "primary_use", question: /mainly use|primary use|use.*vehicle|use.*car/i, answer: profile.primaryUse === "business" ? /business/i : /personal|pleasure/i },
      { field: "overnight_parking", question: /park.*overnight|keep.*overnight/i, answer: /private garage|garage/i },
      { field: "collision_coverage", question: /collision coverage/i, answer: profile.collisionCoverage ? /^yes|include/i : /^no|decline/i },
      { field: "comprehensive_coverage", question: /comprehensive coverage/i, answer: profile.comprehensiveCoverage ? /^yes|include/i : /^no|decline/i },
      { field: "claims_history", question: /claims?.*(past|last)|accidents?.*(past|last)/i, answer: profile.claimsLastSixYears === "0" ? /^no|none|0$/i : null },
      { field: "convictions_history", question: /conviction|ticket/i, answer: profile.convictionsLastThreeYears === "0" ? /^no|none|0$/i : null },
      { field: "suspensions_history", question: /suspension/i, answer: profile.suspensionsLastSixYears === "0" ? /^no|none|0$/i : null },
      { field: "telematics", question: /telematics|driving app|usage.?based/i, answer: profile.telematics ? /^yes|enrol/i : /^no|decline/i }
    ];
  }

  function clickQuestionChoices(profile) {
    let changed = 0;
    const groups = visibleControls("fieldset, [role='radiogroup'], [data-testid*='question' i], [class*='question' i], [class*='form-group' i]")
      .filter((group) => (group.textContent ?? "").length < 900);
    for (const group of groups) {
      const text = (group.textContent ?? "").replace(/\s+/g, " ").trim();
      const mapping = answerMappings(profile).find((item) => item.answer && item.question.test(text));
      if (!mapping || /agree|consent|confirm|certif|declar|privacy|terms/i.test(text)) continue;
      const candidates = [...group.querySelectorAll("button, [role='radio'], input[type='radio'], label")].filter(visible);
      const candidate = candidates.find((element) => mapping.answer.test((element.textContent ?? textOf(element)).trim()));
      if (!candidate) continue;
      const control = candidate instanceof HTMLLabelElement && candidate.htmlFor
        ? document.getElementById(candidate.htmlFor)
        : candidate;
      if (!(control instanceof HTMLElement)) continue;
      if (control.getAttribute("aria-checked") === "true" || control.getAttribute("aria-pressed") === "true" || control.matches(":checked")) continue;
      control.click();
      mark(mapping.field);
      changed += 1;
    }
    return changed;
  }

  function requiredMissing() {
    return visibleControls("input[required], select[required], textarea[required]").filter((element) => {
      const descriptor = textOf(element);
      if (/email|phone|mobile|licen[cs]e number|\bvin\b|street address|home address/i.test(descriptor)) return false;
      if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) return !element.checked;
      return !String(element.value ?? "").trim();
    });
  }

  function dismissNecessaryCookies() {
    const controls = visibleControls("button, a");
    const safer = controls.find((element) =>
      /reject all|necessary only|essential only|decline optional|save settings/i.test((element.textContent ?? "").trim())
    );
    if (safer) {
      safer.click();
      return true;
    }
    return false;
  }

  function findSafeAdvance() {
    // Some insurer journeys render ordinary navigation controls as anchors
    // without href (for example Allstate's postal-code `Go` control). Keep the
    // text allowlist strict, but include those visible button-like elements.
    const controls = visibleControls("button, a, [role='button'], input[type='submit'], input[type='image']");
    return controls.find((element) => {
      if (element.disabled || element.getAttribute("aria-disabled") === "true") return false;
      const text = [
        element.textContent,
        element instanceof HTMLInputElement ? element.value : "",
        textOf(element)
      ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      if (!/^(next|continue|save and continue|get started|start quote|start my quote|get (a |my )?quote|compare rates|compare rates now|begin quote|add vehicle|go)(\b|\s|$)/i.test(text)) return false;
      if (/agree|consent|confirm|correct|buy|purchase|bind|payment|submit application|accept/i.test(text)) return false;
      const nearby = element.closest("form, section, article, [role='dialog']")?.textContent ?? "";
      if (/by (clicking|selecting).{0,120}(agree|consent|authorize)|i (agree|consent|certify|declare)/i.test(nearby)) return false;
      const key = `${window.location.href}|${normalize(text)}|${completedFields.size}`;
      if (clickedAdvances.has(key)) return false;
      element.dataset.reachrateAdvanceKey = key;
      return true;
    });
  }

  function parseAmount(value) {
    const parsed = Number(String(value).replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function focusReachRate() {
    window.setTimeout(() => chrome.runtime.sendMessage({ type: "REACHRATE_FOCUS_APP" }), 250);
  }

  function submitManualCandidate(event) {
    event.preventDefault();
    if (!session) return;
    const root = ensureOverlay();
    const brandInput = root.querySelector(".rr-manual-brand");
    const underwriterInput = root.querySelector(".rr-manual-underwriter");
    const premiumInput = root.querySelector(".rr-manual-premium");
    const periodInput = root.querySelector(".rr-manual-period");
    const sourceBrand = brandInput instanceof HTMLInputElement ? brandInput.value.trim() : "";
    const legalUnderwriter = underwriterInput instanceof HTMLInputElement ? underwriterInput.value.trim() : "";
    const premiumAmount = premiumInput instanceof HTMLInputElement ? parseAmount(premiumInput.value) : null;
    const premiumPeriod = periodInput instanceof HTMLSelectElement && periodInput.value === "annual" ? "annual" : "monthly";
    const amountIsPlausible = premiumAmount != null && premiumAmount > 0 && (
      (premiumPeriod === "monthly" && premiumAmount <= 2500) ||
      (premiumPeriod === "annual" && premiumAmount <= 30000)
    );
    if (!sourceBrand || !amountIsPlausible) {
      updateOverlay({
        status: "Check manual result",
        title: "Enter a visible company and premium",
        detail: "The amount must be a positive monthly or annual premium copied from this official result page.",
        tone: "warning",
        button: "Resume after review"
      });
      return;
    }
    const resolvedUnderwriter = legalUnderwriter || session.route.underwriter || "";
    const returnedCarrierRequired = Boolean(session.route.intermediary) || !session.route.underwriter;
    const entryNames = [session.route.name, session.route.intermediary]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    if (!resolvedUnderwriter || (returnedCarrierRequired && entryNames.includes(resolvedUnderwriter.toLowerCase()))) {
      updateOverlay({
        status: "Returned insurer required",
        title: "Identify the company underwriting this price",
        detail: `${session.route.name} is the quote entrance, not necessarily the insurer. Copy the returned insurer / legal underwriter shown with the premium before sending it to ReachRate.`,
        tone: "warning",
        button: "Resume after review"
      });
      return;
    }

    const candidate = {
      premiumAmount,
      premiumPeriod,
      sourceBrand,
      legalUnderwriter: resolvedUnderwriter,
      intermediary: session.route.intermediary ?? null,
      resultType: session.route.resultType,
      reference: "",
      sourceUrl: window.location.href,
      evidence: `User manually entered a ${premiumPeriod} premium visible on the official ${session.route.name} page at ${new Date().toISOString()}. ReachRate added it to the matching route card and preserved the source page.`,
      manualEntry: true
    };
    paused = true;
    running = false;
    updateOverlay({
      status: "Candidate sent",
      title: `$${premiumAmount.toFixed(2)} ${premiumPeriod}`,
      detail: "ReachRate is adding this candidate to the matching route card and preserving the official source page.",
      tone: "success",
      button: "Scan result again"
    });
    sendEvent("price_candidate", `A manually entered ${premiumPeriod} premium candidate was sent from ${session.route.name}.`, { candidate });
    focusReachRate();
  }

  function extractPriceCandidate() {
    const body = (document.body?.innerText ?? "").replace(/\s+/g, " ");
    const focusedElements = visibleControls("[class*='premium' i], [id*='premium' i], [data-testid*='premium' i], [class*='price' i], [aria-label*='premium' i]");
    const focusedText = focusedElements
      .map((element) => element.textContent ?? "")
      .join(" ");
    const resultMarker = /your (?:auto insurance )?(?:quote|premium|rate)|quote summary|estimated (?:monthly|annual) premium|total premium/i.test(body);
    if (!resultMarker && focusedText.trim().length === 0) return null;
    const source = `${focusedText} ${body}`;
    const monthlyPatterns = [
      /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/\s*(?:mo|month)|per month|monthly)/i,
      /(?:monthly premium|premium per month|monthly rate)[^$]{0,80}\$\s*([\d,]+(?:\.\d{1,2})?)/i
    ];
    const annualPatterns = [
      /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/\s*(?:yr|year)|per year|annually|annual)/i,
      /(?:annual premium|premium per year|annual rate)[^$]{0,80}\$\s*([\d,]+(?:\.\d{1,2})?)/i
    ];

    let premiumPeriod = "monthly";
    let match = monthlyPatterns.map((pattern) => source.match(pattern)).find(Boolean);
    if (!match) {
      premiumPeriod = "annual";
      match = annualPatterns.map((pattern) => source.match(pattern)).find(Boolean);
    }
    const premiumAmount = match ? parseAmount(match[1]) : null;
    if (
      premiumAmount == null ||
      (premiumPeriod === "monthly" && (premiumAmount < 20 || premiumAmount > 2500)) ||
      (premiumPeriod === "annual" && (premiumAmount < 250 || premiumAmount > 30000))
    ) return null;

    const matchingPriceElement = focusedElements.find((element) => {
      const text = (element.textContent ?? "").replace(/\s+/g, " ");
      return monthlyPatterns.some((pattern) => pattern.test(text)) || annualPatterns.some((pattern) => pattern.test(text));
    });
    const resultContainer = matchingPriceElement?.closest(
      "article, li, section, [role='listitem'], [class*='card' i], [class*='quote' i], [class*='result' i], [class*='offer' i]"
    );
    const resultContext = (resultContainer?.textContent ?? body).replace(/\s+/g, " ").trim();
    const referenceMatch = resultContext.match(/(?:quote|reference|confirmation)\s*(?:number|no\.?|#|id)?\s*[:#-]?\s*([A-Z0-9-]{6,30})/i) ??
      body.match(/(?:quote|reference|confirmation)\s*(?:number|no\.?|#|id)?\s*[:#-]?\s*([A-Z0-9-]{6,30})/i);
    const underwriterMatch = resultContext.match(/underwritten by\s+([^.;|]{4,120})/i) ??
      body.match(/underwritten by\s+([^.;|]{4,120})/i);
    const labelledCompanyMatch = resultContext.match(/(?:insurance company|insurer|carrier|provider|quoted by|quote from)\s*[:\-]?\s*([A-Z][A-Za-z0-9&.'’() -]{2,80})/i);
    const imageBrand = resultContainer
      ? [...resultContainer.querySelectorAll("img[alt]")]
          .map((image) => (image.getAttribute("alt") ?? "").replace(/\s+logo$/i, "").trim())
          .find((value) => value.length >= 3 && value.length <= 80 && !/^(logo|company|provider|insurer)$/i.test(value))
      : "";
    const headingBrand = resultContainer
      ? [...resultContainer.querySelectorAll("h1, h2, h3, h4, [class*='brand' i], [class*='carrier' i], [class*='provider' i], [class*='insurer' i]")]
          .map((element) => (element.textContent ?? "").replace(/\s+/g, " ").trim())
          .find((value) => value.length >= 3 && value.length <= 80 && !/^(your quote|quote|premium|monthly|annual|best rate|view details)$/i.test(value))
      : "";
    const detectedCompany = labelledCompanyMatch?.[1]?.trim() || imageBrand || headingBrand || "";
    const detectedUnderwriter = underwriterMatch?.[1]?.trim() ?? "";
    const sourceBrand = session.route.intermediary
      ? (detectedCompany || detectedUnderwriter)
      : session.route.name;
    const legalUnderwriter = session.route.underwriter ?? (detectedUnderwriter || (labelledCompanyMatch ? detectedCompany : ""));
    return {
      premiumAmount,
      premiumPeriod,
      sourceBrand,
      legalUnderwriter,
      intermediary: session.route.intermediary ?? null,
      resultType: session.route.resultType,
      reference: referenceMatch?.[1] ?? "",
      sourceUrl: window.location.href,
      evidence: `ReachRate extension detected ${premiumPeriod} premium text${sourceBrand ? ` for ${sourceBrand}` : ""} on the official ${session.route.name} result page at ${new Date().toISOString()}. User review is required before persistence.`
    };
  }

  function pauseAtCheckpoint(checkpoint) {
    paused = true;
    running = false;
    updateOverlay({
      status: "Action required",
      title: "Agent paused — your click is required",
      detail: checkpoint.blocker,
      tone: checkpoint.kind === "vin_required" ? "danger" : "warning",
      button: "Resume after my click"
    });
    sendEvent(
      checkpoint.kind === "captcha_or_access_control" ? "access_blocked" : "waiting_human",
      checkpoint.blocker,
      { blocker: checkpoint.blocker, checkpointKind: checkpoint.kind }
    );
  }

  async function runAutomation() {
    if (!session || running) return;
    running = true;
    paused = false;
    stablePasses = 0;
    updateOverlay({
      status: "Agent running",
      title: "Mapping the reviewed profile",
      detail: "The extension is operating this visible page and will stop before any declaration, identity lookup, CAPTCHA, contact consent or purchase.",
      tone: "active",
      button: "Run again"
    });
    sendEvent("filling", `ReachRate extension started safe field mapping on ${session.route.name}.`);

    for (let attempt = 0; attempt < 24 && !paused; attempt += 1) {
      await wait(attempt === 0 ? 300 : 900);
      dismissNecessaryCookies();

      const before = detectCheckpoint();
      if (before) {
        pauseAtCheckpoint(before);
        return;
      }

      const changed =
        fillInputs(session.profile) +
        fillSelects(session.profile) +
        clickQuestionChoices(session.profile);
      updateOverlay({
        status: "Agent running",
        title: changed > 0 ? "Profile fields mapped" : "Checking the next safe action",
        detail: `${completedFields.size} approved fields are mapped. Licence number, VIN, consent and declarations are never supplied; address/contact are injected only after one-route approval.`,
        tone: "active",
        button: "Run again"
      });
      sendEvent("filling", `${completedFields.size} approved fields mapped on the visible ${session.route.name} journey.`);

      if (sensitiveReviewPending) {
        sensitiveReviewPending = false;
        pauseAtCheckpoint({
          kind: "full_address_review",
          blocker: "The approved street address was prefilled for this route. Review it and select any official address suggestion yourself, then resume."
        });
        return;
      }

      const candidate = extractPriceCandidate();
      if (candidate) {
        paused = true;
        running = false;
        updateOverlay({
          status: "Price detected",
          title: `$${candidate.premiumAmount.toFixed(2)} ${candidate.premiumPeriod}`,
          detail: "This is a candidate extracted from the official page. Open ReachRate to review the underwriter, coverage and reference before saving it.",
          tone: "success",
          button: "Scan result again"
        });
        sendEvent("price_candidate", `A ${candidate.premiumPeriod} premium candidate was detected on ${session.route.name}.`, { candidate });
        focusReachRate();
        return;
      }

      const after = detectCheckpoint();
      if (after) {
        pauseAtCheckpoint(after);
        return;
      }

      const missing = requiredMissing();
      if (missing.length > 0) {
        stablePasses += 1;
      } else {
        const advance = findSafeAdvance();
        if (advance) {
          const key = advance.dataset.reachrateAdvanceKey;
          if (key) clickedAdvances.add(key);
          advance.click();
          stablePasses = 0;
          await wait(900);
          continue;
        }
        stablePasses += 1;
      }

      if (changed === 0 && stablePasses >= 3) {
        running = false;
        paused = true;
        const blocker = missing.length > 0
          ? "The current page still has required controls that are not safely mapped. Review the visible fields, complete only authorized information, then resume."
          : "The page has no additional safe control the generic adapter can identify. Review the visible journey, then resume or record its exact blocker.";
        updateOverlay({
          status: "Review needed",
          title: "Agent stopped at an unmapped control",
          detail: blocker,
          tone: "warning",
          button: "Resume after review"
        });
        sendEvent("manual_handoff", blocker, { blocker });
        return;
      }
    }

    running = false;
    if (!paused) {
      const blocker = "The supervised route reached its bounded attempt limit without a price or recognized checkpoint.";
      updateOverlay({ status: "Bounded stop", title: "Route needs review", detail: blocker, tone: "warning", button: "Run another pass" });
      sendEvent("manual_handoff", blocker, { blocker });
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!["REACHRATE_RESUME", "REACHRATE_AUTOFILL"].includes(message?.type)) return;
    session.sensitiveAutofill = {
      address: message.sensitiveAutofill?.address === true,
      contact: message.sensitiveAutofill?.contact === true
    };
    paused = false;
    void runAutomation();
  });

  function requestSession(attempt = 0) {
    chrome.runtime.sendMessage({ type: "REACHRATE_GET_SESSION" }, (response) => {
      if (!chrome.runtime.lastError && response?.ok && response.session) {
        session = response.session;
        ensureOverlay();
        updateOverlay({
          status: "Connected",
          title: "Official route ready",
          detail: `Connected to the ${session.route.name} tab for this ReachRate run. Open ReachRate Quote Copilot and click Autofill when you are ready.`,
          tone: "active",
          button: "Run safe fill"
        });
        sendEvent("filling", `${session.route.name} is connected and ready for supervised Autofill.`);
        return;
      }
      if (attempt < 12) window.setTimeout(() => requestSession(attempt + 1), 250);
    });
  }

  requestSession();
})();
