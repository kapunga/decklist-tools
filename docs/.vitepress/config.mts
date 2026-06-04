import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MTG Deckbuilder Tools',
  description: 'Desktop app and MCP server for Magic: The Gathering deck management',
  base: '/decklist-tools/',

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/decklist-tools/favicon.png' }],

    // Editorial type system — the same families the Electron app loads via
    // fontsource, served here from Google Fonts. All six theme palettes are
    // covered so the in-page theme picker can switch fonts without a reload.
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href:
        'https://fonts.googleapis.com/css2' +
        '?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700' +
        '&family=Inter:wght@400;500;600;700' +
        '&family=Space+Grotesk:wght@400;500;600;700' +
        '&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400;1,500' +
        '&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600' +
        '&family=IBM+Plex+Serif:ital,wght@0,400;0,500;0,600;1,400;1,500' +
        '&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700' +
        '&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400' +
        '&family=Instrument+Serif:ital@0;1' +
        '&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500' +
        '&family=Cinzel:wght@400;600;700' +
        '&display=swap',
    }],
  ],

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Install', link: '/installation' },
      { text: 'Desktop App', link: '/usage-electron' },
      { text: 'AI assistants', link: '/usage-mcp' },
    ],

    sidebar: [
      {
        text: 'Getting started',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Installation', link: '/installation' },
        ],
      },
      {
        text: 'The desktop app',
        items: [
          { text: 'Guided tour', link: '/usage-electron' },
          { text: 'Settings', link: '/settings' },
        ],
      },
      {
        text: 'Building with AI assistants',
        items: [
          { text: 'Overview', link: '/usage-mcp' },
          { text: 'Skills', link: '/skills' },
          { text: 'Manual setup', link: '/manual-setup' },
        ],
      },
      {
        text: 'MCP tool reference (advanced)',
        collapsed: true,
        items: [
          { text: 'Deck management', link: '/mcp/deck-management' },
          { text: 'Card management', link: '/mcp/card-management' },
          { text: 'Views', link: '/mcp/views' },
          { text: 'Roles', link: '/mcp/roles' },
          { text: 'Commanders', link: '/mcp/commanders' },
          { text: 'Notes', link: '/mcp/notes' },
          { text: 'Interest list', link: '/mcp/interest-list' },
          { text: 'Search & reports', link: '/mcp/search-reports' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kapunga/decklist-tools' },
    ],
  },
})
