/**
 * Utility functions for processing HTML content from Congress.gov API responses.
 * CRS bill summaries are returned with HTML markup inside CDATA sections.
 */

/**
 * Strip HTML tags and CDATA wrappers from a string, returning plain text.
 * Handles common HTML entities and collapses whitespace.
 * @param html - Raw HTML/CDATA string from the API
 * @returns Plain text with HTML removed
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  let text = html;

  // Remove CDATA wrappers if present
  text = text.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');

  // Replace block-level tags with newlines for readability
  text = text.replace(/<\/(p|div|li|br|h[1-6])>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)));

  // Collapse multiple whitespace/newlines into single spaces, trim
  text = text.replace(/\n\s*\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

  return text;
}

/**
 * Truncate text to a maximum length, appending an ellipsis if truncated.
 * Truncates at the nearest word boundary before maxLength.
 * @param text - Input text
 * @param maxLength - Maximum character length (default 500)
 * @returns Truncated text with "..." if needed
 */
export function truncateText(text: string, maxLength: number = 500): string {
  if (!text || text.length <= maxLength) return text;

  // Find the last space before maxLength to avoid cutting mid-word
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const cutPoint = lastSpace > maxLength * 0.8 ? lastSpace : maxLength;

  return truncated.slice(0, cutPoint) + '...';
}
