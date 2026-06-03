# The desktop app

If you have more than a handful of decks, keeping track of them by hand turns into a chore. You end up with a spreadsheet here, a stack of decklists in a notes app there, a vague memory of which cards you actually own, and a running list — somewhere — of what you still need to buy. None of it talks to each other, and every time you tweak a deck you have to update three places.

The desktop app is the answer to that chore. It's a place where all your decks live, where building and editing is visual instead of textual, and where the boring bookkeeping — counting your curve, tracking ownership, totaling up a shopping list — happens automatically. You browse a grid of decks, click in, move cards around, and the app keeps the math straight so you don't have to.

This page is a guided tour. It follows the path you'd actually take: start at the library, open a deck, add some cards, organize them, and then dig into the features that make the app more than a glorified text editor. If you'd rather have an AI assistant do the heavy lifting of building a deck for you, see [building with AI assistants](/usage-mcp) and the [bundled skills](/skills) — the two approaches share the same data, so anything you build one way shows up the other.

## The deck library

The first thing you see when you open the app is your deck library — the home base for everything you've built. It's a grid of tiles, one per deck, and each tile is meant to tell you what the deck *is* at a glance: the deck's name, how many cards are in it, and a row of color-identity pips showing which colors it plays. You shouldn't have to open a deck to remember whether it's the mono-red aggro pile or the five-color goodstuff brew.

Above the grid sits a large editorial masthead titled "Decks" with a tagline that shifts depending on which visual theme you've picked. It's mostly there to set the tone — the app leans into a newspaper-masthead look on purpose — but it also anchors the top actions. Two buttons matter here: **New Deck** starts an empty deck from scratch, and **Import Deck** brings in a list you already have from somewhere else. Import understands the common formats — Arena, Moxfield, Archidekt, MTGO, and plain text — so if you've got a decklist sitting in any of those, you can paste it in and skip the typing. More on importing further down.

<!-- SCREENSHOT: deck-library | The home screen showing the "Decks" masthead, the New Deck and Import Deck buttons, the search box and filter bar, and a grid of several deck tiles with color pips and card counts -->

Once you have a real collection of decks, finding the right one matters. There's a search box that matches on deck name and archetype, which handles the "where's that deck I called something clever" case. Below it is a filter bar for when you want to browse by shape rather than by name. You can filter by **format** — Commander, Standard, Pioneer, Modern, Legacy, Pauper, or Kitchen Table — using a dropdown. There's a **status toggle** that flips between All, Complete, and Incomplete, which is how you'd surface the decks that still need work. And there's a row of **color-identity buttons** — W, U, B, R, G, and C — that you tap to cycle through three states: require that color, exclude that color, or ignore it. Tap white once to see only decks that include white; tap it again to hide every deck with white in it; tap a third time to stop caring. Stacking these lets you ask things like "show me my incomplete Commander decks that play black but not blue" without scrolling.

## The left sidebar

Running down the left edge is a collapsible sidebar — the app's main navigation. Collapse it when you want maximum room for a deck; expand it when you're hopping between sections. It gives you three top-level destinations: **Decks** (the library you just saw), **Lists** (collections of cards that live outside any single deck), and **Buy List** (your aggregated shopping list across every deck). A gear icon opens [Settings](/settings), and the name of your current theme sits at the bottom so you always know which look you're in.

<!-- SCREENSHOT: sidebar | The expanded left sidebar showing the Decks, Lists, and Buy List navigation entries, the gear/Settings icon, and the current theme name at the bottom -->

## Opening a deck

Click any tile and you drop into the deck detail view — the workbench where you'll spend most of your time. The deck's name sits at the top and is editable in place, so renaming is a click away, and there's a back link to return to the library.

Underneath the name is a status line that's worth reading. It tells you the deck's format, whether it's complete, its color identity, and — importantly — any validation warnings. If you've got an illegal card for the format, or a Commander deck that breaks its own color identity, this is where the app flags it. There's also an **Export** button up here (it's a dropdown, since there are a few formats to choose from) for when you want to take the deck somewhere else.

The body of the view is organized into tabs, each one a different slice of the deck:

- **Mainboard** — the deck proper. For Commander decks, the commander is pinned at the top so it never gets lost in the list.
- **Sideboard** — your sideboard cards, for the formats that use one.
- **Maybeboard / Alternates** — cards you're considering but haven't committed to.
- **Stats** — the mana curve, role breakdown, and other analysis.
- **Notes** — strategy notes attached to the deck.
- **Pull List** — a checklist for physically gathering the deck from your collection.

<!-- SCREENSHOT: deck-detail-mainboard | The deck detail view with the editable name, status line showing format and color identity, the Export button, the row of tabs, and the Mainboard tab active with a commander pinned at the top -->

## Adding cards

