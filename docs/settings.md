# Settings

Most people open Settings once, maybe to switch to a dark theme, and then never come back. That's by design — the defaults are tuned to be sensible, and you can build decks all day without touching anything here. But there are a handful of knobs that genuinely change how the app behaves, and a few that unlock the AI features entirely. This page walks through every section in order, explaining not just what each setting does but when you'd actually want to reach for it.

The Settings page is split into seven sections down the left-hand sidebar. I'll take them one at a time.

## General

This is where you pick how the app looks. There's a helper line at the top of the pane that says it best: "Pick a visual theme. Light and dark themes are grouped — toggle the mode to see the other set." So the first thing to know is that there's a Light/Dark mode toggle, and flipping it doesn't switch your theme directly — it swaps which *set* of themes you're choosing from. The light themes and dark themes are separate collections, and you pick one theme out of whichever set is currently showing.

There are six themes in total, and they're more than recolored buttons — each one carries its own typographic voice, leaning into a particular Magic plane and a real-world print tradition. On the light side you've got:

- **Strixhaven** ("Editorial") — a warm off-white with muted terracotta accents, styled like a curator's catalog. This is the default light theme, and it's the most neutral of the bunch if you just want something clean.
- **Dominaria** ("Grimoire") — parchment and oxblood, meant to feel like a leather-bound spellbook.
- **Kaladesh** ("Drafting Table") — drafting cream and aged brass, an engineer's ledger.
- **Kamigawa** ("Woodblock") — washi cream with indigo and a vermillion seal.

And on the dark side:

- **Neo Kamigawa** ("Dataslate") — black with a blue cast and a hot accent color, like a terminal readout.
- **Innistrad** ("Candlelight") — candle-bone text on dried-ink black with garnet accents. This is the default dark theme.

Pick whichever suits the room you're in. Clicking a theme card applies it instantly — there's no save button to hunt for, and no restart. If you spend evenings deckbuilding, the dark themes are easier on the eyes; if you're working in a bright room or want something that reads like a reference book, the light set is the way to go.

<!-- SCREENSHOT: settings-themes | General pane showing the Light/Dark mode toggle and the grid of six theme cards, with the active theme highlighted -->

## Set Collection

This one exists to make card search actually useful for *your* collection rather than the whole of Magic. The helper text spells out the purpose: "Track which MTG sets you own cards from. Collection levels determine which card rarities are included in Scryfall filters." The reason that matters is that when you ask the app — or an AI assistant connected to it — to find cards, it can narrow the results to what you're likely to already own instead of suggesting a pile of cards you'd have to go buy. If you've got a shoebox full of a few sets and want decks you can build tonight, this is how you tell the app what's in the box.

You add sets by searching for them and adding them one at a time. Each set you add gets a collection **Level**, which is a rough estimate of how deep your ownership of that set goes. The levels map to rarities like this:

- **Level 1** — "Few packs - commons and uncommons." You cracked a few packs; assume you've got the common stuff.
- **Level 2** — "Moderate - commons, uncommons, and rares." This is the default applied to every new set you add, and it's a reasonable middle ground.
- **Level 3** — "Good collection - all except mythics." You've got most of the set, just not the chase cards.
- **Level 4** — "Complete - all cards." You own everything from this set, mythics included.

The point of the levels is honesty over optimism. If you set everything to Level 4 you'll get suggestions full of expensive mythics you don't actually have, which defeats the purpose. Set each one to what's realistically true and the filters earn their keep.

Once you've added sets, they show up in a grouped table — Expansions, Core Sets, and so on — with each row showing the set's code, release year, name, its level (which you can change inline), and a delete button if you want to drop a set you no longer track.

<!-- SCREENSHOT: settings-set-collection | Set Collection pane with the search-to-add field and the grouped table of owned sets showing code, year, name, and a per-row Level dropdown -->

## Roles

Roles are how you tag a card by the *job* it does in a deck — Ramp, Removal, Card Draw, Win Condition, that kind of thing — so that later you can look at a deck and immediately see whether it's actually got enough interaction or whether you've accidentally built a pile of win-cons with no way to survive to play them. The helper line here reads: "Global roles are available across all decks. Hover for details, click to edit."

The word *global* is the key distinction. Roles defined on this page are available across every deck you build. There are also per-deck roles, but you manage those from inside a deck, not here — this section is strictly for the shared vocabulary you want available everywhere.

To add one, click **Add Role** and give it a name, an optional description, and a color picked from a palette. The color is what shows up as the little dot on the role pill, so it's worth choosing something distinct. Each existing role appears as a pill; click a pill to edit it, and hover over it to see usage stats — the tooltip tells you something like "Used by X cards in Y decks," which is a quick way to spot a role you defined once and never actually used. Deleting a role warns you if it's currently in use; if you delete it anyway, the cards that had it keep the underlying role assignment, but the role itself drops off the list. That's a deliberate safety valve so a delete doesn't silently scrub data off your cards.

<!-- SCREENSHOT: settings-roles | Roles pane showing the Add Role button and a row of colored role pills, with one pill's hover tooltip displaying its description and usage stats -->

## MCP Server

This section is the on switch for the AI features. The whole reason the app is interesting beyond a deck spreadsheet is that you can connect it to an AI assistant and then *talk* to your collection — "build me a mono-green ramp deck," "what's the mana curve on my Isshin deck," "which decks have Sol Ring in them" — and the assistant reads and edits your decks directly. None of that works until you flip the switch here.

There are three integration cards, one per assistant, and connecting is a single click each:

- **Claude Desktop** — click **Connect to Claude**. This writes the configuration Claude Desktop needs so that Claude can manage your decks. One thing to note: you may need to restart Claude Desktop for the change to take effect.
- **Claude Code** — click **Connect to Claude Code**.
- **Gemini CLI** — click **Connect to Gemini CLI**.

