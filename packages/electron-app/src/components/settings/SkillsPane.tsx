import { SkillsTable } from '@/components/SkillsTable'

export function SkillsPane() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Skills</h2>
        <p className="text-sm text-muted-foreground">
          Install MTG Deckbuilder skills into your AI clients. Skills teach the assistant how to use the MCP server effectively — what queries to run, what tools to chain, and the vocabulary specific to deckbuilding.
        </p>
      </div>
      <SkillsTable />
    </div>
  )
}
