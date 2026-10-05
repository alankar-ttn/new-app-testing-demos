import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  IDEA_NOTE_MAX,
  IDEA_TITLE_MAX,
  formatIdeaDate,
  type Idea,
} from '@/ideas'
import { addIdea } from '@/server/ideas.functions'

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message
  }
  return 'Could not save that idea.'
}

export function IdeaBoard({ ideas }: { ideas: Idea[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      await addIdea({ data: { title, note } })
      setTitle('')
      setNote('')
      await router.invalidate()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          TanStack Start
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex max-w-2xl flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Idea board
            </h1>
            <p className="text-base text-muted-foreground">
              Add a card. The form calls a server function, and the list comes
              back from server memory — no database, one page.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>New idea</CardTitle>
            <CardDescription>
              Saved on the server for this demo session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-title">Title</Label>
                <Input
                  id="idea-title"
                  name="title"
                  value={title}
                  maxLength={IDEA_TITLE_MAX}
                  placeholder="What should we try?"
                  aria-invalid={error ? true : undefined}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-note">Note</Label>
                <Textarea
                  id="idea-note"
                  name="note"
                  value={note}
                  maxLength={IDEA_NOTE_MAX}
                  placeholder="Optional detail"
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={pending || title.trim().length === 0}>
                {pending ? 'Saving…' : 'Add idea'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3" aria-label="Ideas">
          {ideas.map((idea) => (
            <Card key={idea.id} size="sm">
              <CardHeader>
                <CardTitle>{idea.title}</CardTitle>
                <CardDescription>{formatIdeaDate(idea.createdAt)}</CardDescription>
              </CardHeader>
              {idea.note ? (
                <CardContent>
                  <p className="text-sm leading-relaxed">{idea.note}</p>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </section>
      </div>
    </main>
  )
}
