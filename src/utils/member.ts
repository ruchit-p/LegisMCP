export interface MemberDisplayFields {
  name: string;
  party: string;
  state: string;
  chamber: string;
  district?: number;
}

/** Extract display fields from a member object (works with both list and detail API formats) */
export function getMemberDisplayFields(member: any): MemberDisplayFields {
  // Name: detail endpoint has directOrderName, list has "Last, First" in name
  const name = member.directOrderName
    || member.invertedOrderName
    || (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : null)
    || member.name
    || 'Unknown';

  // Party: detail endpoint has partyHistory, list has partyName
  const party = member.partyHistory?.[0]?.partyName
    || member.partyName
    || member.party
    || 'Unknown';

  // State: both endpoints have state (detail uses full name like "California")
  const state = member.state || 'Unknown';

  // Chamber: detail endpoint has terms as array, list has terms.item
  const termsArray = Array.isArray(member.terms) ? member.terms : member.terms?.item;
  const latestTerm = termsArray?.[termsArray.length - 1];
  const chamber = latestTerm?.chamber || member.chamber || 'Unknown';

  return { name, party, state, chamber, district: member.district || latestTerm?.district };
}

/** Generate a one-line summary like "Nancy Pelosi (Democratic-California) - Representative" */
export function getMemberSummary(member: any): string {
  const { name, party, state, chamber, district } = getMemberDisplayFields(member);
  let summary = `${name} (${party}-${state})`;
  const chamberLower = chamber.toLowerCase();
  if (chamberLower.includes('house') && district) {
    summary += ` - House District ${district}`;
  } else if (chamberLower.includes('senate')) {
    summary += ` - Senator`;
  }
  return summary;
}
