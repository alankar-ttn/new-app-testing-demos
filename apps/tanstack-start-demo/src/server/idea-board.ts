import {
  IDEA_NOTE_MAX,
  IDEA_TITLE_MAX,
  type Idea,
} from '../ideas.ts'

const SEED_IDEAS: Idea[] = [
  {
    id: 'seed-server-fn',
    title: 'Call a server function',
    note: 'Adding a card runs on the server, then the list reloads with the new idea.',
    createdAt: '2026-10-05T12:00:00.000Z',
  },
  {
    id: 'seed-shadcn',
    title: 'Keep the UI small',
    note: 'Button, card, input, and label from shadcn — just enough to click through.',
    createdAt: '2026-10-04T12:00:00.000Z',
  },
]

function cloneIdea(idea: Idea): Idea {
  return { ...idea }
}

export function createIdeaBoard(initial: Idea[] = SEED_IDEAS) {
  const ideas = initial.map(cloneIdea)

  return {
    list(): Idea[] {
      return ideas.map(cloneIdea)
    },
    add(input: { title: string; note: string }): Idea {
      const title = input.title.trim()
      const note = input.note.trim()

      if (!title) {
        throw new Error('Add a title before saving.')
      }
      if (title.length > IDEA_TITLE_MAX) {
        throw new Error(`Title must be ${IDEA_TITLE_MAX} characters or fewer.`)
      }
      if (note.length > IDEA_NOTE_MAX) {
        throw new Error(`Note must be ${IDEA_NOTE_MAX} characters or fewer.`)
      }

      const idea: Idea = {
        id: crypto.randomUUID(),
        title,
        note,
        createdAt: new Date().toISOString(),
      }
      ideas.unshift(idea)
      return cloneIdea(idea)
    },
  }
}

export const ideaBoard = createIdeaBoard()
