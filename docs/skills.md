# Skills

Connecting the MCP server hands your assistant a box of tools — it can now create a deck, add a card, run a Scryfall search, generate a pull list. But a box of tools isn't the same as knowing how to build a deck. Left to its own devices, a foundation model will sometimes reach for the wrong tool, run a clumsy search, or forget that "color identity" is the thing that matters for a Commander deck rather than the colors in a card's mana cost. It can fumble. The tools are there, but the Magic know-how isn't.

That's what skills are for. A skill is a small bundle of instructions that teaches the assistant the vocabulary and the moves of deckbuilding — what a mana curve is and how to read one, what roles mean and why you'd tag a card as removal, how color identity constrains a Commander pool, which search to run when you ask for "cheap ramp," and which tools to chain together to get from your question to a real answer. Without skills the assistant is improvising. With them it behaves like it actually knows the game, because it's working from the same playbook a Magic player would.

You don't have to use them — the tools work on their own — but installing the skills is the difference between an assistant that pokes around and one that gets it right the first time.

## Installing skills

You manage skills from the desktop app. Open [Settings](/settings) and go to the **Skills** section. You'll see every bundled skill listed with its current status.

For Claude Code, the Gemini CLI, or the Codex CLI, installing is one click per skill — or hit **Install all** to drop the whole set in at once. The app writes them to the right place (`~/.claude/skills`, `~/.gemini/skills`, or `~/.codex/skills`) so the assistant picks them up automatically.

<!-- SCREENSHOT: settings-skills-table | The Skills section in Settings showing the six bundled skills listed with install/update actions and per-target status -->

Claude Desktop is a little different, because it doesn't read skills off your filesystem. There you use the **Export** ("Save…") action to get a `.zip` of the skills, then upload that file in Claude Desktop's own Capabilities settings. It's an extra step, but a one-time one.

Skills can go **stale**. When I ship a newer version of a skill, the app notices that what you have installed is behind and shows an **Update** button next to it. Click it and you're current again. It's worth glancing at this section after you update the app, since improvements to the skills tend to land alongside new features.

<!-- SCREENSHOT: skill-install-action | A single skill row with the Install / Update / Export controls, including the "stale — Update available" state -->

## The skills

### Deck analysis

This is the skill for understanding a deck you already have. It teaches the assistant how to pull up a deck and show you every card with its full rules text, how to compute the mana curve (and to leave lands out when you ask, since they'd otherwise swamp the count), how to read the strategy notes attached to a deck, and how to turn a deck into a physical pull list for when you're assembling it from your collection. It also knows how to answer the cross-deck question — which of your decks are running a particular card.

> Show me my Atraxa deck

> What's the mana curve, excluding lands?

> What's the strategy behind this deck?

> Which of my decks use Sol Ring?

### Deck building

This is the workhorse. It teaches the assistant the full lifecycle of building and editing a deck: starting one from scratch, adding and removing cards, moving cards between the mainboard, sideboard, and alternates, tagging cards with roles so you can see at a glance what each one is doing, and managing your commander. When you're ready to play or share, it knows how to export the deck in the formats other tools expect — Moxfield, Archidekt, or plain text.

> Build a new Commander deck

> Add Lightning Bolt to my deck

> Swap my commander from Atraxa to Ezuri

> Export this deck for Moxfield

### Card lists

Not every card you care about belongs to a deck. This skill teaches the assistant to manage collections that live outside any single deck — the built-in interest list for cards you want to keep an eye on, plus any custom lists you create: a wishlist of cards to buy, a pile of cards you've scanned in, a brewing list for a deck idea that's still forming. It can attach notes to a card and track which decks a given card might eventually fit into.

> Save this card to my interest list

> Create a wishlist for cards I need to buy

> Add this to my Atraxa brewing pile

### Card lookup

This skill is about finding the right card. It teaches the assistant to search by name when you know what you want, by attributes when you're narrowing a field (color, type, mana cost, format legality), or by what a card actually *does* mechanically when you're describing an effect rather than a name. It can also restrict a search to cards you already own, which is the difference between a wishlist and a list you can build from tonight.

> Find me Boros artifact removal

> Show me cheap green ramp

> Find creature tutors in Esper legal in Commander

> What removal do I already own?

### Scryfall search

Scryfall has a rich search grammar, and most of its power is locked behind knowing the syntax. This skill teaches the assistant that grammar so it can translate a plain-English request into a precise, multi-filter query — combining colors, types, mana value, oracle text, and format legality into a single search instead of guessing. The result is searches that hit what you meant the first time.

> Find mono-red one- and two-drops in Standard

> Equipment that grants haste

> Blue counterspells that cost 2 or less

### Scryfall tags

Searching by oracle text is brittle — ask for "removal" and a keyword search misses every card that destroys a creature without using the word "removal." Scryfall's community has tagged thousands of cards by what they actually *do*, and this skill teaches the assistant that tag vocabulary. So when you ask for removal, or ramp, or reanimation, you get every card that performs that role regardless of how its rules text happens to be worded.

> Find all creature removal

> Show me cards tagged as ramp

> Find reanimation spells

> What token producers exist in white?

## How they fit together

The first four skills are specific to this app — they teach the assistant how to drive the deck and list tools you've connected. The two Scryfall skills are different: they're general card-search know-how, not tied to any one tool, and they make every search the assistant runs sharper. The deck and list skills tell it *what* to do with your collection; the Scryfall skills make it good at *finding* the cards in the first place.

For the bigger picture of building decks in conversation with an AI assistant — how the MCP server fits in and what a full session looks like — see the [Building with AI assistants guide](/usage-mcp).
