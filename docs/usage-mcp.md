# Building with AI assistants

If you have a big Magic collection but not a lot of time, building decks can start to feel like a second job. Sorting through what you own, remembering which card does what, keeping a running count of how many cards are in the deck, eyeballing the mana curve — it adds up, and it's the kind of bookkeeping that gets in the way of the part that's actually fun. The whole point of this integration is to hand that work to an AI assistant so a less-engaged player can put together a fun deck quickly, in plain conversation.

Here's the nice part: your assistant reads and edits the exact same decks you see in the desktop app. Ask it to add a card or set a commander and the change shows up in the app immediately, because both sides are working off the same files on your machine. Nothing is uploaded anywhere, and there's no separate AI-side copy of your deck to keep in sync. You can have the app open while you talk to the assistant and watch the deck change underneath you.

<!-- SCREENSHOT: claude-deck-result | Desktop app deck open next to an assistant's reply, showing a card it just added appearing in the app -->

## Supported assistants

Three assistants connect with a single click from the desktop app today:

- **Claude Desktop** — Anthropic's desktop chat app. The most common pick if you want a point-and-talk, conversational workflow.
- **Claude Code** — Anthropic's command-line coding agent. Handy if you already live in a terminal.
- **Gemini CLI** — Google's command-line assistant.

Under the hood this isn't really tied to those three. The app exposes a standard MCP server paired with SKILL.md skill bundles, so any assistant that speaks MCP and can read SKILL.md bundles can drive it. What those three get is one-click setup — connection *and* skill installation handled for you inside the app. Anything else you'd wire up by hand using the same building blocks. As more assistants ship MCP support, the list of one-click options is the part most likely to grow.

## Getting connected

Turn the integration on from the desktop app under [Settings → MCP Server](/settings). Connect whichever assistant you use, and after you flip it on you may need to restart that assistant before it sees the new tools. The step-by-step lives on the [Settings](/settings) and [Installation](/installation) pages; this page is about what you can actually do once it's connected.

I'd strongly recommend installing the [Skills](/skills) while you're in there. The Skills teach the assistant the deckbuilding vocabulary and which tools to reach for in which situation — what a "role" is, how the interest list works, when to check what you own versus search all of Scryfall. Without them the assistant can still fumble its way through, but it's a lot more likely to flail, guess at how a tool works, or do more than you asked. With them it behaves like it already knows the app.

How you install the skills depends a little on the assistant, and it's the main place the three differ:

- For **Claude Code** and **Gemini CLI**, it's one click per skill — or "Install all" — in Settings → Skills. The app writes them where the assistant will find them.
- For **Claude Desktop**, use the Skills section's Export ("Save…") to get a `.zip`, then upload that in Claude Desktop's own Capabilities settings. It doesn't read skills off your filesystem the way the command-line tools do, so it's one extra step.

<!-- SCREENSHOT: settings-mcp-connect | Settings → MCP Server panel with the connect buttons for Claude Desktop / Claude Code / Gemini CLI -->

## What you can ask

You don't need to know any tool names or commands. You talk to the assistant the way you'd talk to a knowledgeable friend across the table, and it figures out the rest. Here are the kinds of things it handles well — the examples are phrased the way you'd actually say them.

### Finding cards

Behind the scenes the assistant searches Scryfall, the same card database most of us already use — so it can find cards by name, but also by what a card *does*. You don't have to remember the exact card; describe the effect.

> "Find me Boros artifact removal."
> "What's some cheap green ramp?"
> "Creature tutors in Esper that are legal in Commander."

It can also narrow a search down to cards you already own, which is the difference between a shopping list and a deck you can build tonight.

> "What removal do I already own?"

### Building and editing decks

Once you've found cards, the assistant can put a deck together and keep editing it as you go. Spinning up a new deck, dropping cards in, shuffling things between the mainboard and sideboard, cutting a card and leaving a note about why — it's all conversational.

> "Build a new Commander deck called Isshin Attacks."
> "Add Lightning Bolt."
> "Move these three to the sideboard."
> "Cut Cancel and note that it was too slow."

### Commanders

Commander decks live and die by the general, so setting and swapping commanders is its own thing the assistant understands directly.

> "Set my commander to Atraxa, Praetors' Voice."
> "Swap to Ezuri instead."
> "Add a partner."

