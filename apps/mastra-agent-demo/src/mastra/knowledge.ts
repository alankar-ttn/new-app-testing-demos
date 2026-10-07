import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

export type KnowledgeMatch = {
  file: string
  excerpt: string
}

const STOP = new Set(["the", "and", "for", "are", "you", "your", "this", "that", "with", "from", "have", "what", "when", "which", "who"])

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP.has(token))
}

function paragraphs(markdown: string): string[] {
  return markdown
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !isHeadingOnly(part))
}

function isHeadingOnly(excerpt: string): boolean {
  const lines = excerpt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.length > 0 && lines.every((line) => line.startsWith("#"))
}

/** Rank paragraphs in a local markdown folder. No remote index. */
export async function searchKnowledge(root: string, query: string): Promise<KnowledgeMatch[]> {
  const names = (await readdir(root)).filter((name) => name.endsWith(".md") || name.endsWith(".txt"))
  const wanted = tokens(query)
  const scored: { file: string; excerpt: string; score: number }[] = []

  for (const name of names.sort()) {
    const body = await readFile(join(root, name), "utf8")
    const fileBonus = wanted.some((token) => name.toLowerCase().includes(token)) ? 1 : 0
    for (const excerpt of paragraphs(body)) {
      const haystack = tokens(excerpt)
      const score = wanted.reduce((sum, token) => sum + (haystack.includes(token) ? 2 : 0), fileBonus)
      if (score > 0) scored.push({ file: name, excerpt, score })
    }
  }

  scored.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))
  const top = scored.slice(0, 3).map(({ file, excerpt }) => ({ file, excerpt }))
  if (top.length > 0) return top

  return names.slice(0, 3).map((file) => ({
    file,
    excerpt: "No paragraph matched. This file is in the local knowledge folder.",
  }))
}
