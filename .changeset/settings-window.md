---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Move Settings into its own native window, opened from the App menu (`Cmd+,`
on macOS, `Ctrl+,` elsewhere) or the existing gear icon in the sidebar.

- **Native chrome.** The Settings window uses default OS window framing —
  standard titlebar, traffic lights in their conventional position — rather
  than the main window's `hiddenInset` style, so it reads as a native
  Settings window.
- **Modeless.** The user can keep Settings open while interacting with the
  main window; both windows stay live and share state.
- **Persisted bounds.** The window's size and position are saved to
  `settings-window-state.json` in the storage dir on close and restored on
  next open.
- **Cross-window state-sync.** `storage:changed` and `cache:load-progress`
  IPC events now broadcast to all renderer windows (via `BrowserWindow.
  getAllWindows()`), so MCP-driven changes and cache-load progress reach
  Settings as well as the main window.
- **Single Vite entry, route-param dispatch.** `main.tsx` mounts
  `<SettingsWindow />` when `?view=settings` is on the URL, otherwise
  `<App />`. Both windows share the preload, query client, and Zustand
  store.
- **Sidebar layout.** Settings replaces the previous tab bar with a
  vertical sidebar listing six sections — General, Set Collection, Roles,
  Integrations, Data, Cache — and an active-section switch on the right.
  Each section is its own `*Pane` component under
  `src/components/settings/`. The active section is persisted to
  `settings-window-state.json` and restored on next open via a
  `?section=…` URL param.
- **Window size.** Default bumped from 900×700 to 1000×700 with a min of
  800×600 to give the right pane room next to the 220px sidebar.

Renderer cleanup along with the move:

- Drop `'settings'` from the `AppView` discriminated union; remove the
  inline `<SettingsPage />` branch in `App.tsx`.
- Sidebar gear icon now calls `window.electronAPI.openSettings()` instead
  of `setView('settings')`.
- `SettingsPage` drops its in-content back button and "Settings" h1 — the
  native titlebar replaces them.
