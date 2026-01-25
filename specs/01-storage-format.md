# MTG Deckbuilder Storage Format Specification

## Overview

This document defines the JSON storage format shared between the Scala MCP server and the Electron frontend. Both applications read and write the same files.

## Storage Location

**macOS:** `~/Library/Application Support/mtg-deckbuilder/`

```
mtg-deckbuilder/
├── config.json              # Application configuration
├── taxonomy.json            # Global role definitions
├── decks/
│   └── {uuid}.json          # Individual deck files
├── interest-list.json       # Cards of interest
└── cache/
    └── scryfall/
        └── {scryfall-id}.json  # Cached Scryfall card data
```

---

## Card Identifier

The canonical way to identify a specific printing of a card.

```typescript
interface CardIdentifier {
  scryfallId?: string;        // Scryfall UUID - canonical if present
  name: string;               // Card name (e.g., "Lightning Bolt")
  setCode: string;            // Lowercase set code (e.g., "m21")
  collectorNumber: string;    // Collector number as string (e.g., "199", "12a")
}
```

**Resolution:** If `scryfallId` is missing, lookup by `setCode + collectorNumber` via Scryfall API and cache the result.

---

## Role Definition

Roles describe the function or strategic purpose a card serves in a deck. Cards can have multiple roles.

```typescript
interface RoleDefinition {
  id: string;                 // Lowercase, hyphenated (e.g., "card-advantage")
  name: string;               // Display name (e.g., "Card Advantage")
  description: string;        // What this role means
  color?: string;             // Hex color for UI display (e.g., "#3B82F6")
}
```

**Role Types:**
- **Global Roles**: Defined in `taxonomy.json`, available to all decks
- **Custom Roles**: Defined per-deck for deck-specific synergies (e.g., "casts-from-graveyard" for a Doc Aurlock deck)

---

## Card Status Enums

```typescript
// Whether the card is actually in the deck
type InclusionStatus = "confirmed" | "considering" | "cut";

// Physical ownership state  
type OwnershipStatus = "owned" | "pulled" | "need_to_buy";

// How the card was added
type AddedBy = "user" | "import";
```

---

## Deck Schema

```typescript
interface Deck {
  id: string;                          // UUID v4
  name: string;
  format: DeckFormat;
  commanders: CardIdentifier[];        // Non-empty for Commander format
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
  version: number;                     // Increment on save
  
  description?: string;                // Markdown
  archetype?: string;                  // e.g., "Tokens", "Aristocrats"
  strategy?: DeckStrategy;
  
  cards: DeckCard[];                   // Mainboard + considering
  alternates: DeckCard[];              // Swap-in candidates (Commander "sideboard")
  sideboard: DeckCard[];               // Actual sideboard (Standard/Modern)
  
  customRoles: RoleDefinition[];       // Deck-specific role definitions
  notes: DeckNote[];
  
  artCardScryfallId?: string;          // Card art to use for deck display
  colorIdentity?: string[];            // Deck's color identity
}

interface DeckFormat {
  type: "commander" | "standard" | "modern" | "kitchen_table";
  deckSize: number;                    // 100 for Commander, 60 for others
  sideboardSize: number;               // 0 for Commander, 15 for others
  cardLimit: number;                   // 1 for singleton, 4 for constructed
  unlimitedCards: string[];            // Cards exempt from limits
  specialLimitCards?: Record<string, number>;  // Cards with specific limits
}

interface DeckCard {
  card: CardIdentifier;
  quantity: number;
  inclusion: InclusionStatus;
  ownership: OwnershipStatus;
  roles: string[];                     // Role IDs (global or deck-scoped)
  isPinned: boolean;                   // "Never remove this"
  notes?: string;
  addedAt: string;
  addedBy: AddedBy;
}

interface DeckStrategy {
  description: string;                 // How the deck wins
  packages: SynergyPackage[];          // Groups of synergistic cards
  interactions: CardInteraction[];     // Specific combos/synergies
  requirements: DeckRequirements;
}

interface SynergyPackage {
  name: string;
  description?: string;
  cardNames: string[];                 // Card names in this package
  priority: number;                    // 1-10 importance
  roles: string[];                     // Associated role IDs
}

interface CardInteraction {
  cards: string[];                     // Card names involved
  description: string;
  category: "combo" | "synergy" | "nonbo";
}

interface DeckRequirements {
  minLands: number;
  maxLands: number;
  neededEffects: string[];             // e.g., ["removal", "card-advantage", "ramp"]
}

interface DeckNote {
  id: string;
  title: string;
  content: string;                     // Markdown
  createdAt: string;
  updatedAt: string;
}
```

---

## Global Taxonomy Schema

```typescript
interface Taxonomy {
  version: number;
  updatedAt: string;
  globalRoles: RoleDefinition[];
}
```

### Default Global Roles

**Strategic Importance:**
| ID | Name | Description |
|----|------|-------------|
| `core` | Core | Central to the deck's strategy, high priority to keep |
| `enabler` | Enabler | Makes the deck's strategy function |
| `support` | Support | Provides utility and backup to main strategy |
| `flex` | Flex | Swappable slot, not critical to strategy |

**Mana & Resources:**
| ID | Name | Description |
|----|------|-------------|
| `ramp` | Ramp | Accelerates mana production |
| `mana-fixing` | Mana Fixing | Helps produce colors of mana needed |

