package mtgdeckbuilder.views

import munit.FunSuite
import mtgdeckbuilder.domain.*

class DeckViewsSpec extends FunSuite {

  test("all views are registered") {
    val views = DeckViews.all
    val expectedIds = Set("full", "skeleton", "checklist", "curve", "buy-list", "by-role", "by-function")

    assertEquals(views.map(_.id).toSet, expectedIds)
  }

  test("get returns correct view by id") {
    assertEquals(DeckViews.get("full").map(_.id), Some("full"))
    assertEquals(DeckViews.get("skeleton").map(_.id), Some("skeleton"))
    assertEquals(DeckViews.get("nonexistent"), None)
  }

  test("FullView renders deck name and format") {
    val deck = createTestDeck()
    val rendered = DeckViews.FullView.render(deck, None, None)

    assert(rendered.contains("# Test Deck"))
    assert(rendered.contains("**Format:** Commander"))
  }

  test("FullView renders card count") {
    val deck = createTestDeck()
    val rendered = DeckViews.FullView.render(deck, None, None)

    assert(rendered.contains("**Cards:** 5/100"))
  }

  test("FullView renders archetype when present") {
    val deck = createTestDeck().copy(archetype = Some("Tokens"))
    val rendered = DeckViews.FullView.render(deck, None, None)

    assert(rendered.contains("**Archetype:** Tokens"))
  }

  test("FullView renders alternates section when present") {
    val deck = createTestDeck()
    val rendered = DeckViews.FullView.render(deck, None, None)

    assert(rendered.contains("## Alternates"))
    assert(rendered.contains("Fierce Guardianship"))
  }

  test("SkeletonView renders cards grouped by role") {
    val deck = createTestDeck()
    val rendered = DeckViews.SkeletonView.render(deck, None, None)

    assert(rendered.contains("## Commander"))
    assert(rendered.contains("## Core"))
    assert(rendered.contains("## Land"))
  }

  test("SkeletonView shows quantity for multiples") {
    val deck = createTestDeck()
    val rendered = DeckViews.SkeletonView.render(deck, None, None)

    // Sol Ring has quantity 1, so no prefix
    assert(rendered.contains("Sol Ring"))
    // Check format is minimal
    assert(!rendered.contains("**Cards:**"))
  }

  test("ChecklistView sorts by set and collector number") {
    val deck = createTestDeck()
    val rendered = DeckViews.ChecklistView.render(deck, None, None)

    assert(rendered.contains("## C21"))
    assert(rendered.contains("## NEO"))
    assert(rendered.contains("[ ]")) // Unchecked boxes
  }

  test("ChecklistView shows pulled status") {
    val deckWithPulled = createTestDeck().copy(
      cards = createTestDeck().cards.map { c =>
        if c.card.name == "Sol Ring" then c.copy(ownership = OwnershipStatus.Pulled)
        else c
      }
    )
    val rendered = DeckViews.ChecklistView.render(deckWithPulled, None, None)

    assert(rendered.contains("[x]")) // Checked box for pulled cards
  }

  test("BuyListView shows only cards needing purchase") {
    val deck = createTestDeck()
    val rendered = DeckViews.BuyListView.render(deck, None, None)

    assert(rendered.contains("Rhystic Study"))
    assert(!rendered.contains("Sol Ring")) // Sol Ring is owned
  }

  test("BuyListView shows total count") {
    val deck = createTestDeck()
    val rendered = DeckViews.BuyListView.render(deck, None, None)

    assert(rendered.contains("**Total:** 1 cards"))
  }

  test("BuyListView shows empty message when nothing to buy") {
    val deck = createTestDeck().copy(
      cards = createTestDeck().cards.map(_.copy(ownership = OwnershipStatus.Owned))
    )
    val rendered = DeckViews.BuyListView.render(deck, None, None)

    assert(rendered.contains("*No cards need to be purchased*"))
  }

  test("ByRoleView groups cards correctly") {
    val deck = createTestDeck()
    val rendered = DeckViews.ByRoleView.render(deck, None, None)

    assert(rendered.contains("## Commander"))
    assert(rendered.contains("## Core"))
    assert(rendered.contains("## Land"))
  }

