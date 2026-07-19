/** Escape untrusted text before placing it in Markdown prose or a table cell. */
export function escapeMarkdownText(value: string): string {
  return value
    .replace(/\r?\n/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]<>#|])/g, "\\$1");
}

/** Render untrusted text as an inline code span, including names containing backticks. */
export function markdownCode(value: string): string {
  const text = value.replace(/\r?\n/g, " ").replace(/\|/g, "&#124;");
  const longestRun = Math.max(0, ...[...text.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = "`".repeat(longestRun + 1);
  return longestRun === 0 ? `${fence}${text}${fence}` : `${fence} ${text} ${fence}`;
}
