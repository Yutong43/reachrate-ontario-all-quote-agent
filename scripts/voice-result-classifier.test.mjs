import assert from "node:assert/strict";
import test from "node:test";
import {
  classifySyntheticVoiceResult,
  extractSpokenPremium,
  mapStoredSyntheticOutcomeToUiStatus,
} from "../lib/voice-result-classifier.ts";

test("captures 200 per month after consent", () => {
  assert.deepEqual(classifySyntheticVoiceResult(["Hello", "Yes", "It is 200 per month"], true), {
    kind: "success",
    consentConfirmed: true,
    premium: { amount: 200, period: "monthly" },
  });
});

test("normalizes 220 pounds per month to a numeric synthetic CAD amount", () => {
  assert.deepEqual(classifySyntheticVoiceResult(["Yes, go ahead", "220 pounds per month"], true), {
    kind: "success",
    consentConfirmed: true,
    premium: { amount: 220, period: "monthly" },
  });
});

test("captures number words", () => {
  assert.deepEqual(extractSpokenPremium(["two hundred twenty monthly"]), {
    amount: 220,
    period: "monthly",
  });
});

test("does not confuse a vehicle year with the premium", () => {
  assert.deepEqual(extractSpokenPremium(["The premium is 220 per month for my 2025 Toyota"]), {
    amount: 220,
    period: "monthly",
  });
});

test("explicit AI refusal is rejected and saves no price", () => {
  assert.deepEqual(classifySyntheticVoiceResult(["No, I want to talk to a real person"], true), {
    kind: "rejected",
    consentConfirmed: false,
    premium: null,
  });
});

test("hangup or terminal call without a decision is no answer", () => {
  assert.deepEqual(classifySyntheticVoiceResult(["Hello"], true), {
    kind: "no_answer",
    consentConfirmed: false,
    premium: null,
  });
});

test("a later rejection overrides an earlier spoken number", () => {
  assert.deepEqual(classifySyntheticVoiceResult(["Yes", "It is 200 per month", "No, get me a human"], true), {
    kind: "rejected",
    consentConfirmed: false,
    premium: null,
  });
});

test("maps persisted outcomes to three distinct UI states", () => {
  assert.equal(mapStoredSyntheticOutcomeToUiStatus(220, "manual_handoff"), "demo_complete");
  assert.equal(mapStoredSyntheticOutcomeToUiStatus(null, "manual_handoff"), "rejected");
  assert.equal(mapStoredSyntheticOutcomeToUiStatus(null, "unreachable"), "unreachable");
});
