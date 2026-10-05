export type Idea = {
  id: string
  title: string
  note: string
  createdAt: string
}

export const IDEA_TITLE_MAX = 80
export const IDEA_NOTE_MAX = 280

export function formatIdeaDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))
}
