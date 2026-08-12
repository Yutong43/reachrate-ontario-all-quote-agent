export type SpokenPremium = {
  amount: number;
  period: "monthly" | "annual";
};

export type SyntheticVoiceResult =
  | { kind: "success"; consentConfirmed: true; premium: SpokenPremium }
  | { kind: "rejected"; consentConfirmed: false; premium: null }
  | { kind: "no_answer"; consentConfirmed: false; premium: null };

const affirmativePattern = /(?:^|\b)(?:yes|yeah|yep|sure|okay|ok|i agree|you may|go ahead|please continue)(?:\b|$)/i;
const humanPattern = /\b(?:real person|real human|human|human agent|real agent|representative|licensed broker|talk to (?:a )?person|speak to (?:a )?person)\b/i;
const declinePattern = /(?:^|\b)(?:no|nope|do not|don't|stop|not interested)(?:\b|$)/i;

export function hasAffirmativeConsent(messages: string[]) {
  return messages.some((message) => affirmativePattern.test(message));
}

export function asksForHuman(messages: string[]) {
  return messages.some((message) => humanPattern.test(message));
}

export function explicitlyDeclines(messages: string[]) {
  return messages.some((message) => declinePattern.test(message));
}

const smallNumbers: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

function numericCandidateScore(message: string, start: number, end: number, amount: number) {
  const prefix = message.slice(Math.max(0, start - 28), start);
  const suffix = message.slice(end, Math.min(message.length, end + 32));
  const context = `${prefix} ${suffix}`;
  let score = 0;
  if (/^\s*(?:cad|canadian dollars?|dollars?|bucks?|pounds?|per\s+(?:month|year)|monthly|annually|\/\s*(?:mo|yr))/i.test(suffix)) score += 8;
  if (/(?:C?\$|cad|premium|quote|price)\s*$/i.test(prefix)) score += 6;
  if (/(?:C?\$|cad|canadian dollars?|dollars?|bucks?|pounds?|premium|quote|price|per\s+(?:month|year)|monthly|annually)/i.test(context)) score += 2;
  if (amount >= 1900 && amount <= 2099 && /(?:year|model|vehicle|car|toyota|honda|hyundai)/i.test(context)) score -= 8;
  return score;
}

export function parseSpokenNumber(message: string) {
  const numericCandidates = [...message.matchAll(/(?<![A-Za-z0-9])(?:C?\$\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?![A-Za-z0-9])/gi)]
    .map((match) => {
      const amount = Number(match[1].replaceAll(",", ""));
      const start = match.index ?? 0;
      return { amount, start, score: numericCandidateScore(message, start, start + match[0].length, amount) };
    })
    .filter(({ amount }) => Number.isFinite(amount) && amount >= 20 && amount <= 100_000)
    .sort((left, right) => right.score - left.score || right.start - left.start);
  if (numericCandidates.length > 0) return numericCandidates[0]?.amount ?? null;

  const tokens = message.toLowerCase().replaceAll("-", " ").match(/[a-z]+/g) ?? [];
  let total = 0;
  let current = 0;
  let usedNumberWord = false;
  for (const token of tokens) {
    if (token in smallNumbers) {
      current += smallNumbers[token];
      usedNumberWord = true;
    } else if (token === "hundred" && usedNumberWord) {
      current = Math.max(1, current) * 100;
    } else if (token === "thousand" && usedNumberWord) {
      total += Math.max(1, current) * 1_000;
      current = 0;
    } else if (token !== "and" && usedNumberWord) {
      break;
    }
  }
  const amount = total + current;
  return usedNumberWord && amount >= 20 && amount <= 100_000 ? amount : null;
}

function premiumWithMessageIndex(messages: string[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] ?? "";
    const hasPriceCue = /(?:C?\$|CAD|Canadian dollars?|dollars?|bucks?|pounds?|premium|quote|price|per\s+(?:month|year)|monthly|annually|\/\s*(?:mo|yr))/i.test(message);
    const amount = parseSpokenNumber(message);
    if (amount == null || (!hasPriceCue && !/^\s*(?:C?\$\s*)?\d+(?:\.\d{1,2})?\s*$/i.test(message))) continue;
    const annual = /(?:per\s+year|annual|annually|\/\s*yr|a\s+year)/i.test(message);
    return { amount, period: annual ? "annual" as const : "monthly" as const, messageIndex: index };
  }
  return null;
}

export function extractSpokenPremium(messages: string[]): SpokenPremium | null {
  const result = premiumWithMessageIndex(messages);
  return result ? { amount: result.amount, period: result.period } : null;
}

function lastMatchingIndex(messages: string[], pattern: RegExp) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (pattern.test(messages[index] ?? "")) return index;
  }
  return -1;
}

export function classifySyntheticVoiceResult(messages: string[], acceptsSpokenPrice: boolean): SyntheticVoiceResult {
  const consentIndex = lastMatchingIndex(messages, affirmativePattern);
  const rejectionIndex = Math.max(lastMatchingIndex(messages, humanPattern), lastMatchingIndex(messages, declinePattern));
  const premium = acceptsSpokenPrice ? premiumWithMessageIndex(messages) : null;

  // The latest explicit decision wins. A later “no” or request for a person
  // never becomes a price result even if a number appeared earlier.
  if (rejectionIndex >= 0 && rejectionIndex >= consentIndex) {
    return { kind: "rejected", consentConfirmed: false, premium: null };
  }
  if (consentIndex >= 0 && premium && premium.messageIndex >= consentIndex) {
    return {
      kind: "success",
      consentConfirmed: true,
      premium: { amount: premium.amount, period: premium.period },
    };
  }
  return { kind: "no_answer", consentConfirmed: false, premium: null };
}

export type SyntheticUiStatus = "demo_complete" | "rejected" | "unreachable";

export function mapStoredSyntheticOutcomeToUiStatus(premiumAmount: number | null, outcomeStatus: string): SyntheticUiStatus {
  if (premiumAmount != null) return "demo_complete";
  if (outcomeStatus === "manual_handoff") return "rejected";
  return "unreachable";
}
