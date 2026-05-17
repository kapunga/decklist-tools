import type { CSSProperties } from 'react'

// Shared Broadsheet masthead style tokens. Components in DeckDetail and its
// trigger affordances (ExportDropdown, ImportDialog) share these so the
// editorial grammar stays consistent without each call site re-declaring it.

// Caption-tag style — small-caps action label rendered as a bare <button>,
// used for the masthead's secondary actions (Cache, Roles, Export).
export const captionTagStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--muted-foreground)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
}

// Filled primary action button — used for Import (the masthead's filled CTA).
// Theme-token-driven so it picks up each theme's --action-bg / --action-fg.
export const filledActionButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '9px 16px',
  backgroundColor: 'var(--action-bg)',
  color: 'var(--action-fg)',
  fontFamily: 'var(--font-body)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
}
