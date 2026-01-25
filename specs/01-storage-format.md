# MTG Deckbuilder Storage Format Specification

## Overview

This document defines the JSON storage format shared between the Scala MCP server and the Electron frontend. Both applications read and write the same files.

## Storage Location

**macOS:** `~/Library/Application Support/mtg-deckbuilder/`

```
mtg-deckbuilder/
├── config.json              # Application configuration
├── taxonomy.json            # Global tag taxonomy
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

## Card Status Enums

```typescript
// Whether the card is actually in the deck
type InclusionStatus = "confirmed" | "considering" | "cut";

// Physical ownership state  
type OwnershipStatus = "owned" | "pulled" | "need_to_buy";

// Strategic importance
type CardRole = "commander" | "core" | "enabler" | "support" | "flex" | "land";
```

**Role Importance Scores:** commander=10, core=9, land=8, enabler=7, support=5, flex=3

---

## Deck Schema

```typescript
interface Deck {
  id: string;                          // UUID v4
  name: string;
  format: DeckFormat;
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
  version: number;                     // Increment on save
  
  description?: string;                // Markdown
  archetype?: string;                  // e.g., "Tokens", "Aristocrats"
  strategy?: DeckStrategy;
  
  cards: DeckCard[];                   // Mainboard + considering
  alternates: DeckCard[];              // Swap-in candidates (Commander "sideboard")
  sideboard: DeckCard[];               // Actual sideboard (Standard/Modern)
  
  customTags: CustomTagDefinition[];   // Deck-scoped tags
  notes: DeckNote[];
}

interface DeckFormat {
  type: "commander" | "standard" | "modern" | "kitchen_table";
  deckSize: number;                    // 100 for Commander, 60 for others
  sideboardSize: number;               // 0 for Commander, 15 for others
  cardLimit: number;                   // 1 for singleton, 4 for constructed
  unlimitedCards: string[];            // Cards exempt from limits
}

interface DeckCard {
  card: CardIdentifier;
  quantity: number;
  inclusion: InclusionStatus;
  ownership: OwnershipStatus;
  role: CardRole;
  isPinned: boolean;                   // "Never remove this"
  tags: string[];                      // Tag IDs (global or deck-scoped)
  notes?: string;
  addedAt: string;
  addedBy: "user" | "import";
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
  tags: string[];
}

interface CardInteraction {
  cards: string[];                     // Card names involved
  description: string;
  category: "combo" | "synergy" | "nonbo";
}

interface DeckRequirements {
  minLands: number;
  maxLands: number;
  neededEffects: string[];             // e.g., ["removal", "draw", "ramp"]
}

interface CustomTagDefinition {
  id: string;
  name: string;
  description?: string;
  color?: string;                      // Hex color
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
  globalTags: GlobalTag[];
}

interface GlobalTag {
  id: string;                          // e.g., "removal"
  name: string;                        // e.g., "Removal"
  category: "function" | "strategy" | "theme" | "mechanic" | "meta";
  description: string;
  aliases?: string[];
}
```

### Default Global Tags

**Function:** removal, removal-creature, removal-artifact, removal-enchantment, board-wipe, ramp, draw, tutor, protection, recursion, finisher

**Mechanic:** tokens, blink, sacrifice, aristocrats, lifegain, counters, graveyard

**Theme:** theme (special - signals "central to deck identity, do not cut")

**Meta:** buy (alias for need_to_buy searches)

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
  addedAt: string;
  source?: string;                     // e.g., "Cracking TDM packs"
}
```

---

## Format Defaults

| Format | Deck Size | Sideboard | Card Limit |
|--------|-----------|-----------|------------|
| Commander | 100 | 0 | 1 (singleton) |
| Standard | 60 | 15 | 4 |
| Modern | 60 | 15 | 4 |
| Kitchen Table | 60 | 15 | unlimited |

**Unlimited Cards:** Relentless Rats, Rat Colony, Shadowborn Apostle, Seven Dwarves (max 7), Dragon's Approach, Persistent Petitioners, Cid Timeless Artificer. Basic lands always unlimited.

---

## Validation Rules

1. **Commander:** Exactly 100 cards, singleton except basics/unlimited, color identity must match commander
2. **Standard/Modern:** Minimum 60 mainboard, max 4 copies, max 15 sideboard
3. **Kitchen Table:** Minimum 60, no other restrictions

---

## File Locking

Both MCP server and Electron may access files. Use:
- Optimistic concurrency via `version` field
- On write conflict (version mismatch), reload and present merge options

---

## Import/Export Formats to Support

Define formats as data-driven parsers/renderers that are easy to add:

1. **MTG Arena:** `4 Lightning Bolt (M21) 199` with `Sideboard` section
2. **Moxfield CSV:** Count, Name, Edition, Collector Number columns
3. **Archidekt:** `1x Card Name (SET) 123 [Category] ^tag^`
4. **MTGO:** Simple `4 Card Name` with blank line before sideboard
5. **Simple Text:** `4 Card Name` with `Sideboard:` header

Each format should map maybeboard to `considering` status on import.