**Card Flow:**
| ID | Name | Description |
|----|------|-------------|
| `card-advantage` | Card Advantage | Draws cards or generates card value |
| `filtering` | Filtering | Improves card selection (scry, surveil, looting) |
| `tutor` | Tutor | Searches library for specific cards |

**Removal & Interaction:**
| ID | Name | Description |
|----|------|-------------|
| `removal` | Removal | Removes permanents from the battlefield |
| `removal-creature` | Creature Removal | Specifically removes creatures |
| `removal-artifact` | Artifact Removal | Specifically removes artifacts |
| `removal-enchantment` | Enchantment Removal | Specifically removes enchantments |
| `board-wipe` | Board Wipe | Mass removal of permanents |
| `counterspell` | Counterspell | Counters spells on the stack |

**Protection & Defense:**
| ID | Name | Description |
|----|------|-------------|
| `protection` | Protection | Protects permanents or players |
| `recursion` | Recursion | Returns cards from graveyard to hand or battlefield |

**Win Conditions:**
| ID | Name | Description |
|----|------|-------------|
| `finisher` | Finisher | Wins the game or deals major damage |
| `combo-piece` | Combo Piece | Part of a game-winning combination |

**Mechanical Themes:**
| ID | Name | Description |
|----|------|-------------|
| `tokens` | Tokens | Creates or synergizes with tokens |
| `blink` | Blink | Exiles and returns permanents for value |
| `sacrifice` | Sacrifice | Sacrifices permanents for value |
| `aristocrats` | Aristocrats | Benefits from creatures dying |
| `lifegain` | Lifegain | Gains life or triggers on lifegain |
| `counters` | +1/+1 Counters | Uses +1/+1 or other counters |
| `graveyard` | Graveyard | Interacts with the graveyard |
| `reanimator` | Reanimator | Returns creatures from graveyard to battlefield |

---

## Interest List Schema

```typescript
interface InterestList {
  version: number;
  updatedAt: string;
  items: InterestItem[];
}

interface InterestItem {
  id: string;
  card: CardIdentifier;
  notes?: string;
  potentialDecks?: string[];           // Deck IDs
  suggestedRoles?: string[];           // Role IDs this card might fill
  addedAt: string;
  source?: string;                     // e.g., "Cracking TDM packs"
}
```

---

## Config Schema

```typescript
interface Config {
  scryfallCacheExpiryDays: number;     // Default: 7
  theme: "light" | "dark";
  imageCacheEnabled: boolean;
  imageCacheMaxSize: number;           // In MB
  defaultFormat?: FormatType;
}
```

---

## Format Defaults

| Format | Deck Size | Sideboard | Card Limit | Commanders Required |
|--------|-----------|-----------|------------|---------------------|
| Commander | 100 | 0 | 1 (singleton) | Yes (1-2) |
| Standard | 60 | 15 | 4 | No |
| Modern | 60 | 15 | 4 | No |
| Kitchen Table | 60 | 15 | unlimited | No |

**Unlimited Cards:** Relentless Rats, Rat Colony, Shadowborn Apostle, Dragon's Approach, Persistent Petitioners, Slime Against Humanity. Basic lands always unlimited.

**Special Limit Cards:** Seven Dwarves (max 7), Nazgûl (max 9).

---

## Validation Rules

### Commander Format
1. Exactly 100 cards total (including commander(s))
2. `commanders` array must be non-empty (1-2 cards)
3. Singleton except basics and unlimited cards
4. All cards must be within commander's color identity

### Standard/Modern
1. Minimum 60 mainboard
2. Maximum 4 copies of any card (except basics)
3. Maximum 15 sideboard

### Kitchen Table
1. Minimum 60 cards
2. No other restrictions

---

## Commander Detection for Imports

When importing a decklist for Commander format, detect commanders by:

1. **Explicit markers:** Look for `[Commander]` category (Archidekt), "Commander" section header
2. **Sideboard section:** Many tools put commanders in sideboard—check for legendary creatures/planeswalkers
3. **Card properties:** Legendary creatures, or planeswalkers with "can be your commander" text
4. **Partner detection:** If a card has Partner, look for a second Partner card

If no commander can be detected for a Commander format import, the import should fail with a clear error message.

---

## Card Type Sorting Order

Cards in deck views should be sorted by type in this order:

1. Creature
2. Planeswalker
3. Battle
4. Instant
5. Sorcery
6. Artifact
7. Enchantment
8. Land
9. Other (Tribal, Conspiracy, etc.)

Within each type, sort alphabetically by card name.

---

## File Locking

Both MCP server and Electron may access files. Use:
- Optimistic concurrency via `version` field
- On write conflict (version mismatch), reload and present merge options

---

## Import/Export Formats

### Supported Formats

1. **MTG Arena:** `4 Lightning Bolt (M21) 199` with `Sideboard` section
2. **Moxfield:** CSV or text with Count, Name, Edition, Collector Number
3. **Archidekt:** `1x Card Name (SET) 123 [Category]`
4. **MTGO:** Simple `4 Card Name` with blank line before sideboard
5. **Simple Text:** `4 Card Name` with `Sideboard:` header

### Import Behavior

- Maybeboard entries map to `inclusion: "considering"`
- Commander section entries populate `commanders` array
- Cards default to `roles: []` (no auto-assignment)
- Cards default to `ownership: "need_to_buy"`
