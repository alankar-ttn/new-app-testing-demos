import { createServerFn } from '@tanstack/react-start'
import { ideaBoard } from './idea-board.ts'

function readIdeaInput(data: unknown): { title: string; note: string } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid idea.')
  }

  const record = data as Record<string, unknown>
  if (typeof record.title !== 'string' || typeof record.note !== 'string') {
    throw new Error('Title and note must be text.')
  }

  return { title: record.title, note: record.note }
}

export const listIdeas = createServerFn({ method: 'GET' }).handler(async () => {
  return ideaBoard.list()
})

export const addIdea = createServerFn({ method: 'POST' })
  .validator(readIdeaInput)
  .handler(async ({ data }) => {
    return ideaBoard.add(data)
  })
