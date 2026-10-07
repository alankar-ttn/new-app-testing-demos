import { RotateCcw, Send } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ThreadSnapshot } from "../mastra/concierge"
import { withBase } from "../with-base"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Textarea } from "./ui/textarea"

const THREAD_KEY = "mastra-agent-demo-thread"

const prompts = [
  { id: "projects", label: "Projects", text: "What projects have you shipped?" },
  { id: "skills", label: "Skills", text: "Which skills are in the notes?" },
  { id: "free", label: "Availability", text: "When are you free this week?" },
  {
    id: "message",
    label: "Leave a message",
    text: "Leave a message from Ada Lovelace at ada@example.com: The harbor map is lovely.",
  },
  { id: "book", label: "Book a slot", text: "Book Thu 14:00 for Ada Lovelace ada@example.com" },
  { id: "memory", label: "Recall thread", text: "What did we already cover?" },
] as const

const emptySnapshot = (threadId: string): ThreadSnapshot => ({
  threadId,
  messages: [],
  inbox: [],
  bookings: [],
})

const api = (path: string) => withBase(import.meta.env.BASE_URL, path)

function newThreadId(): string {
  return crypto.randomUUID()
}

export function DemoApp() {
  const [threadId, setThreadId] = useState("")
  const [snapshot, setSnapshot] = useState<ThreadSnapshot | null>(null)
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restored, setRestored] = useState(0)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(THREAD_KEY)
    const id = stored && /^[A-Za-z0-9_-]{8,80}$/.test(stored) ? stored : newThreadId()
    localStorage.setItem(THREAD_KEY, id)
    setThreadId(id)
    void fetch(api(`api/thread?threadId=${encodeURIComponent(id)}`))
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the thread.")
        return (await response.json()) as ThreadSnapshot
      })
      .then((next) => {
        setSnapshot(next)
        setRestored(next.messages.length)
      })
      .catch((caught: unknown) => {
        setSnapshot(emptySnapshot(id))
        setError(caught instanceof Error ? caught.message : "Could not load the thread.")
      })
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [snapshot?.messages.length])

  async function send(text: string) {
    const message = text.trim()
    if (!message || !threadId || pending) return
    setPending(true)
    setError(null)
    setDraft("")
    try {
      const response = await fetch(api("api/chat"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId, text: message }),
      })
      const payload = (await response.json()) as ThreadSnapshot & { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "The concierge could not answer.")
      setSnapshot(payload)
    } catch (caught) {
      setDraft(message)
      setError(caught instanceof Error ? caught.message : "The concierge could not answer.")
    } finally {
      setPending(false)
    }
  }

  function startNewThread() {
    const id = newThreadId()
    localStorage.setItem(THREAD_KEY, id)
    setThreadId(id)
    setSnapshot(emptySnapshot(id))
    setRestored(0)
    setDraft("")
    setError(null)
  }

  const messages = snapshot?.messages ?? []
  const shortId = threadId ? `${threadId.slice(0, 8)}…` : "…"

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Mastra</p>
            {import.meta.env.BASE_URL !== "/" ? (
              <a href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                All demos
              </a>
            ) : null}
          </div>
          <h1 className="text-3xl font-medium tracking-tight">Portfolio concierge</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A local Mastra agent reads a knowledge folder, saves a message, and books a mock slot.
            The thread stays in Mastra memory after you reload the page. No API key.
          </p>
        </div>
        <Badge variant="outline">Local model</Badge>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.8fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <CardTitle>Chat</CardTitle>
                <CardDescription>Thread {shortId} is stored with Mastra memory.</CardDescription>
              </div>
              <Badge variant="secondary" data-testid="memory-count">
                {messages.length} in memory
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {restored > 0 ? (
              <p
                className="rounded-lg bg-muted px-3 py-2 text-sm"
                data-testid="memory-banner"
                role="status"
              >
                Restored {restored} messages from Mastra thread memory after reload.
              </p>
            ) : messages.length === 0 ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                This thread is new. Ask a question, then reload the page to see the same messages come back.
              </p>
            ) : (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                These turns are in Mastra thread memory. Reload the page and the same transcript comes back.
              </p>
            )}

            <div
              className="grid max-h-[28rem] gap-3 overflow-auto rounded-lg border border-border p-3"
              data-testid="transcript"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                messages.map((message) => (
                  <article key={message.id} className="grid gap-1.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {message.role === "user" ? "You" : "Concierge"}
                    </p>
                    {message.text ? (
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    ) : null}
                    {message.tools.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {message.tools.map((tool) => (
                          <Badge key={`${message.id}-${tool.name}`} variant="outline">
                            {tool.name} · {tool.summary}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
              <div ref={endRef} />
            </div>

            <div className="flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <Button
                  key={prompt.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid={`prompt-${prompt.id}`}
                  disabled={pending || !threadId}
                  onClick={() => void send(prompt.text)}
                >
                  {prompt.label}
                </Button>
              ))}
            </div>

            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void send(draft)
              }}
            >
              <label className="grid gap-1.5 text-sm" htmlFor="draft">
                Message
                <Textarea
                  id="draft"
                  data-testid="composer"
                  value={draft}
                  placeholder="Ask about the portfolio, leave a message, or book a slot."
                  disabled={pending || !threadId}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      void send(draft)
                    }
                  }}
                />
              </label>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" data-testid="send" disabled={pending || !draft.trim() || !threadId}>
                  <Send />
                  {pending ? "Thinking" : "Send"}
                </Button>
                <Button type="button" variant="outline" onClick={startNewThread} disabled={pending}>
                  New thread
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="reload"
                  onClick={() => window.location.reload()}
                >
                  <RotateCcw />
                  Reload page
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>leave_message writes this local file.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3" data-testid="inbox">
              {(snapshot?.inbox.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No messages saved.</p>
              ) : (
                snapshot?.inbox.map((note) => (
                  <div key={note.id} className="grid gap-1 rounded-lg bg-muted px-3 py-2">
                    <p className="text-sm font-medium">
                      {note.name}{" "}
                      <span className="font-normal text-muted-foreground">{note.email}</span>
                    </p>
                    <p className="text-sm">{note.note}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mock calendar</CardTitle>
              <CardDescription>book_slot holds one visitor per open slot.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2" data-testid="bookings">
              {(snapshot?.bookings.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No slots held. Open: Tue 10:00, Thu 14:00, Fri 11:30.</p>
              ) : (
                snapshot?.bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{booking.slot}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.name} · {booking.email}
                      </p>
                    </div>
                    <Badge>Held</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
