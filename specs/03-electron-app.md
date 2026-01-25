# MTG Deckbuilder Electron App Specification

## Overview

Build a desktop Electron app for browsing and managing MTG decks. The app shares the same JSON storage format as the MCP server, enabling both to work with the same data.

## Technology Stack

- **Framework:** Electron
- **Frontend:** React with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** Zustand or React Query (your choice)
- **Build Tool:** Vite

All code should be TypeScript - no plain JavaScript.

## Storage

Read and write the same JSON files defined in `01-storage-format.md`. The storage location is:
- **macOS:** `~/Library/Application Support/mtg-deckbuilder/`

---

## Core Features

### 1. Deck List View (Home)

Display all decks as cards/tiles showing:
- Deck name
- Format badge (Commander, Standard, Modern, Kitchen Table)
- Card count (e.g., "87/100")
- Archetype if set
- Last modified date
- Commander card image (for Commander decks)

**Actions:**
- Click to open deck
- Create new deck button
- Delete deck (with confirmation)
- Search/filter decks

---

### 2. Deck Detail View

#### Header
- Deck name (editable)
- Format
- Archetype (editable)
- Card count with progress bar (e.g., "87/100")
- Validation status indicator (valid/warnings/errors)

#### Tab: Cards
Display deck cards with multiple view modes:

**Grid View:** Card images in a grid, grouped by category
**List View:** Table with columns: Name, Set, CMC, Type, Role, Tags, Status
**Curve View:** Cards stacked by CMC (visual mana curve)

**Grouping Options:** By role, by type, by CMC, by tag
**Sorting Options:** Name, CMC, type, set/collector number

**Card Actions:**
- Click card to see details popup
- Change role, tags, status via context menu or detail panel
- Remove card
- Move to alternates/sideboard
- Mark as pulled/need to buy

#### Tab: Alternates
Same display as Cards tab but for the alternates list.

#### Tab: Sideboard
Same display as Cards tab but for sideboard (hidden for Commander).

#### Tab: Strategy
- Editable description (markdown with preview)
- Synergy packages display
- Key interactions list
- Deck requirements

#### Tab: Notes
- List of notes with titles
- Add/edit/delete notes
- Markdown editor with preview

#### Tab: Stats
- Mana curve chart
- Color distribution pie chart
- Type distribution
- Average CMC
- Tag distribution

---

### 3. Card Entry

#### Quick Add Bar
Text input at top of deck view:
- Type card name, get autocomplete from Scryfall
- Press Enter to add to deck
- Support syntax: `4 Lightning Bolt` or `Lightning Bolt (M21) 199`

#### Bulk Import
- Text area for pasting decklists
- Auto-detect format (Arena, Moxfield, MTGO, etc.)
- Preview parsed cards before importing
- Show unresolved cards for manual fixing

---

### 4. Card Search & Details

#### Search Panel
- Search cards via Scryfall API
- Filter by: color, type, CMC, set, format legality
- Display results as card images
- Click to add to current deck

#### Card Detail Popup/Panel
When clicking a card anywhere:
- Large card image
- Oracle text
- Type line, mana cost, P/T
- Set and collector number
- Price (from Scryfall)
- In this deck: quantity, role, tags, notes
- Add to deck / Remove from deck buttons

---

### 5. Pull Checklist Mode

Special view for pulling physical cards:
- Cards sorted by set, then collector number
- Checkbox next to each card
- Checking marks card as "pulled"
- Progress indicator (X of Y pulled)
- Print-friendly layout option

---

### 6. Interest List View

Display cards in the interest list:
- Card image and name
- Notes
- Potential decks (clickable links)
- Source
- Actions: Add to deck, Remove from list

---

### 7. Buy List View

Aggregated view of all cards with `ownership: need_to_buy`:
- Grouped by deck or by card
- Total cards needed
- Price estimates (from Scryfall)
- Export for TCGPlayer mass entry

---

### 8. Import/Export

#### Import
- From file (drag & drop or file picker)
- From clipboard
- From URL (Moxfield, Archidekt links - future enhancement)

Supported formats: Arena, Moxfield CSV, Archidekt, MTGO, simple text

#### Export
- To clipboard
- To file
- Format selector

---

## Scryfall Integration

### Card Autocomplete
Use Scryfall autocomplete API: `GET /cards/autocomplete?q={query}`

### Card Search
Use Scryfall search: `GET /cards/search?q={query}`

### Card Lookup
- By name: `GET /cards/named?exact={name}` or `?fuzzy={name}`
- By set+number: `GET /cards/{set}/{number}`

### Image Display
Use Scryfall image URLs from card data:
- `image_uris.small` (146×204) for grid thumbnails
- `image_uris.normal` (488×680) for detail views
- `image_uris.large` (672×936) for zoom/print

