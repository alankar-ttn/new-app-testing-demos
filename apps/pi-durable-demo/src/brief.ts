export type ChangelogScan = {
  version: string
  bullets: string[]
}

export function parseChangelog(text: string): ChangelogScan {
  const versionMatch = text.match(/\b\d+\.\d+\.\d+\b/)
  const bullets = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, ""))
  return {
    version: versionMatch?.[0] ?? "0.0.0",
    bullets,
  }
}

export function composeBrief(input: {
  version: string
  bullets: string[]
  stampInterrupted: boolean
}): string {
  const highlights =
    input.bullets.length > 0
      ? input.bullets.map((bullet) => `- ${bullet}`).join("\n")
      : "- No bullet highlights found in the changelog."
  const publish = input.stampInterrupted
    ? "stamp_release was interrupted and was not run again. The publish already on disk was left as-is."
    : "stamp_release finished and recorded the release note."
  return [
    `Release ${input.version}`,
    "",
    "Highlights",
    highlights,
    "",
    "Publish",
    publish,
  ].join("\n")
}