Each card shows whether it's currently connected or disconnected, and once connected it offers a **Disconnect** button if you want to turn it back off. You don't need to understand anything about how the plumbing works — connecting just tells that assistant where to find your decks. For what you can actually *do* once you're connected, see [Building with AI assistants](/usage-mcp).

<!-- SCREENSHOT: settings-mcp-connect | MCP Server pane showing the three integration cards (Claude Desktop, Claude Code, Gemini CLI) with their connect buttons and connection status -->

## Skills

Connecting an assistant in the previous section gives it the *ability* to touch your decks. Skills make it *good* at it. The helper text puts it precisely: "Install MTG Deckbuilder skills into your AI clients. Skills teach the assistant how to use the MCP server effectively — what queries to run, what tools to chain, and the vocabulary specific to deckbuilding." Without skills, the assistant can fumble its way through; with them, it knows the right moves — how to phrase a Scryfall search, when to chain a couple of tools together, the deckbuilding terms you'd actually use.

This section is a table where you install, update, or uninstall skills per client (Claude Code and Gemini CLI), and there are bulk "All" actions if you'd rather not click through them one by one. There's also an Export option — a **Save…** button — that writes the skills out as a SKILL.md bundle in a .zip file. That export exists mainly for Claude Desktop, which doesn't install skills the same way: for Claude Desktop, open the app's Capabilities settings and upload the zip there.

For a description of what each individual skill teaches the assistant, see the [Skills](/skills) page.

<!-- SCREENSHOT: settings-skills | Skills pane showing the per-client install/update/uninstall table with bulk All actions and the Save export button -->

## Data

This is your backup, restore, and move-to-a-new-computer tool. Everything you've built lives in files on your machine (more on that at the end of this page), and that means a backup is on you. This section is how you make one. The helper text notes an important caveat: "Export your entire collection to a backup file, or restore from a previous backup. Cache data and images are excluded — use 'Load All Cards' to rebuild those after importing." In other words the backup carries your *work* — decks, roles, settings, interest list, set collection — but not the downloaded card data and images, because those can always be re-fetched and would bloat the file enormously. You rebuild the cache afterward from the Cache section.

**Export Collection** writes a single JSON backup containing your decks, roles, settings, interest list, and set collection. Stash that somewhere safe — a cloud drive, a USB stick — and you've got a restore point or a way to carry your collection to another computer.

**Import Collection** is the other half, and it's the one to be careful with. Importing **replaces all of your existing data** — decks, roles, settings, interest list — with whatever's in the backup file, and it cannot be undone. If you've done any work since your last backup, that work is gone the moment you import. So before you import anything, export a fresh backup first. Used correctly this is exactly what you want for restoring after a wipe or setting up a second machine; used carelessly it'll happily erase a deck you forgot to save elsewhere.

<!-- SCREENSHOT: settings-data | Data pane showing the Export Collection button and the Import Collection button with its replace-all warning -->

## Cache

Card data and images don't live in the app — they come from Scryfall, the community card database. Fetching all of that over the network every single time you opened a deck would be slow and would fall over the moment you lost your connection. So the app keeps a local cache: once it's pulled a card, it hangs onto the data and the image so the next view is instant and works offline. This section is where you see what's cached and manage it.

At the top you get cache **statistics** — how many cards' worth of data you've cached and how much space it takes, the same for images, the totals, and the oldest and newest entries so you can see how stale things have gotten.

**Load All Cards** is the pre-fetch button. It goes through every card in your decks and pulls everything down ahead of time, so you're not waiting on the network later — handy right before a trip, or right after importing a backup since the import doesn't bring the cache along. You can choose **Card Data Only** or **Card Data + Images**, and it runs with a progress bar and a cancel button so you're never stuck waiting on a long pull.

Below that are a few settings, each with a real reason behind it:

- **Enable Image Caching** — on by default. This is what lets you view card images offline. Turn it off only if you're tight on disk space and don't care about seeing the art when you're disconnected.
- **Max Image Cache Size (MB)** — defaults to 500, and you can set it anywhere from 100 to 10000. The limit exists because images add up fast and you don't want the cache growing without bound. When you exceed the cap, the app drops the oldest images to make room, so raising it just means you keep more art around before that pruning kicks in.
- **Cache Expiry (Days)** — defaults to 7, range 1 to 365. Card data older than this gets re-fetched the next time it's needed. The reason it expires at all is that printings and prices drift over time; a shorter expiry keeps that information fresh at the cost of a few more network calls, a longer one trades freshness for fewer fetches.

Finally there are maintenance actions for when something seems off or you want to reclaim space. **Clear Card Data**, **Clear Images**, and **Clear All Cache** each wipe the corresponding part of the cache — nothing is lost permanently since it all re-fetches from Scryfall as needed, you'll just hit the network again the next time you view those cards. **Rebuild Index** repairs the cache's internal bookkeeping if the statistics ever look wrong or a cached card isn't being found; it doesn't re-download anything, it just fixes the metadata that tracks what's stored.

<!-- SCREENSHOT: settings-cache | Cache pane showing the cache statistics, the Load All Cards control with its data/images choice, the cache settings sliders, and the maintenance action buttons -->

## Where your data lives

One thing worth knowing across all of the above: everything stays on your computer. Your decks, your settings, and the cached card data all live in local files on your machine — nothing is uploaded to a server, and the app works perfectly well with no internet beyond the occasional Scryfall fetch to fill the cache. That's the upside, and it's also exactly why the [Data](#data) section matters: since there's no cloud copy quietly backing you up, exporting a backup now and then is the only thing standing between you and losing your work if something happens to the machine.