  test("ByRoleView shows counts per role") {
    val deck = createTestDeck()
    val rendered = DeckViews.ByRoleView.render(deck, None, None)

    // Commander should have (1) after it
    assert(rendered.contains("## Commander (1)"))
  }

  test("ByFunctionView shows tip when no function tags") {
    val deckWithoutTags = createTestDeck().copy(
      cards = createTestDeck().cards.map(_.copy(tags = Nil))
    )
    val rendered = DeckViews.ByFunctionView.render(deckWithoutTags, None, None)

    assert(rendered.contains("*No cards tagged with function tags*"))
  }

  test("ByFunctionView groups by function tags") {
    val deck = createTestDeck()
    val rendered = DeckViews.ByFunctionView.render(deck, None, None)

    assert(rendered.contains("## Draw"))
    assert(rendered.contains("Rhystic Study"))
  }

  test("CurveView shows land vs non-land breakdown") {
    val deck = createTestDeck()
    val rendered = DeckViews.CurveView.render(deck, None, None)

    assert(rendered.contains("**Non-Land Cards:**"))
    assert(rendered.contains("**Lands:**"))
  }

  // ==================== Helper Methods ====================

  private def createTestDeck(): Deck = {
    Deck(
      id = "test-id",
      name = "Test Deck",
      format = DeckFormat.forType(FormatType.Commander),
      createdAt = "2024-01-01T00:00:00Z",
      updatedAt = "2024-01-01T00:00:00Z",
      version = 1,
      description = Some("A test deck for unit tests"),
      archetype = None,
      strategy = None,
      cards = List(
        DeckCard(
          card = CardIdentifier(Some("cmd1"), "Isshin, Two Heavens as One", "neo", "226"),
          quantity = 1,
          inclusion = InclusionStatus.Confirmed,
          ownership = OwnershipStatus.Owned,
          role = CardRole.Commander,
          isPinned = true,
          tags = Nil,
          notes = None,
          addedAt = "2024-01-01T00:00:00Z",
          addedBy = AddedBy.User
        ),
        DeckCard(
          card = CardIdentifier(Some("core1"), "Sol Ring", "c21", "123"),
          quantity = 1,
          inclusion = InclusionStatus.Confirmed,
          ownership = OwnershipStatus.Owned,
          role = CardRole.Core,
          isPinned = false,
          tags = List("ramp"),
          notes = None,
          addedAt = "2024-01-01T00:00:00Z",
          addedBy = AddedBy.User
        ),
        DeckCard(
          card = CardIdentifier(Some("draw1"), "Rhystic Study", "prm", "456"),
          quantity = 1,
          inclusion = InclusionStatus.Confirmed,
          ownership = OwnershipStatus.NeedToBuy,
          role = CardRole.Core,
          isPinned = false,
          tags = List("draw"),
          notes = None,
          addedAt = "2024-01-01T00:00:00Z",
          addedBy = AddedBy.User
        ),
        DeckCard(
          card = CardIdentifier(Some("land1"), "Command Tower", "c21", "350"),
          quantity = 1,
          inclusion = InclusionStatus.Confirmed,
          ownership = OwnershipStatus.Owned,
          role = CardRole.Land,
          isPinned = false,
          tags = Nil,
          notes = None,
          addedAt = "2024-01-01T00:00:00Z",
          addedBy = AddedBy.User
        ),
        DeckCard(
          card = CardIdentifier(Some("land2"), "Sacred Foundry", "rna", "254"),
          quantity = 1,
          inclusion = InclusionStatus.Confirmed,
          ownership = OwnershipStatus.Owned,
          role = CardRole.Land,
          isPinned = false,
          tags = Nil,
          notes = None,
          addedAt = "2024-01-01T00:00:00Z",
          addedBy = AddedBy.User
        )
      ),
      alternates = List(
        DeckCard(
          card = CardIdentifier(Some("alt1"), "Fierce Guardianship", "c20", "35"),
          quantity = 1,
          inclusion = InclusionStatus.Confirmed,
          ownership = OwnershipStatus.Owned,
          role = CardRole.Support,
          isPinned = false,
          tags = List("protection"),
          notes = None,
          addedAt = "2024-01-01T00:00:00Z",
          addedBy = AddedBy.User
        )
      ),
      sideboard = Nil,
      customTags = Nil,
      notes = Nil
    )
  }
}
