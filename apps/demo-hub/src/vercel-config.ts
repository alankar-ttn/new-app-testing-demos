import { demoPath, serviceName, type DemoEntry } from "./registry"

type Rewrite = {
  source: string
  destination: string | { service: string }
}

type ServiceConfig = {
  root: string
  framework: string
  entrypoint?: string
  installCommand: string
  buildCommand: string
  outputDirectory?: string
  rewrites?: Rewrite[]
  functions?: Record<string, { maxDuration?: number; includeFiles?: string }>
}

export type VercelProjectConfig = {
  $schema: string
  services: Record<string, ServiceConfig>
  rewrites: Rewrite[]
}

export const INCLUDE_FILES_MAX_LENGTH = 256

/**
 * includeFiles is a single node-glob pattern (commas only separate inside
 * braces) and the schema caps it at 256 characters. A services build globs it
 * from the repository root, so the leading brace also matches service-relative.
 */
export function bunIncludeFiles(slug: string): string {
  const dirs = ["dist", "src"]
  if (slug === "mastra-agent-demo") {
    // Bun services trace dependencies with NFT condition ["bun"], which replaces
    // the default "node" condition. Bun itself still resolves the "node" export.
    // lru-cache's node build is the file the runtime loads; without it the Mastra
    // function throws "Cannot find package 'lru-cache'" while the module evaluates.
    dirs.push("node_modules/lru-cache/dist/*/node")
  }
  return `{,apps/${slug}/}{${dirs.join(",")}}/**`
}

function demoService(demo: DemoEntry): ServiceConfig {
  const root = `apps/${demo.slug}`
  if (demo.framework === "bun") {
    // bunVersion is not a service field, and a root bunVersion would switch
    // every service onto Bun. The app selects Bun with package.json engines.bun.
    const includeFiles = bunIncludeFiles(demo.slug)
    return {
      root,
      framework: "bun",
      entrypoint: "src/server.ts",
      installCommand: "bun install",
      buildCommand: "bun run build",
      functions: {
        "src/server.ts": {
          maxDuration: 60,
          includeFiles,
        },
      },
    }
  }
  if (demo.framework === "tanstack-start") {
    return {
      root,
      framework: "tanstack-start",
      installCommand: "bun install",
      buildCommand: "bun run build",
    }
  }
  return {
    root,
    framework: "vite",
    installCommand: "bun install",
    buildCommand: "bun run build",
    outputDirectory: "dist",
    rewrites: [{ source: "/(.*)", destination: "/index.html" }],
  }
}

/** Build the root Vercel project config from the demo registry. */
export function buildVercelConfig(demos: DemoEntry[]): VercelProjectConfig {
  const services: Record<string, ServiceConfig> = {
    hub: {
      root: "apps/demo-hub",
      framework: "vite",
      installCommand: "bun install",
      buildCommand: "bun run build",
      outputDirectory: "dist",
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    },
  }

  for (const demo of demos) {
    services[serviceName(demo.slug)] = demoService(demo)
  }

  const rewrites: Rewrite[] = []
  for (const demo of demos) {
    const destination = { service: serviceName(demo.slug) }
    const mounted = demoPath(demo.slug)
    rewrites.push(
      { source: mounted.replace(/\/$/, ""), destination },
      { source: mounted, destination },
      { source: `${mounted}:path*`, destination },
    )
  }
  // "/:path*" does not match the empty path, so "/" never reaches the hub.
  rewrites.push({ source: "/(.*)", destination: { service: "hub" } })

  return {
    $schema: "https://openapi.vercel.sh/vercel.json",
    services,
    rewrites,
  }
}
