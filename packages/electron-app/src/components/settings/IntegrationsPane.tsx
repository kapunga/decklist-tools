import { McpIntegrationCard } from '@/components/McpIntegrationCard'
import { SkillsIntegrationCard } from '@/components/SkillsIntegrationCard'

export function IntegrationsPane() {
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
      <SkillsIntegrationCard
        clientId="claude-desktop"
        clientTitle="Claude Desktop"
        connectedDescription="Skill bundles are ready to upload to Claude Desktop"
        disconnectedDescription="Save the skill bundle and upload it via Claude Desktop's Capabilities"
      />
      <McpIntegrationCard
        clientId="claude-code"
        title="Claude Code"
        connectedDescription="Claude Code can access your deck data through MCP tools"
        disconnectedDescription="Connect to enable deck management from Claude Code"
        connectButtonLabel="Connect to Claude Code"
        postConnectionNote="You may need to restart Claude Code or re-enter your project for changes to take effect."
      />
      <SkillsIntegrationCard
        clientId="claude-code"
        clientTitle="Claude Code"
        connectedDescription="Skills are installed in ~/.claude/skills and ready to use"
        disconnectedDescription="Install skills so Claude Code can use the MCP tools more effectively"
      />
      <McpIntegrationCard
        clientId="gemini-cli"
        title="Gemini CLI"
        connectedDescription="Gemini can help you manage your decks through the CLI"
        disconnectedDescription="Connect to use Gemini CLI for deck building"
        connectButtonLabel="Connect to Gemini CLI"
        postConnectionNote="You may need to restart Gemini CLI for changes to take effect."
      />
      <SkillsIntegrationCard
        clientId="gemini-cli"
        clientTitle="Gemini CLI"
        connectedDescription="Skills are installed in ~/.gemini/skills and ready to use"
        disconnectedDescription="Install skills so Gemini CLI can use the MCP tools more effectively"
      />
    </div>
  )
}
