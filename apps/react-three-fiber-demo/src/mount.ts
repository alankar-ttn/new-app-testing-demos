export const DEMO_SLUG = "react-three-fiber-demo"

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

/**
 * Directory under `dist/` that mirrors the build when Vite `base` is the public
 * mount. Vercel static lookup uses the original request path, so
 * `/demos/<slug>/assets/...` has to exist as a file as well as `dist/assets/...`.
 */
export function mountedOutputDir(base: string): string | null {
  if (base === "/" || base === "") return null
  const nested = base.replace(/^\//, "").replace(/\/$/, "")
  return nested === "" ? null : nested
}
