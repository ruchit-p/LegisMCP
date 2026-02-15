/**
 * Dynamically compute the current Congress number.
 * A new Congress starts January 3 of each odd year.
 */
export function getCurrentCongress(): number {
  const now = new Date();
  let year = now.getFullYear();
  // Before Jan 3 of an odd year, the previous Congress is still in session
  if (now.getMonth() === 0 && now.getDate() < 3) {
    year -= 1;
  }
  return Math.floor((year - 1789) / 2) + 1;
}
