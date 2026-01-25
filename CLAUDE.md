# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MTG Deckbuilder Tools is a suite of two integrated applications for Magic: The Gathering deck management:

1. **MCP Server** (Scala 3) - Enables Claude to help build and manage decks through natural conversation
2. **Electron App** (React/TypeScript) - Desktop application for visual deck management

Both applications share the same JSON-based storage at `~/Library/Application Support/mtg-deckbuilder/` and can be used simultaneously.

## Build Commands

### MCP Server
```bash
cd mcp-server
sbt compile          # Compile
sbt test             # Run tests
sbt assembly         # Build fat JAR at target/scala-3.3.1/mtg-deckbuilder-mcp.jar
./run.sh             # Run the assembled JAR
```

### Electron App
```bash
cd electron-app
npm install          # Install dependencies
npm run dev          # Vite dev server only
npm run electron:dev # Full Electron + hot reload
npm run typecheck    # TypeScript type checking
npm run build        # Production build (outputs to release/)
```

## Architecture

### Shared Data Model
Both applications operate on the same JSON files:
- `config.json` - App configuration
- `taxonomy.json` - Global tag taxonomy
- `decks/{uuid}.json` - Individual deck files
- `interest-list.json` - Cards of interest
- `cache/scryfall/{id}.json` - Cached Scryfall data

Concurrency is handled via optimistic locking with a version field on decks.

### MCP Server (mcp-server/)
Scala 3 application using cats-effect for functional IO:
- `Main.scala` - Entry point and MCP tool registration
- `domain/Models.scala` - Core data models (enums, case classes)
- `storage/Storage.scala` - File I/O and persistence
- `scryfall/ScryfallClient.scala` - Scryfall API client with caching
- `tools/DeckTools.scala` - MCP tool implementations (30+ tools)
- `views/DeckViews.scala` - Deck rendering (full, skeleton, etc.)
- `formats/DeckFormats.scala` - Import/export parsers

### Electron App (electron-app/)
React 18 + TypeScript with Vite bundling:
- `electron/main.ts` - Electron main process
- `electron/preload.ts` - IPC bridge for secure API access
- `electron/storage.ts` - File system operations
- `src/components/` - React components (DeckList, DeckDetail, CardGrid, etc.)
- `src/hooks/` - Zustand state (useStore), deck operations (useDecks), Scryfall (useScryfall)
- `src/lib/formats/` - Import/export parsers (Arena, Moxfield, Archidekt, MTGO)
- `src/lib/scryfall.ts` - Scryfall API client

UI uses shadcn/ui components (in `src/components/ui/`) with Tailwind CSS.

## Key Dependencies

### MCP Server
- cats-effect 3.5.2 (functional effects)
- http4s-ember-client 0.23.23 (HTTP)
- circe 0.14.6 (JSON)
- scala-mcp-server 0.1.1 (MCP protocol)

### Electron App
- Electron 39.0.0
- React 18.2.0 + TypeScript 5.2.2
- Zustand 4.4.7 (state) + TanStack React Query 5.8.4
- Tailwind CSS 3.3.5 + Radix UI

## Specifications

Detailed design docs in `specs/`:
- `01-storage-format.md` - Complete JSON schema for all data structures
- `02-mcp-server.md` - All 30+ MCP tools with input/output schemas
- `03-electron-app.md` - UI/UX specification with keyboard shortcuts
