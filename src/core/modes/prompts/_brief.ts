export function renderBriefBlock(brief: string): string {
  const trimmed = brief.trim();
  if (trimmed.length === 0) return "";
  return [
    "## Writer's brief",
    "Read this. It frames what the writer is doing, who reads it, and what the constraints are. Do not parrot it back. Use it to calibrate what counts as on-target.",
    "",
    trimmed,
    "",
  ].join("\n");
}

export function renderPactDirective(pact: string): string {
  const trimmed = pact.trim();
  if (trimmed.length === 0) return "";
  return [
    "## Active pact",
    `The writer has set ONE rule for this draft: "${trimmed}".`,
    'Flag ONLY violations of this pact. Ignore everything else, even if it would normally be worth a note. Stay surgical. If the sentence does not violate the pact, return {"issues": []}.',
    "",
  ].join("\n");
}
