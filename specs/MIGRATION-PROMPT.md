# Migration Prompt: Roles Restructuring

## Context

This project has two applications sharing JSON storage:
1. **MCP Server** (Scala 3 with cats-effect) - `mcp-server/`
2. **Electron App** (React/TypeScript with Zustand) - `electron-app/`

The specifications in this directory have been updated to reflect a major restructuring of how card roles work. Your task is to update the implementation to match the specs.

**Important:** Destructive changes are fine. There is no data to migrate. You can delete existing stored data at `~/Library/Application Support/mtg-deckbuilder/` when done.

## Summary of Changes

1. **Roles replace tags** - The old `tags` system is removed. Cards now have `roles: string[]` (a list of role IDs).
2. **Cards can have multiple roles** - A card might be both "ramp" and "card-advantage".
3. **Commander is a deck property** - `commanders: CardIdentifier[]` on the Deck, not a role on a card. Required non-empty for Commander format.
4. **Sorting by card type** - Decklists sort by type (Creature, Instant, etc.) not by role.
5. **Role pills with tooltips** - UI shows roles as colored badges with hover descriptions.
6. **Role autocomplete** - Users can add roles to cards via inline autocomplete.

## Reference Documents

Read these specs before making changes:
- `specs/01-storage-format.md` - Data model, schemas, enums
- `specs/02-mcp-server.md` - MCP tools and server behavior
- `specs/03-electron-app.md` - UI components and interactions

## Execution Order

Complete these steps in order. Each step should compile/build before moving to the next.

### Phase 1: Scala Domain Model

**File:** `mcp-server/src/main/scala/mtgdeckbuilder/domain/Models.scala`

Changes:
- Remove `CardRole` opaque type and companion object
- Remove `TagCategory` enum
- Remove `GlobalTag` case class
- Remove `CustomTagDefinition` case class
- Add `RoleDefinition` case class:
  ```scala
  case class RoleDefinition(
    id: String,
    name: String,
    description: String,
    color: Option[String] = None
  )
  ```
- Update `DeckCard`: remove `role: CardRole` and `tags: List[String]`, add `roles: List[String]`
- Update `Deck`: remove `customTags`, add `commanders: List[CardIdentifier]` and `customRoles: List[RoleDefinition]`
- Update `Taxonomy`: replace `globalTags` with `globalRoles: List[RoleDefinition]`
- Add `Taxonomy.default` with the full role list from the storage spec

### Phase 2: Scala Storage Layer

**File:** `mcp-server/src/main/scala/mtgdeckbuilder/storage/Storage.scala`

Changes:
- Update Circe codecs for new schema
- Ensure `taxonomy.json` is regenerated with new structure on first run

### Phase 3: Scala Views

**File:** `mcp-server/src/main/scala/mtgdeckbuilder/views/DeckViews.scala`

Changes:
- Update all views to sort by card type instead of role
- Type order: Creature, Planeswalker, Battle, Instant, Sorcery, Artifact, Enchantment, Land, Other
- `by-role` view should show cards grouped by their roles (cards with multiple roles appear in multiple groups)
- Display roles as comma-separated list in text output

### Phase 4: Scala Import/Export

**File:** `mcp-server/src/main/scala/mtgdeckbuilder/formats/DeckFormats.scala`

Changes:
- Update import parsers to detect commanders:
  - Look for `[Commander]` category (Archidekt)
  - Look for "Commander" section header
  - Check sideboard for legendary creatures/planeswalkers
- Fail Commander format imports if no commander detected (return clear error)
- Update export to include Commander section for Commander format

### Phase 5: Scala MCP Tools

**File:** `mcp-server/src/main/scala/mtgdeckbuilder/tools/DeckTools.scala`

Tool changes:
| Tool | Change |
|------|--------|
| `create_deck` | Add optional `commanders` parameter. Required for Commander format. |
| `add_card` | Replace `role` param with `roles: string[]`. Remove `tags` param. |
| `update_card` | Replace `role`/`tag` params with `roles`, `add_roles`, `remove_roles` |
| `list_tags` | Rename to `list_roles`. Return global + deck-specific roles. |
| `add_custom_tag` | Rename to `add_custom_role`. Add role to deck's `customRoles`. |
| `add_global_tag` | Rename to `add_global_role`. Add role to taxonomy. |
| `set_commanders` | **New tool.** Set the commanders for a deck. |
| `import_deck` | Extract commander(s) from import. Fail for Commander format if none found. |
| `validate_deck` | Check that Commander decks have non-empty `commanders` list. |

**File:** `mcp-server/src/main/scala/mtgdeckbuilder/Main.scala`

- Update tool definitions to match renamed/modified tools
- Add `set_commanders` tool definition
- Update input schemas for changed parameters

### Phase 6: TypeScript Types

**File:** `electron-app/src/types/index.ts`

Changes:
- Remove `CardRole`, `BuiltInCardRole`, `BUILT_IN_ROLES`, `isBuiltInRole`, `roleImportance`, `getRoleImportance`
- Remove `TagCategory`, `GlobalTag`, `CustomTagDefinition`
- Add `RoleDefinition` interface
- Update `DeckCard`: remove `role` and `tags`, add `roles: string[]`
- Update `Deck`: remove `customTags`, add `commanders: CardIdentifier[]` and `customRoles: RoleDefinition[]`
- Update `Taxonomy`: replace `globalTags` with `globalRoles: RoleDefinition[]`
- Update `createEmptyDeck` to initialize `commanders: []` and `customRoles: []`

### Phase 7: TypeScript Constants

