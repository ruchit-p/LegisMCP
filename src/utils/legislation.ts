/**
 * Shared utilities for legislation analysis — enacted-law detection,
 * vote annotation, and recorded-vote extraction.
 */

const ENACTED_PATTERNS = [
  /became public law/i,
  /signed by president/i,
  /became private law/i,
];

const VOTE_PATTERNS = [
  /roll no\.\s*\d+/i,
  /passed.*yeas.*nays/i,
  /agreed to.*yeas.*nays/i,
  /passed.*voice vote/i,
  /agreed to.*voice vote/i,
  /passed.*unanimous consent/i,
  /cloture.*invoked/i,
  /motion to reconsider/i,
];

/**
 * Check whether a bill's latestAction indicates it was enacted into law.
 */
export function isEnactedBill(bill: any): boolean {
  const text = bill?.latestAction?.text;
  if (!text) return false;
  return ENACTED_PATTERNS.some((p) => p.test(text));
}

/**
 * Extract a public law number (e.g. "118-123") from action text.
 * Returns null when no law number is found.
 */
export function extractLawNumber(actionText: string): string | null {
  if (!actionText) return null;
  const m = actionText.match(/(?:Public|Private) Law (\d+-\d+)/i);
  return m ? m[1] : null;
}

/**
 * Return true when the action text contains vote-related language.
 */
export function hasVoteIndicator(actionText: string): boolean {
  if (!actionText) return false;
  return VOTE_PATTERNS.some((p) => p.test(actionText));
}

/**
 * Return a short vote annotation string for list views (zero API calls).
 * Example: "[Vote: Roll no. 123]"
 */
export function getVoteAnnotation(actionText: string): string | null {
  if (!actionText) return null;
  const roll = actionText.match(/Roll no\.\s*\d+/i);
  if (roll) return `[Vote: ${roll[0]}]`;
  if (/passed.*voice vote/i.test(actionText)) return '[Vote: Voice vote]';
  if (/agreed to.*voice vote/i.test(actionText)) return '[Vote: Voice vote]';
  if (/passed.*unanimous consent/i.test(actionText)) return '[Vote: Unanimous consent]';
  if (/cloture.*invoked/i.test(actionText)) return '[Vote: Cloture invoked]';
  return null;
}

/**
 * Extract the `recordedVotes` array from a single action object.
 * Returns an empty array when none are present.
 */
export function extractRecordedVotes(action: any): any[] {
  return action?.recordedVotes ?? [];
}

/**
 * Scan all actions and collect every recorded vote reference.
 * Each entry includes the parent action's date and text for context.
 */
export function findVotesInActions(actions: any[]): any[] {
  if (!actions || !Array.isArray(actions)) return [];

  const seen = new Set<string>();
  const votes: any[] = [];
  for (const action of actions) {
    const recorded = extractRecordedVotes(action);
    for (const vote of recorded) {
      // Deduplicate by chamber + roll number + date (API often has duplicate entries)
      const key = `${vote.chamber}-${vote.rollNumber}-${vote.date}`;
      if (seen.has(key)) continue;
      seen.add(key);

      votes.push({
        chamber: vote.chamber || null,
        congress: vote.congress || null,
        date: vote.date || action.actionDate || null,
        rollNumber: vote.rollNumber || null,
        sessionNumber: vote.sessionNumber || null,
        url: vote.url || null,
        actionText: action.text || null,
        actionDate: action.actionDate || null,
      });
    }
  }
  return votes;
}