At the top of the list tabs is a Quick Add search box, and this is how cards get into a deck. Start typing a card name and it autocompletes against Scryfall's full card database, so you don't have to remember exact spelling or have the card memorized. Pick the card you want and a small modal pops up to capture the details that matter: how many copies (**quantity**), which section it goes in — **mainboard**, **sideboard**, or **alternates** — and, optionally, which **roles** it fills. If the card has been printed more than once, you'll choose the printing here too, which matters when you care about a specific art or set.

<!-- SCREENSHOT: quick-add-modal | The Quick Add search box at the top of a list tab with an autocomplete dropdown of card matches, and the add-card modal open showing quantity, section selection (mainboard/sideboard/alternates), role checkboxes, and a printing picker -->

That printing picker is small but saves real frustration — there's nothing worse than building a pull list and then discovering the app picked a different edition than the one in your binder.

## Reading the card list

Each tab shows your cards as a list of rows, and the rows pack in a lot without being noisy. You get the card's name, its mana cost, the quantity, its color pips, an ownership status (**Unknown**, **Owned**, or **Need to Buy**), and any role badges it's been tagged with. Hover over a row and the card's image appears, which is the fastest way to remember what a card actually does without leaving the list.

By default the list groups cards by role — all your ramp together, all your removal together — which makes the shape of the deck legible at a glance. You can switch to grouping by card type if you'd rather see creatures, instants, and so on broken out that way.

When you need to make a sweeping change, you can select multiple cards and act on them in a batch. That's how you'd remove a stack of cards at once, mark a group as Owned after you've sleeved them up, or assign the same role to several cards in one go. And when the list gets long, the filters narrow it down: you can filter by color, by mana cost, by type, by role, and by ownership status. Filtering by ownership and Need to Buy, for instance, shows you exactly what's missing from one deck.

## Roles: tagging cards by their job

Here's a problem every deckbuilder hits. You stare at a list of 99 cards and you *think* it's a good Commander deck, but is it? Do you have enough ways to draw cards? Enough removal to deal with threats? Enough ramp to actually cast your expensive spells? Counting that by eye is tedious and error-prone, and it's the kind of thing you skip right up until the deck stalls out on turn four with a fistful of seven-drops and no way to play them.

Roles are how the app solves this. A role is a functional tag that describes what a card *does* rather than what it *is* — **Ramp**, **Removal**, **Card Draw**, **Win Condition**, and so on. You tag cards with the jobs they fill, and the app shows those tags as colored badges in the list. Because the list groups by role, you can suddenly *see* whether you have three card-draw spells or twelve. Filtering by role does the same thing from the other direction.

<!-- SCREENSHOT: role-badges | A card list grouped by role, with several role-group headers (Ramp, Removal, Card Draw) and cards under each showing their colored role badges -->

