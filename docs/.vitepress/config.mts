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
          { text: 'MCP Server', link: '/usage-mcp' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kapunga/decklist-tools' },
    ],
  },
})
