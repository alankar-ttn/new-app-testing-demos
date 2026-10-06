import { demoPath, serviceName, type DemoEntry } from "./registry"

type Rewrite = {
  source: string
  destination: string | { service: string }
}

type ServiceConfig = {
  root: string
  framework: string
  installCommand: string
  buildCommand: string
  outputDirectory?: string
  bunVersion?: string
  rewrites?: Rewrite[]
  functions?: Record<string, { maxDuration?: number; includeFiles?: string }>
}

export type VercelProjectConfig = {
  $schema: string
  services: Record<string, ServiceConfig>
  rewrites: Rewrite[]
}

function demoService(demo: DemoEntry): ServiceConfig {
  const root = `apps/${demo.slug}`
  if (demo.framework === "bun") {
    return {
      root,
      framework: "bun",
      bunVersion: "1.x",
      installCommand: "bun install",
      buildCommand: "bun run build",
      functions: {
        "src/server.ts": {
          maxDuration: 60,
          includeFiles: "dist/**,src/**",
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
  rewrites.push({ source: "/:path*", destination: { service: "hub" } })

  return {
    $schema: "https://openapi.vercel.sh/vercel.json",
    services,
    rewrites,
  }
}
