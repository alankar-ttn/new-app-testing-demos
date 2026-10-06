import { ArrowUpRight } from "lucide-react"
import { demoEntries, demoPath } from "../registry"
import { Badge } from "./ui/badge"
import { buttonVariants } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

export function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Sticky demos
        </p>
        <h1 className="text-4xl font-medium tracking-tight">Demo hub</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One Vercel project serves this page and every demo. Open a card to stay on this domain
          under <span className="font-mono text-foreground">/demos/&lt;slug&gt;/</span>.
        </p>
      </header>

      <ul className="grid gap-4">
        {demoEntries.map((demo) => {
          const href = demoPath(demo.slug)
          return (
            <li key={demo.slug}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="text-base">{demo.name}</CardTitle>
                    <Badge variant="outline">{demo.framework}</Badge>
                  </div>
                  <CardDescription>{demo.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-mono text-xs text-muted-foreground">{href}</p>
                  <a className={buttonVariants()} href={href}>
                    Open demo
                    <ArrowUpRight />
                  </a>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
