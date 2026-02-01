# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MTG Deckbuilder Tools is a monorepo with three integrated packages for Magic: The Gathering deck management:

1. **Shared Package** (`packages/shared`) - Common types, utilities, Scryfall client, and format parsers
2. **MCP Server** (`packages/mcp-server`) - TypeScript MCP server enabling Claude to help build and manage decks
3. **Electron App** (`packages/electron-app`) - Desktop application for visual deck management

All packages share the same JSON-based storage at `~/Library/Application Support/mtg-deckbuilder/` and can be used simultaneously.

## Build Commands

### Full Build
```bash
pnpm install        # Install all dependencies
pnpm build          # Build all packages in order
```

### Individual Packages
```bash
# Shared package (must be built first)
pnpm build:shared

# MCP Server
pnpm build:mcp
pnpm dev:mcp        # Run in development mode

# Electron App
pnpm build:electron
pnpm dev            # Full Electron + hot reload
```

### Other Commands
```bash
pnpm typecheck      # TypeScript checking across all packages
pnpm clean          # Clean all build outputs
```

## Architecture

### Monorepo Structure
```
decklist-tools/
├── packages/
│   ├── shared/              # Shared types, utilities, clients
│   ├── mcp-server/          # TypeScript MCP server
│   └── electron-app/        # Electron desktop app
├── mcp-server/              # (archived) Scala MCP server
├── specs/                   # Design specifications
├── package.json             # Workspace root
└── pnpm-workspace.yaml
```

### Shared Data Model
All packages operate on the same JSON files:
- `config.json` - App configuration
- `taxonomy.json` - Global tag taxonomy
- `decks/{uuid}.json` - Individual deck files
- `interest-list.json` - Cards of interest
- `cache/scryfall/{id}.json` - Cached Scryfall data
- `global-roles.json` - Global role definitions

Concurrency is handled via optimistic locking with a version field on decks.

### Shared Package (packages/shared/)
TypeScript library with common code:
- `src/types/` - All TypeScript interfaces (Deck, DeckCard, etc.)
- `src/scryfall/` - Scryfall API client with rate limiting
- `src/formats/` - Import/export parsers (Arena, Moxfield, Archidekt, MTGO, Simple)
- `src/constants/` - Default roles, card types, configuration
- `src/storage/` - Node.js file storage class

### MCP Server (packages/mcp-server/)
TypeScript MCP server with 30+ tools:
- `src/main.ts` - Entry point, MCP server setup
- `src/tools/` - Tool implementations (deck management, cards, roles, import/export)
- `src/views/` - Deck rendering (full, skeleton, checklist, curve, by-role, by-type)

### Electron App (packages/electron-app/)
React 18 + TypeScript with Vite bundling:
- `electron/main.ts` - Electron main process with Claude Desktop integration
- `electron/preload.ts` - IPC bridge for secure API access
- `electron/storage.ts` - File system operations
- `src/components/` - React components (DeckList, DeckDetail, CardGrid, SettingsPage, etc.)
- `src/hooks/` - Zustand state (useStore), deck operations
- `src/lib/` - Client-side utilities (imports from shared package)

UI uses shadcn/ui components (in `src/components/ui/`) with Tailwind CSS.

## Claude Desktop Integration

The Electron app includes a "Connect to Claude Desktop" feature in Settings:
- Automatically configures `~/Library/Application Support/Claude/claude_desktop_config.json`
- Adds the MCP server as `mtg-deckbuilder`
- Enables AI-powered deck building features through Claude Desktop

## Key Dependencies

### Shared Package
- TypeScript 5.2.2
- uuid (deck/card ID generation)

### MCP Server
- @modelcontextprotocol/sdk (MCP protocol)
- @mtg-deckbuilder/shared (shared types and utilities)

### Electron App
- Electron 39.0.0
- React 18.2.0 + TypeScript 5.2.2
- Zustand 4.4.7 (state) + TanStack React Query 5.8.4
- Tailwind CSS 3.3.5 + Radix UI
- @mtg-deckbuilder/shared (shared types and utilities)

## Specifications

Detailed design docs in `specs/`:
- `01-storage-format.md` - Complete JSON schema for all data structures
- `02-mcp-server.md` - All 30+ MCP tools with input/output schemas
- `03-electron-app.md` - UI/UX specification with keyboard shortcuts
