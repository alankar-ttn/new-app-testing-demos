import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

export type ContactNote = {
  id: string
  name: string
  email: string
  note: string
  at: string
}

export type Booking = {
  id: string
  name: string
  email: string
  slot: string
  at: string
}

export const OPEN_SLOTS = ["Tue 10:00", "Thu 14:00", "Fri 11:30"] as const

type DeskFile = {
  notes: ContactNote[]
  bookings: Booking[]
}

export type Desk = {
  list(): Promise<DeskFile>
  leaveMessage(input: { name: string; email: string; note: string }): Promise<ContactNote>
  bookSlot(input: { name: string; email: string; slot: string }): Promise<
    { booked: true; booking: Booking } | { booked: false; reason: string; slot: string }
  >
}

function empty(): DeskFile {
  return { notes: [], bookings: [] }
}

/** Map a visitor phrase onto one of the mock slots. */
export function canonicalSlot(input: string): string | null {
  const text = input.toLowerCase().replace(/\s+/g, " ").trim()
  if (/(tue|tuesday)/.test(text) && /10/.test(text)) return "Tue 10:00"
  if (/(thu|thursday)/.test(text) && /(14|2(?!:\d))/.test(text)) return "Thu 14:00"
  if (/(fri|friday)/.test(text) && /11/.test(text)) return "Fri 11:30"
  const exact = OPEN_SLOTS.find((slot) => slot.toLowerCase() === text)
  return exact ?? null
}

export function openDesk(dir: string): Desk {
  const file = join(dir, "desk.json")

  async function read(): Promise<DeskFile> {
    try {
      const parsed = JSON.parse(await readFile(file, "utf8")) as Partial<DeskFile>
      return {
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
      }
    } catch {
      return empty()
    }
  }

  async function write(next: DeskFile): Promise<void> {
    await mkdir(dir, { recursive: true })
    await writeFile(file, `${JSON.stringify(next, null, 2)}\n`)
  }

  return {
    list: read,
    async leaveMessage(input) {
      const desk = await read()
      const note: ContactNote = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        email: input.email.trim(),
        note: input.note.trim(),
        at: new Date().toISOString(),
      }
      desk.notes.push(note)
      await write(desk)
      return note
    },
    async bookSlot(input) {
      const slot = canonicalSlot(input.slot)
      if (!slot) {
        return {
          booked: false,
          slot: input.slot,
          reason: `Unknown slot. Open slots: ${OPEN_SLOTS.join(", ")}.`,
        }
      }
      const desk = await read()
      const taken = desk.bookings.find((booking) => booking.slot === slot)
      if (taken) {
        return {
          booked: false,
          slot,
          reason: `${slot} is already held by ${taken.name}.`,
        }
      }
      const booking: Booking = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        email: input.email.trim(),
        slot,
        at: new Date().toISOString(),
      }
      desk.bookings.push(booking)
      await write(desk)
      return { booked: true, booking }
    },
  }
}
