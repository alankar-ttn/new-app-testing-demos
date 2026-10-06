export const DEMO_SLUG = "tanstack-start-demo"

/** Public mount prefix without a trailing slash. Empty when the app owns `/`. */
export function mountPrefix(): string {
  const fromEnv = process.env.DEMO_BASE_PATH?.trim()
  if (fromEnv) {
    if (fromEnv === "/") return ""
    return fromEnv.replace(/\/$/, "")
  }
  if (process.env.VERCEL === "1") return `/demos/${DEMO_SLUG}`
  return ""
}

export function viteBase(): string {
  const prefix = mountPrefix()
  return prefix ? `${prefix}/` : "/"
}
