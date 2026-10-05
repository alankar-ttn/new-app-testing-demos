import { createFileRoute } from '@tanstack/react-router'
import { IdeaBoard } from '@/components/idea-board'
import { listIdeas } from '@/server/ideas.functions'

export const Route = createFileRoute('/')({
  loader: () => listIdeas(),
  component: Home,
})

function Home() {
  const ideas = Route.useLoaderData()
  return <IdeaBoard ideas={ideas} />
}
