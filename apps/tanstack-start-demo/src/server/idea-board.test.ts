import { describe, expect, test } from 'bun:test'
import { IDEA_NOTE_MAX, IDEA_TITLE_MAX } from '../ideas.ts'
import { createIdeaBoard } from './idea-board.ts'

describe('idea board', () => {
  test('starts with the seeded cards', () => {
    const board = createIdeaBoard()
    const ideas = board.list()
    expect(ideas.map((idea) => idea.title)).toEqual([
      'Call a server function',
      'Keep the UI small',
    ])
  })

  test('adds a trimmed card at the top', () => {
    const board = createIdeaBoard([])
    const created = board.add({
      title: '  Sketch the homepage  ',
      note: '  One screen.  ',
    })

    expect(created.title).toBe('Sketch the homepage')
    expect(created.note).toBe('One screen.')
    expect(board.list()[0]?.id).toBe(created.id)
  })

  test('returns copies so callers cannot mutate the store', () => {
    const board = createIdeaBoard([])
    board.add({ title: 'Stay put', note: '' })
    const listed = board.list()
    listed.pop()
    expect(board.list()).toHaveLength(1)
  })

  test('rejects an empty title', () => {
    const board = createIdeaBoard([])
    expect(() => board.add({ title: '   ', note: 'note' })).toThrow(
      'Add a title before saving.',
    )
    expect(board.list()).toHaveLength(0)
  })

  test('rejects titles and notes that are too long', () => {
    const board = createIdeaBoard([])
    expect(() =>
      board.add({ title: 'a'.repeat(IDEA_TITLE_MAX + 1), note: '' }),
    ).toThrow(`Title must be ${IDEA_TITLE_MAX} characters or fewer.`)
    expect(() =>
      board.add({ title: 'Ok', note: 'b'.repeat(IDEA_NOTE_MAX + 1) }),
    ).toThrow(`Note must be ${IDEA_NOTE_MAX} characters or fewer.`)
  })
})