**File:** `electron-app/src/lib/constants.ts` (create if doesn't exist)

Add:
- `CARD_TYPE_SORT_ORDER: Record<string, number>` - Type sorting priority
- `DEFAULT_GLOBAL_ROLES: RoleDefinition[]` - Full role list from spec
- `getPrimaryType(typeLine: string): string` - Helper to extract type from Scryfall type_line

### Phase 8: Zustand Store

**File:** `electron-app/src/hooks/useStore.ts`

Changes:
- Update `createDeck` action to accept optional `commanders` parameter
- Add `setCommanders(deckId, commanders)` action
- Add `addRoleToCard(deckId, cardName, roleId)` action
- Add `removeRoleFromCard(deckId, cardName, roleId)` action
- Add `setCardRoles(deckId, cardName, roles)` action
- Add `addCustomRole(deckId, role)` action
- Add `updateCustomRole(deckId, roleId, updates)` action
- Add `removeCustomRole(deckId, roleId)` action
- Add `getAllRoles(deckId)` helper - returns global + deck custom roles
- Add `getRoleById(deckId, roleId)` helper
- Update any role-related computed values

### Phase 9: New Electron Components

**File:** `electron-app/src/components/RolePill.tsx` (new)

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

- Small colored badge showing role name
- Tooltip on hover showing description
- Optional X button for removal
- Use shadcn Badge component as base

**File:** `electron-app/src/components/RoleAutocomplete.tsx` (new)

```typescript
interface RoleAutocompleteProps {
  deckId: string;
  currentRoles: string[];
  onAddRole: (roleId: string) => void;
  onCreateCustomRole?: (role: RoleDefinition) => void;
}
```

- Inline autocomplete dropdown (use shadcn Command/Popover)
- Shows all available roles (global + deck custom)
- Filters as user types
- Option to create new custom role

**File:** `electron-app/src/components/SelectCommanderModal.tsx` (new or update existing)

```typescript
interface SelectCommanderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCommanders: CardIdentifier[];
  onConfirm: (commanders: CardIdentifier[]) => void;
}
```

- Modal for selecting commanders
- Scryfall search filtered to legendary creatures and commander-eligible planeswalkers
- Support Partner (select up to 2)
- Required when creating Commander format deck

**File:** `electron-app/src/components/CommanderDisplay.tsx` (new)

- Shows commander thumbnail(s) in deck header
- Commander name(s) as text
- Click to open SelectCommanderModal

### Phase 10: Update Electron Components

**File:** `electron-app/src/components/CardItem.tsx` (or card row component)

Changes:
- Remove single role display
- Add horizontal row of RolePill components for each role
- When roles area focused, show RoleAutocomplete
- Update to use type-based sorting

**File:** `electron-app/src/components/DeckDetail.tsx`

Changes:
- Add CommanderDisplay in header (for Commander format)
- Change default grouping from "by role" to "by type"
- Update grouping options

**File:** `electron-app/src/components/DeckListView.tsx`

Changes:
- Sort by card type (use CARD_TYPE_SORT_ORDER)
- Within type, sort alphabetically

**File:** `electron-app/src/components/CardGrid.tsx`

Changes:
- Group by card type by default
- Use getPrimaryType() helper

**File:** `electron-app/src/components/ImportDialog.tsx` / `ImportNewDeckDialog.tsx`

Changes:
- After parsing, detect commander candidates
- If Commander format and commanders detected, show them pre-populated
- If Commander format and no commanders found, show error and require user to select

### Phase 11: Import Hooks

**File:** `electron-app/src/hooks/useImportCards.ts`

Changes:
- Update to handle commander detection from parsed content
- Return detected commanders along with cards

**Files:** `electron-app/src/lib/formats/*.ts`

Changes:
- Update parsers to detect and return commanders
- Arena: Look for "Commander" section
- Moxfield: Look for Category="Commander"
- Archidekt: Look for `[Commander]` category
- MTGO/Simple: Look for legendary creatures in sideboard or by label

### Phase 12: Cleanup

After all changes compile and work:

```bash
rm -rf ~/Library/Application\ Support/mtg-deckbuilder/*
```

Rebuild and test both applications.

## Testing Checklist

- [ ] Can create a Commander deck with commander selection
- [ ] Can create a Standard deck (no commander required)
- [ ] Can add cards with multiple roles
- [ ] Role pills display on card rows with tooltips
- [ ] Can add/remove roles via autocomplete
- [ ] Deck view sorts by card type
- [ ] By-role grouping shows cards in multiple groups
- [ ] Import detects commanders from Arena/Moxfield/Archidekt formats
- [ ] Import fails gracefully if Commander format has no commander
- [ ] Export includes Commander section
- [ ] MCP tools work: create_deck, add_card, update_card, list_roles, set_commanders
- [ ] Validation checks for non-empty commanders in Commander format

## Design Decisions

When implementing, use these decisions:

1. **Role pill colors:** Use role's `color` field if present. Otherwise, generate a color from a predefined palette based on hash of role ID.

2. **Type parsing:** Extract primary type from Scryfall `type_line`:
   ```typescript
   function getPrimaryType(typeLine: string): string {
     const types = ["Creature", "Planeswalker", "Battle", "Instant", "Sorcery", "Artifact", "Enchantment", "Land"];
     for (const type of types) {
       if (typeLine.includes(type)) return type;
     }
     return "Other";
   }
   ```

3. **Commander validation:** Warn but allow if a card might not be a valid commander (edge cases exist). Check for:
   - "Legendary" + "Creature" in type_line
   - "can be your commander" in oracle_text
   - Planeswalkers with commander eligibility

4. **Role autocomplete UX:** Inline in card row. When the roles area gains focus, show a Command-style dropdown below/beside the pills.

## Notes

- The Scala MCP server uses cats-effect and Circe. Follow existing patterns in the codebase.
- The Electron app uses Zustand for state and shadcn/ui components. Follow existing patterns.
- Both apps share the same JSON storage format - changes must be synchronized.