Roles come in two flavors. Some are **global** — they apply across all your decks, so "Removal" means the same thing everywhere — and some are **deck-specific**, for jobs that only make sense in one deck (a tribal payoff, say, that's irrelevant outside that build). If you want to edit the set of global roles — rename them, recolor them, add your own — that lives in [Settings](/settings).

## Commanders

For Commander decks there's an extra wrinkle: the commander defines the deck's color identity, and getting it wrong cascades into everything else. The app handles this directly. You can set a commander, or swap to a different one, by searching legendary creatures right from the deck.

The clever part is the swap. When you go to change commanders, the suggestions are filtered to creatures whose colors match what you've already got, so you don't accidentally pick a commander that orphans half your deck by narrowing the color identity out from under it. For partner commanders, an **Add Partner** option appears, and choosing a partner unions the two commanders' colors so your identity expands the way the rules intend.

## Stats and the mana curve

Foundation models are bad at arithmetic on word problems, and so are humans — I lose count of a deck's curve about as often as Claude does. Miscounting how many two-drops you have, or forgetting that all your removal sits at four mana and up, is exactly the kind of error that doesn't show up until you're losing a game. The Stats tab exists so neither of us has to do that math by hand.

The centerpiece is a **mana curve** bar chart: card counts by mana value, with each bar stacked by color so you can see the curve and the color distribution at once. You can filter it by type, color, or role to ask narrower questions — "what does my removal curve look like?" is one tap away.

<!-- SCREENSHOT: stats-mana-curve | The Stats tab showing the stacked-by-color mana curve bar chart, the role breakdown with counts per role, the "needs purchase" count, and the consistency-matrix heatmap below -->

Below the curve are a few more readouts. There's a **role breakdown** — a count of cards filling each role, which is the quantitative version of what the role badges show you. There's a count of **cards that still need purchasing**, pulled straight from ownership status. And there's a **consistency matrix**: a heatmap that lays roles against mana costs so you can spot the gaps. If your removal is all clustered at five-plus mana, the matrix makes that immediately visible — you'll see a row that's empty on the cheap end and dense on the expensive end, which is the signal to go find a cheap removal spell.

## Notes

Decks accumulate ideas that don't fit in the card list itself. There's a combo you need to remember the timing on, a synergy that isn't obvious from the cards alone, a reason you chose one card over a clearly better one. Six months later you open the deck and have no idea why you made half your choices.

The Notes tab is where that context lives. You attach strategy notes to a deck, and each note has a type — **Combo**, **Synergy**, **Theme**, **Strategy**, or **General** — so you can organize them by what they're about. A note has a title and a body, and you can optionally link specific cards to it. You can even attach a role to a note, which tags the linked cards with that role — handy when documenting a combo line also happens to be the moment you realize those three cards are your win condition.

## Card lists and the interest list

Not every card you care about belongs to a deck yet. You see a card spoiled from a new set and want to remember it. You're slowly accumulating pieces for a deck you haven't started. You scanned a box of cards and want a record of what's in it. None of that fits inside a specific deck, and stuffing it into one would just clutter the deck up.

That's what **lists** are for — collections of cards that live outside any deck. The app ships with a built-in **interest list**, which is the catch-all "remember this card" bucket. Beyond that you can create your own lists, and each one has a kind that signals its purpose: **Interest**, **Wishlist**, **Collection**, **Scan**, or **Custom**.

<!-- SCREENSHOT: card-lists-grid | The Lists section showing the built-in interest list alongside a few custom lists of different kinds (Wishlist, Collection), and one list opened to show its cards -->

Open a list and it behaves a lot like a deck's card tab. You add cards by search or by bulk import, and for each one you can set a quantity, pick a printing, and jot a note. One nice touch: a list can show you which of your decks a card might fit into, so when you're sorting through your interest list you can see at a glance that the card you flagged is a natural fit for that aristocrats deck you've been meaning to finish.

## Ownership and the pull list

Building a deck on screen is one thing; assembling the physical cards is another. If you've got a large collection, finding the actual cardboard for a 100-card deck means digging through boxes, and it's easy to lose your place or grab the wrong printing.

Every card carries an **ownership status** — Unknown, Owned, or Need to Buy — and the Pull List tab turns that into a working checklist for physically gathering the deck. It organizes the deck's cards **by Magic set**, which matches how most people store their collection, and gives you checkboxes and remaining counts so you can tick cards off as you pull them. There's also an **identify mode** that shows you the card image so you can confirm you've grabbed the right printing before you check it off — no more discovering mid-game that you sleeved up the wrong edition.

<!-- SCREENSHOT: pull-list | The Pull List tab with cards grouped by Magic set, checkboxes and remaining counts per row, and the identify mode showing a card image for printing confirmation -->

## The buy list

Ownership status pays off again at the app level. The **Buy List**, reachable from the sidebar, is a single view that aggregates every card you've marked **Need to Buy** across all your decks. Instead of opening each deck to figure out what you're short on, you get one consolidated shopping list.

It shows quantities and pulls **live prices from Scryfall**, so you've got a real sense of what the list will cost, and you can sort it to plan your purchases. Click any row and the app jumps you to the deck that card belongs to, so you can check the context before you commit to buying.

<!-- SCREENSHOT: buy-list | The Buy List view aggregating "Need to Buy" cards across decks, showing quantities, live Scryfall prices, and sortable columns -->

## Importing and exporting

You almost certainly have decks living somewhere else already — in Moxfield, in Arena, in a text file. Retyping them would be miserable, so the app reads the formats you're likely to have. When you import, you paste a list or upload a file and the app **auto-detects the format** (Arena, Moxfield, Archidekt, MTGO, or plain text), then shows you a preview with section counts so you can confirm it parsed the way you expected before you commit.

<!-- SCREENSHOT: import-dialog | The import dialog with a pasted decklist, the auto-detected format indicated, and a preview showing section counts (mainboard, sideboard) before confirming -->

Export runs the other direction, from the deck's **Export** dropdown. You can send a deck out as:

- **Moxfield** — with mainboard, sideboard, and maybeboard in separate boxes ready to paste.
- **Archidekt** — for importing into Archidekt.
- **Simple text** — a plain decklist for anywhere else.

Empty sections are hidden in the output, so you won't get a stray "Sideboard:" header on a deck that doesn't have one.

## Themes

The app ships with six visual themes — four light and two dark — and you pick one in [Settings](/settings). They're more than a color swap; the app commits to an editorial, newspaper-style look, which is where the deck-library masthead and the color-identity pips come from. Pick the one that suits how you like to read, and the masthead taglines and accents follow along.

If you're still getting set up, the [installation guide](/installation) walks through getting the app on your machine, and Settings is also where you connect the app to an AI assistant for the workflows described in [Building with AI assistants](/usage-mcp).

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+N | Create new deck |
| Esc | Go back to deck list |
