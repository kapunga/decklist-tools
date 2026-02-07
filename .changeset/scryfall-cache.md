---
"@mtg-deckbuilder/electron-app": minor
"@mtg-deckbuilder/shared": minor
---

Add Scryfall cache management for offline card data and images

- Cache index system enables lookup by card name or set+collector number
- Image caching stores card images locally for offline viewing
- New Cache Settings section in Settings page (under System tab)
- Display cache statistics (card data count/size, image count/size)
- "Load All Cards" button pre-caches all cards from all decks with progress bar
- Per-deck "Cache" dropdown to cache individual deck's cards and images
- Clear cache buttons for card data, images, or both
- Rebuild index button to regenerate cache lookups
- Custom `cached-image://` protocol serves cached images securely
- Content Security Policy added for production builds
- Settings page reorganized into tabs: Collection, Agent Integration, System
