# MTG Deckbuilder Electron App Specification

## Overview

Build a desktop Electron app for browsing and managing MTG decks. The app shares the same JSON storage format as the MCP server, enabling both to work with the same data.

## Technology Stack

- **Framework:** Electron
- **Frontend:** React with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** Zustand
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
- Format badge
- **Commander display** (for Commander format): Card name(s) with thumbnail, clickable to view/change
- Archetype (editable)
- Card count with progress bar (e.g., "87/100")
- Validation status indicator (valid/warnings/errors)

#### Tab: Cards
Display deck cards with multiple view modes:

**Grid View:** Card images in a grid, grouped by card type
**List View:** Table with columns: Name, Set, CMC, Type, Roles (as pills), Status, Ownership

**Default Sorting:** By card type, then alphabetically by name within type

**Card Type Sort Order:**
1. Creature
2. Planeswalker
3. Battle
4. Instant
5. Sorcery
6. Artifact
7. Enchantment
8. Land
9. Other

**Grouping Options:** By type (default), by role (cards appear in multiple groups), by CMC
**Sorting Options:** Name, CMC, type, set/collector number

**Card Row Display:**
- Card name
- Set/collector number
- Mana cost
- **Role pills**: Horizontal row of small colored badges showing assigned roles
  - Each pill shows role name
  - Hover tooltip shows role description
  - Click pill to remove role
  - Inline autocomplete to add roles when focused

**Card Actions:**
- Click card to see details popup
- Edit roles via inline autocomplete or detail panel
- Change status via context menu or detail panel
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
- Role distribution (how many cards have each role)

---

### 3. Role System UI

#### Role Pills Component (`RolePill.tsx`)
Small colored badge displaying a role:
- Background color from role definition (or default palette)
- Role name as text
- Hover shows tooltip with role description
- Optional X button for removal

```typescript
interface RolePillProps {
  roleId: string;
  roleName: string;
  description: string;
  color?: string;
  onRemove?: () => void;
  size?: "sm" | "md";
}
```

#### Role Autocomplete Component (`RoleAutocomplete.tsx`)
Inline autocomplete for adding roles to a card:
- Shows when user focuses the roles area of a card row
- Dropdown lists all available roles (global + deck custom)
- Filtered as user types
- Select to add role to card
- Option to create new custom role inline

```typescript
interface RoleAutocompleteProps {
  deckId: string;
  currentRoles: string[];
  onAddRole: (roleId: string) => void;
  onCreateCustomRole: (role: RoleDefinition) => void;
}
```

#### Role Management in Settings/Deck
- View all global roles
- View/edit deck custom roles
- Create new custom role with id, name, description, color

---

### 4. Commander Selection

#### Select Commander Modal (`SelectCommanderModal.tsx`)
Modal for selecting commanders when creating/editing a Commander deck:
- Search input with Scryfall autocomplete
- Filters to only legendary creatures and commander-eligible planeswalkers
- Support for Partner commanders (select up to 2)
- Support for Background (commander + background)
- Shows card preview on hover/select
- Required when creating a Commander format deck

```typescript
interface SelectCommanderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCommanders: CardIdentifier[];
  onConfirm: (commanders: CardIdentifier[]) => void;
}
```

#### Commander Display in Deck Header
- Shows commander card image thumbnail(s)
- Commander name(s) as text
- Click to open SelectCommanderModal
- Color identity derived and displayed

---

### 5. Card Entry

#### Quick Add Bar
Text input at top of deck view:
- Type card name, get autocomplete from Scryfall
- Press Enter to add to deck
- Support syntax: `4 Lightning Bolt` or `Lightning Bolt (M21) 199`
- Added cards default to `roles: []` (no auto-assignment)

#### Bulk Import
- Text area for pasting decklists
- Auto-detect format (Arena, Moxfield, MTGO, etc.)
- Preview parsed cards before importing
- **Commander detection:** For Commander format, detect and display found commander(s)
- **Error if no commander:** If Commander format and no commander detected, show error and prompt user to select
- Show unresolved cards for manual fixing

---

### 6. Card Search & Details

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
- **In this deck section:**
  - Quantity
  - Roles (as editable pills with autocomplete)
  - Status dropdown
  - Ownership dropdown
  - Notes field
- Add to deck / Remove from deck buttons

---

### 7. Pull Checklist Mode

Special view for pulling physical cards:
- Cards sorted by set, then collector number
- Checkbox next to each card
- Checking marks card as "pulled" (ownership: "pulled")
- Progress indicator (X of Y pulled)
- Print-friendly layout option

---

### 8. Interest List View

