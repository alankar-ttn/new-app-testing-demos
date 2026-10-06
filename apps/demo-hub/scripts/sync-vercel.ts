import { writeFileSync } from "node:fs"
import { demoEntries } from "../src/registry"
import { buildVercelConfig } from "../src/vercel-config"

const target = new URL("../../../vercel.json", import.meta.url)
const config = buildVercelConfig(demoEntries)
writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`)
console.log(`Wrote ${target.pathname}`)
