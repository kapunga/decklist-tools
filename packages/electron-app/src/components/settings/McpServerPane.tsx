import { McpIntegrationCard } from '@/components/McpIntegrationCard'

export function McpServerPane() {
  return (
    <div className="space-y-6">
      <McpIntegrationCard
        clientId="claude-desktop"
        title="Claude Desktop"
        connectedDescription="Claude can help you manage your decks through conversation"
        disconnectedDescription="Connect to use AI-powered deck building features"
        connectButtonLabel="Connect to Claude"
        postConnectionNote="You may need to restart Claude Desktop for changes to take effect."
      />
      <McpIntegrationCard
        clientId="claude-code"
        title="Claude Code"
        connectedDescription="Claude Code can access your deck data through MCP tools"
        disconnectedDescription="Connect to enable deck management from Claude Code"
        connectButtonLabel="Connect to Claude Code"
        postConnectionNote="You may need to restart Claude Code or re-enter your project for changes to take effect."
      />
      <McpIntegrationCard
        clientId="gemini-cli"
        title="Gemini CLI"
        connectedDescription="Gemini can help you manage your decks through the CLI"
        disconnectedDescription="Connect to use Gemini CLI for deck building"
        connectButtonLabel="Connect to Gemini CLI"
        postConnectionNote="You may need to restart Gemini CLI for changes to take effect."
      />
    </div>
  )
}