Display cards in the interest list:
- Card image and name
- Notes
- Potential decks (clickable links)
- Suggested roles (as pills)
- Source
- Actions: Add to deck, Remove from list

---

### 9. Buy List View

Aggregated view of all cards with `ownership: need_to_buy`:
- Grouped by deck or by card
- Total cards needed
- Price estimates (from Scryfall)
- Export for TCGPlayer mass entry

---

### 10. Import/Export

#### Import Dialog (`ImportDialog.tsx`, `ImportNewDeckDialog.tsx`)
- From file (drag & drop or file picker)
- From clipboard
- From URL (Moxfield, Archidekt links - future enhancement)

**Import Flow for Commander:**
1. Parse decklist
2. Detect commander(s) from import content
3. If Commander format and commanders detected, show them pre-populated
4. If Commander format and no commanders found, show error and require user selection
5. User confirms import

Supported formats: Arena, Moxfield CSV, Archidekt, MTGO, simple text

#### Export
- To clipboard
- To file
- Format selector
- Commander section included for Commander format exports

---

## Scryfall Integration

### Card Autocomplete
Use Scryfall autocomplete API: `GET /cards/autocomplete?q={query}`

### Card Search
Use Scryfall search: `GET /cards/search?q={query}`

### Card Lookup
- By name: `GET /cards/named?exact={name}` or `?fuzzy={name}`
- By set+number: `GET /cards/{set}/{number}`

### Commander Validation
When searching for commanders, filter results to only include:
- Cards with "Legendary" in type_line AND "Creature" in type_line
- OR cards with "can be your commander" in oracle_text
- OR Planeswalkers with specific commander eligibility

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

### Rate Limiting
- Debounce autocomplete requests (300ms)
- Queue image downloads
- Include User-Agent header

---

## UI Components (shadcn/ui)

Leverage these shadcn/ui components:
- **Card** - Deck tiles, card displays
- **Dialog** - Card details, commander selection, confirmations
- **Dropdown Menu** - Context menus, action menus
- **Input** - Text fields, search
- **Select** - Dropdowns for status, format, ownership
- **Tabs** - Deck detail navigation
- **Badge** - Format badges, role pills
- **Button** - Actions
- **Checkbox** - Pull checklist
- **Table** - List views
- **Tooltip** - Role descriptions, hover info
- **Command** - Quick search palette (Cmd+K), role autocomplete
- **Toast** - Notifications
- **Popover** - Role autocomplete dropdown

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
| Tab | Move between card row fields (including roles) |

---

## Settings

- **Image Cache:** Enable/disable, max size, clear cache
- **Default Format:** For new decks
- **Theme:** Light/dark mode
- **Scryfall:** Cache expiry days
- **Global Roles:** View and manage global role definitions

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
│   │   ├── CardItem.tsx           # Card row with role pills
│   │   ├── CardDetail.tsx
│   │   ├── RolePill.tsx           # Role pill component
│   │   ├── RoleAutocomplete.tsx   # Role autocomplete input
│   │   ├── SelectCommanderModal.tsx  # Commander selection
│   │   ├── CommanderDisplay.tsx   # Commander header display
│   │   ├── QuickAdd.tsx
│   │   ├── ImportDialog.tsx
│   │   ├── ImportNewDeckDialog.tsx
│   │   ├── ExportDialog.tsx
│   │   ├── PullChecklist.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useStore.ts      # Zustand store
│   │   ├── useDecks.ts
│   │   ├── useScryfall.ts
│   │   ├── useStorage.ts
│   │   └── useImportCards.ts
│   ├── lib/
│   │   ├── constants.ts     # Default roles, type sort order
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

## TypeScript Types

Key types (must match `01-storage-format.md`):

```typescript
interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  color?: string;
}

interface DeckCard {
  card: CardIdentifier;
  quantity: number;
  inclusion: InclusionStatus;
  ownership: OwnershipStatus;
  roles: string[];           // Role IDs
  isPinned: boolean;
  notes?: string;
  addedAt: string;
  addedBy: AddedBy;
}

interface Deck {
  id: string;
  name: string;
  format: DeckFormat;
  commanders: CardIdentifier[];  // Non-empty for Commander format
  // ... other fields
  cards: DeckCard[];
  alternates: DeckCard[];
  sideboard: DeckCard[];
  customRoles: RoleDefinition[];
  notes: DeckNote[];
}
```

---

## Constants (`lib/constants.ts`)