### Roles and organization

You can tag cards by what they do — ramp, removal, card draw, win condition, whatever vocabulary you like — and then ask questions about the makeup of the deck. This is where the assistant earns its keep as an organizer.

> "Tag these four as ramp."
> "How much removal do I have in here?"

### Understanding a deck

The assistant can read a deck back to you, break down its mana curve, explain what the deck is trying to do, and look across all your decks at once.

> "Show me the deck."
> "What's the mana curve, excluding lands?"
> "What's the strategy here?"
> "Which of my decks run Sol Ring?"

A word on the curve and the card counts: the app does that math, not the assistant. Foundation models are genuinely bad at this kind of arithmetic — keeping an exact card count or tallying a mana curve across a hundred cards is exactly the sort of bookkeeping they tend to drift on. So that work is handled by tools that count for real, and the assistant reports what the tools return rather than guessing. When it tells you the deck is at 99 cards or that you're heavy on three-drops, that number is computed, not estimated.

<!-- SCREENSHOT: claude-deck-result | An assistant showing a deck's mana curve and card-type breakdown returned from the deck view tools -->

### Notes

When you work out something about a deck that you don't want to forget — a combo, a line of play, why a particular card is in there — you can have the assistant write it down with the deck.

> "Write a note explaining the Isshin plus Aurelia combo."

### Lists and the interest list

Not everything you find belongs in a deck yet. The assistant can stash cards in lists for later: a built-in interest list for things that caught your eye, a wishlist of cards you're hunting for, or a named brewing pile for a deck idea that isn't a real deck yet.

> "Save this card for later."
> "Start a wishlist called Pioneer staples."
> "Add this to my Atraxa brewing pile."

### Exporting and shopping

When a deck is ready to play or buy, the assistant can export it in the format you need. It handles Arena, Moxfield, Archidekt, MTGO, and plain text, and it can tell you what's missing from your collection so you know what to pick up.

> "Export this for Moxfield."
> "What do I still need to buy for this deck?"

## An example conversation

Here's roughly how it feels in practice — short, back and forth, nobody typing a single command. The labels below just say "Assistant," but this works the same whether you're talking to Claude or Gemini.

> **You:** I want to build a Commander deck around Isshin, going wide and hitting hard. Start me a deck and find a few combat payoffs in Mardu I already own.
>
> **Assistant:** Created a Commander deck called *Isshin Attacks*. Looking at your collection, you already own Hellrider, Mardu Ascendancy, and Cathars' Crusade, all of which reward attacking with a wide board. Want me to add any of these?
>
> **You:** Add all three, and set Isshin as the commander.
>
> **Assistant:** Done — Isshin, Two Heavens as One is your commander, and the three payoffs are in the mainboard. The deck's at 4 cards so far. Want me to look for some token makers to fill out the go-wide plan?
>
> **You:** Yeah. What's the curve looking like so far, and tag those three as combat payoffs while you're at it.
>
> **Assistant:** Tagged all three as *combat payoff*. The curve is still tiny at 4 cards, but it's sitting at three- and four-drops right now — we'll want some cheaper token makers to smooth it out. Here are a few you own…

The assistant did the searching, the tagging, and the counting; you made every real decision. That's the rhythm.

<!-- SCREENSHOT: claude-conversation-example | A real assistant thread building the Isshin deck, a couple of turns of back-and-forth -->

## What it's good (and not so good) at

It's genuinely good at the legwork. Searching Scryfall by effect, narrowing to what you own, organizing cards by role, counting cards and curves accurately because the tools do the math, and exporting to wherever you're playing or shopping — that's all stuff it handles faster and more reliably than doing it by hand.

What it isn't is a deck-tuning oracle. It can suggest cards and explain tradeoffs, but it doesn't know your meta, your playgroup, or what's fun for you, and it won't magically produce a tournament-winning list. Think of it as a fast, tireless assistant that fetches, organizes, and counts — you're still the one making the calls about what the deck should be. That's true whichever assistant you connect; the experience depends more on the model behind it than on which app you're typing into.

## For power users

If you want to see the exact set of tools the assistant has and what each one does, there's an **MCP tool reference** in the sidebar with the full surface. Most people never need it — the assistant picks the right tools on its own — but it's there if you're curious, or you're wiring up an assistant that isn't one of the one-click options.
