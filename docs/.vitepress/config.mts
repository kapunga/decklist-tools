import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MTG Deckbuilder Tools',
  description: 'Desktop app and MCP server for Magic: The Gathering deck management',
  base: '/decklist-tools/',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Installation', link: '/installation' },
      { text: 'Desktop App', link: '/usage-electron' },
      { text: 'MCP Server', link: '/usage-mcp' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Installation', link: '/installation' },
        ],
      },
      {
        text: 'Usage',
        items: [
          { text: 'Desktop App', link: '/usage-electron' },
        ],
      },
      {
        text: 'MCP Server',
        items: [
          { text: 'Overview', link: '/usage-mcp' },
          { text: 'Deck Management', link: '/mcp/deck-management' },
          { text: 'Card Management', link: '/mcp/card-management' },
          { text: 'Views', link: '/mcp/views' },
          { text: 'Roles', link: '/mcp/roles' },
          { text: 'Commanders', link: '/mcp/commanders' },
          { text: 'Notes', link: '/mcp/notes' },
          { text: 'Interest List', link: '/mcp/interest-list' },
          { text: 'Search & Reports', link: '/mcp/search-reports' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kapunga/decklist-tools' },
    ],
  },
})
