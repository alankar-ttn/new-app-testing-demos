import demos from "../demos.json"

export type DemoFramework = "tanstack-start" | "bun" | "vite"

export type DemoEntry = {
  slug: string
  name: string
  description: string
  framework: DemoFramework
}

export const demoEntries = demos as DemoEntry[]

export function demoPath(slug: string): string {
  return `/demos/${slug}/`
}

export function serviceName(slug: string): string {
  return slug.replaceAll("-", "_")
}
