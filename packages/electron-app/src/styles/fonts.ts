/*
 * Font bundle — Google Fonts packaged via fontsource and served locally
 * by Vite, so the app works offline and on systems without the fonts installed.
 *
 * Variable packages cover all weights via a single WOFF2. Static packages
 * import only the specific weights the theme system references.
 */

// Variable fonts (full weight range in one file)
import '@fontsource-variable/cinzel'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/eb-garamond'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/inter'

// Static fonts — import specific weights used by themes
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/ibm-plex-serif/500.css'
import '@fontsource/ibm-plex-serif/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
