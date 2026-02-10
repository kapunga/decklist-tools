# Project Rename Procedure

This document outlines all changes required to rename the project from `mtg-deckbuilder` to a new name.

## Placeholder

Replace `NEW_NAME` with the chosen project name (e.g., `manabase`, `spellbook`, `deckforge`).
Replace `new-name` with the kebab-case version.
Replace `NewName` with the PascalCase version.

---

## 1. Package Names

### Root package.json
```diff
- "name": "mtg-deckbuilder-tools",
+ "name": "new-name-tools",
```

Update filter references in scripts:
```diff
- "build:shared": "pnpm --filter @mtg-deckbuilder/shared build",
- "build:mcp": "pnpm --filter @mtg-deckbuilder/mcp-server build",
- "build:electron": "pnpm --filter @mtg-deckbuilder/electron-app build",
+ "build:shared": "pnpm --filter @new-name/shared build",
+ "build:mcp": "pnpm --filter @new-name/mcp-server build",
+ "build:electron": "pnpm --filter @new-name/electron-app build",
```

### packages/shared/package.json
```diff
- "name": "@mtg-deckbuilder/shared",
+ "name": "@new-name/shared",
```

### packages/mcp-server/package.json
```diff
- "name": "@mtg-deckbuilder/mcp-server",
+ "name": "@new-name/mcp-server",

  "dependencies": {
-   "@mtg-deckbuilder/shared": "workspace:*",
+   "@new-name/shared": "workspace:*",
  }
```

### packages/electron-app/package.json
```diff
- "name": "@mtg-deckbuilder/electron-app",
+ "name": "@new-name/electron-app",
- "description": "MTG Deckbuilder - Desktop app...",
+ "description": "NewName - Desktop app...",

  "dependencies": {
-   "@mtg-deckbuilder/shared": "workspace:*",
+   "@new-name/shared": "workspace:*",
  }

  "build": {
-   "appId": "com.mtgdeckbuilder.app",
-   "productName": "MTG Deckbuilder",
+   "appId": "com.new-name.app",
+   "productName": "NewName",
  }
```

---

## 2. Import Statements

Update all imports across mcp-server and electron-app:

```diff
- import { ... } from '@mtg-deckbuilder/shared'
+ import { ... } from '@new-name/shared'
```

**Files to update:**
- `packages/mcp-server/src/**/*.ts` (all files)
- `packages/electron-app/electron/*.ts`
- `packages/electron-app/src/lib/scryfall.ts`

Use find-and-replace: `@mtg-deckbuilder/` → `@new-name/`

---

## 3. Storage Directory

### packages/shared/src/storage/index.ts
```diff
  export function getStorageBasePath(): string {
    if (process.platform === 'darwin') {
-     return path.join(os.homedir(), 'Library', 'Application Support', 'mtg-deckbuilder')
+     return path.join(os.homedir(), 'Library', 'Application Support', 'new-name')
    } else if (process.platform === 'win32') {
-     return path.join(process.env.APPDATA || os.homedir(), 'mtg-deckbuilder')
+     return path.join(process.env.APPDATA || os.homedir(), 'new-name')
    } else {
-     return path.join(os.homedir(), '.config', 'mtg-deckbuilder')
+     return path.join(os.homedir(), '.config', 'new-name')
    }
  }
```

### Migration Helper

Add migration logic to detect and rename old directory:

```typescript
// Add to storage/index.ts

function migrateLegacyStorageDirectory(): void {
  const oldPath = getStorageBasePath().replace('new-name', 'mtg-deckbuilder')
  const newPath = getStorageBasePath()

  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    console.log(`Migrating storage from ${oldPath} to ${newPath}`)
    fs.renameSync(oldPath, newPath)
  }
}

// Call in Storage constructor before ensureDir calls
```

---

## 4. User-Agent Strings

### packages/shared/src/scryfall/index.ts
```diff
- const USER_AGENT = 'MTGDeckbuilder/1.0'
+ const USER_AGENT = 'NewName/1.0'
```

### packages/shared/src/scryfall/cachedClient.ts
Check for any User-Agent references.

---

## 5. Claude Desktop Integration

### packages/electron-app/electron/main.ts

Find the MCP server configuration key:
```diff
- "mtg-deckbuilder": {
+ "new-name": {
```

This affects how the MCP server appears in Claude Desktop's config.

---

## 6. Documentation

### Files to update:
- `CLAUDE.md` - Project name, all references
- `README.md` - Project name, installation instructions
- `specs/01-storage-format.md` - Storage path references
- `specs/02-mcp-server.md` - MCP server name
- `specs/03-electron-app.md` - App name references

### Changeset config
Update `.changeset/config.json` if it references the project name.

---

## 7. UI Strings

Search electron-app for hardcoded "MTG Deckbuilder" strings:
- Window titles
- About dialogs
- Settings page
- Any user-facing text

---

## 8. Verification Checklist

After renaming:

- [ ] `pnpm install` succeeds
- [ ] `pnpm build` succeeds
- [ ] `pnpm typecheck` succeeds
- [ ] `pnpm test` succeeds
- [ ] Electron app launches with new name
- [ ] Storage migration works (old data preserved)
- [ ] Claude Desktop integration works with new MCP server name
- [ ] No references to old name in codebase: `grep -r "mtg-deckbuilder" --include="*.ts" --include="*.json" --include="*.md"`

---

## 9. Optional: Repository Rename

If also renaming the repository/directory:
1. Rename on GitHub (if applicable)
2. Update git remotes
3. Update any CI/CD configurations
4. Update any external documentation or links

---

## Estimated Time

- Find-and-replace changes: 30 minutes
- Storage migration logic: 30 minutes
- Testing and verification: 1 hour
- Documentation updates: 30 minutes

**Total: ~2-3 hours**
