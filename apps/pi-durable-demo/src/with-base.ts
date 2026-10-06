/** Join a Vite `base` (`/` or `/demos/<slug>/`) with an app-relative path. */
export function withBase(base: string, path: string): string {
  const prefix = base.endsWith("/") ? base : `${base}/`
  return `${prefix}${path.replace(/^\//, "")}`
}