```typescript
// Card type sort order
export const CARD_TYPE_SORT_ORDER: Record<string, number> = {
  "Creature": 1,
  "Planeswalker": 2,
  "Battle": 3,
  "Instant": 4,
  "Sorcery": 5,
  "Artifact": 6,
  "Enchantment": 7,
  "Land": 8,
};

// Default global roles (loaded from taxonomy.json, but defaults here)
export const DEFAULT_GLOBAL_ROLES: RoleDefinition[] = [
  { id: "core", name: "Core", description: "Central to the deck's strategy" },
  { id: "enabler", name: "Enabler", description: "Makes the strategy function" },
  { id: "support", name: "Support", description: "Provides utility and backup" },
  { id: "flex", name: "Flex", description: "Swappable slot, not critical" },
  { id: "ramp", name: "Ramp", description: "Accelerates mana production" },
  { id: "card-advantage", name: "Card Advantage", description: "Draws cards or generates value" },
  { id: "filtering", name: "Filtering", description: "Improves card selection (scry, surveil, looting)" },
  { id: "removal", name: "Removal", description: "Removes permanents from the battlefield" },
  { id: "board-wipe", name: "Board Wipe", description: "Mass removal of permanents" },
  { id: "tutor", name: "Tutor", description: "Searches library for specific cards" },
  { id: "protection", name: "Protection", description: "Protects permanents or players" },
  { id: "recursion", name: "Recursion", description: "Returns cards from graveyard" },
  { id: "finisher", name: "Finisher", description: "Wins the game or deals major damage" },
  // ... additional roles from storage format spec
];

// Helper to extract primary card type from type_line
export function getPrimaryType(typeLine: string): string {
  const types = ["Creature", "Planeswalker", "Battle", "Instant", "Sorcery", "Artifact", "Enchantment", "Land"];
  for (const type of types) {
    if (typeLine.includes(type)) return type;
  }
  return "Other";
}
```

---

## Zustand Store Actions

Key store actions for role management:

```typescript
interface DeckStore {
  // ... existing state and actions
  
  // Commander management
  setCommanders: (deckId: string, commanders: CardIdentifier[]) => void;
  
  // Role management
  addRoleToCard: (deckId: string, cardName: string, roleId: string) => void;
  removeRoleFromCard: (deckId: string, cardName: string, roleId: string) => void;
  setCardRoles: (deckId: string, cardName: string, roles: string[]) => void;
  
  // Custom role management
  addCustomRole: (deckId: string, role: RoleDefinition) => void;
  updateCustomRole: (deckId: string, roleId: string, updates: Partial<RoleDefinition>) => void;
  removeCustomRole: (deckId: string, roleId: string) => void;
  
  // Helpers
  getAllRoles: (deckId: string) => RoleDefinition[];  // Global + deck custom
  getRoleById: (deckId: string, roleId: string) => RoleDefinition | undefined;
}
```

---

## Import/Export Format Details

### MTG Arena
```
Commander
1 Doc Aurlock, Grizzled Genius (OTJ) 205

Deck
4 Lightning Bolt (M21) 199
2 Monastery Swiftspear (BRO) 144

Sideboard
2 Pyroblast (EMA) 142
```
- "Commander" section for commanders
- "Deck" header optional for mainboard
- Blank line or "Sideboard" header separates sideboard

### Moxfield CSV
```csv
Count,Name,Edition,Collector Number,Foil,Condition,Language,Category
1,Doc Aurlock Grizzled Genius,otj,205,,,English,Commander
4,Lightning Bolt,m21,199,,,English,Mainboard
```
- Category column indicates Commander, Mainboard, Sideboard, Maybeboard

### Archidekt
```
1x Doc Aurlock, Grizzled Genius (OTJ) 205 [Commander]
1x Bone-Cairn Butcher (TDM) 173 [Creatures]
```
- `[Commander]` category identifies commanders
- Other `[Category]` values ignored (sorting now by type)

### MTGO
```
4 Lightning Bolt
4 Monastery Swiftspear

Sideboard
2 Pyroblast
```
- No set info, no commander section
- For Commander imports, look for legendary creatures

### Simple Text
```
Commander:
1 Doc Aurlock, Grizzled Genius

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
7. **No commander detected on import** - Show error, prompt user to select commander(s)
8. **Invalid commander** - Card is not a legal commander, show error

---

## Design Decisions for Implementation

1. **Role pill colors:** Use role's defined color if present, otherwise generate from a predefined palette based on role ID hash
2. **Type parsing:** Use `getPrimaryType()` helper to extract primary type from Scryfall `type_line`
3. **Role autocomplete UX:** Inline in card row - when roles section gains focus, show Command-style autocomplete dropdown
4. **Commander validation:** Warn but allow if card might not be valid commander (edge cases exist)