### Image Caching
Cache images locally to reduce API calls and enable offline browsing:
- Location: `~/Library/Application Support/mtg-deckbuilder/images/`
- Structure: `{scryfall-id}/normal.jpg`, `{scryfall-id}/small.jpg`
- Cache limit: configurable, default 500MB
- LRU eviction when limit reached

**Note:** Normal images are ~50-100KB each. A 100-card deck ≈ 7.5MB. 20 cached decks ≈ 150MB.

### Rate Limiting
- Debounce autocomplete requests (300ms)
- Queue image downloads
- Include User-Agent header

---

## UI Components (shadcn/ui)

Leverage these shadcn/ui components:
- **Card** - Deck tiles, card displays
- **Dialog** - Card details, confirmations
- **Dropdown Menu** - Context menus, action menus
- **Input** - Text fields, search
- **Select** - Dropdowns for role, status, format
- **Tabs** - Deck detail navigation
- **Badge** - Format badges, tag pills
- **Button** - Actions
- **Checkbox** - Pull checklist
- **Table** - List views
- **Tooltip** - Hover info
- **Command** - Quick search palette (Cmd+K)
- **Toast** - Notifications

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+N | New deck |
| Cmd+O | Open deck (shows deck list) |
| Cmd+K | Quick search (cards or decks) |
| Cmd+I | Import decklist |
| Cmd+E | Export current deck |
| Cmd+, | Settings |
| Esc | Close modal/panel |
| / | Focus search |

---

## Settings

- **Image Cache:** Enable/disable, max size, clear cache
- **Default Format:** For new decks
- **Theme:** Light/dark mode
- **Scryfall:** Cache expiry days

---

## File Watching

Watch the storage directory for changes:
- If a deck file changes on disk (MCP server modified it), reload
- Show notification: "Deck updated externally. Reload?"
- Handle conflicts gracefully

---

## Offline Support

The app should work offline with cached data:
- Decks stored locally
- Cached card data and images
- Queue Scryfall requests when offline
- Sync when back online

---

## Application Structure

```
electron-app/
├── package.json
├── electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Preload script
│   └── storage.ts           # File system operations
├── src/
│   ├── main.tsx             # React entry
│   ├── App.tsx
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── DeckList.tsx
│   │   ├── DeckDetail.tsx
│   │   ├── CardGrid.tsx
│   │   ├── CardListView.tsx
│   │   ├── CardDetail.tsx
│   │   ├── QuickAdd.tsx
│   │   ├── ImportDialog.tsx
│   │   ├── ExportDialog.tsx
│   │   ├── PullChecklist.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useDecks.ts
│   │   ├── useScryfall.ts
│   │   └── useStorage.ts
│   ├── lib/
│   │   ├── scryfall.ts      # Scryfall API client
│   │   ├── formats/         # Import/export format parsers
│   │   │   ├── arena.ts
│   │   │   ├── moxfield.ts
│   │   │   ├── archidekt.ts
│   │   │   └── index.ts
│   │   └── validation.ts
│   ├── types/
│   │   └── index.ts         # TypeScript types matching storage format
│   └── styles/
│       └── globals.css
├── tailwind.config.js
└── vite.config.ts
```

---

## Import/Export Format Details

### MTG Arena
```
Deck
4 Lightning Bolt (M21) 199
2 Monastery Swiftspear (BRO) 144

Sideboard
2 Pyroblast (EMA) 142
```
- "Deck" header optional
- Blank line or "Sideboard" header separates sideboard
- Set code in parentheses, collector number after

### Moxfield CSV
```csv
Count,Name,Edition,Collector Number,Foil,Condition,Language
4,Lightning Bolt,m21,199,,,English
```

### Archidekt
```
1x Isshin, Two Heavens as One (NEO) 226 [Commander]
1x Bone-Cairn Butcher (TDM) 173 [Creatures] ^theme^
```
- `[Category]` maps to role
- `^tag^` maps to tags
- `*F*` indicates foil

### MTGO
```
4 Lightning Bolt
4 Monastery Swiftspear

Sideboard
2 Pyroblast
```
- No set info
- Blank line or "Sideboard" header separates

### Simple Text
```
4 Lightning Bolt
4 Monastery Swiftspear

Sideboard:
2 Pyroblast
```

---

## Error States to Handle

1. **Card not found** - Show error, allow manual entry
2. **Network offline** - Use cached data, queue requests
3. **File locked** - Retry with backoff, show message
4. **Invalid deck** - Show validation errors, allow fixing
5. **Scryfall rate limited** - Queue and retry with delay
6. **Storage full** - Warn, suggest clearing image cache
