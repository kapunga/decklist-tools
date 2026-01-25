package mtgdeckbuilder.domain

import munit.FunSuite
import io.circe.syntax.*
import io.circe.parser.*

class ModelsSpec extends FunSuite {

  test("CardIdentifier serializes and deserializes correctly") {
    val card = CardIdentifier(
      scryfallId = Some("abc-123"),
      name = "Lightning Bolt",
      setCode = "m21",
      collectorNumber = "199"
    )

    val json = card.asJson
    val decoded = json.as[CardIdentifier]

    assertEquals(decoded, Right(card))
  }

  test("CardIdentifier without scryfallId serializes correctly") {
    val card = CardIdentifier(
      scryfallId = None,
      name = "Lightning Bolt",
      setCode = "m21",
      collectorNumber = "199"
    )

    val json = card.asJson
    val decoded = json.as[CardIdentifier]

    assertEquals(decoded, Right(card))
  }

  test("InclusionStatus enum serializes to lowercase strings") {
    assertEquals(InclusionStatus.Confirmed.asJson.noSpaces, "\"confirmed\"")
    assertEquals(InclusionStatus.Considering.asJson.noSpaces, "\"considering\"")
    assertEquals(InclusionStatus.Cut.asJson.noSpaces, "\"cut\"")
  }

  test("InclusionStatus deserializes from lowercase strings") {
    assertEquals(parse("\"confirmed\"").flatMap(_.as[InclusionStatus]), Right(InclusionStatus.Confirmed))
    assertEquals(parse("\"considering\"").flatMap(_.as[InclusionStatus]), Right(InclusionStatus.Considering))
    assertEquals(parse("\"cut\"").flatMap(_.as[InclusionStatus]), Right(InclusionStatus.Cut))
  }

  test("OwnershipStatus enum serializes correctly") {
    assertEquals(OwnershipStatus.Owned.asJson.noSpaces, "\"owned\"")
    assertEquals(OwnershipStatus.Pulled.asJson.noSpaces, "\"pulled\"")
    assertEquals(OwnershipStatus.NeedToBuy.asJson.noSpaces, "\"need_to_buy\"")
  }

  test("CardRole importance scores are correct") {
    assertEquals(CardRole.importanceScore(CardRole.Commander), 10)
    assertEquals(CardRole.importanceScore(CardRole.Core), 9)
    assertEquals(CardRole.importanceScore(CardRole.Land), 8)
    assertEquals(CardRole.importanceScore(CardRole.Enabler), 7)
    assertEquals(CardRole.importanceScore(CardRole.Support), 5)
    assertEquals(CardRole.importanceScore(CardRole.Flex), 3)
  }

  test("DeckFormat.forType returns correct defaults for Commander") {
    val format = DeckFormat.forType(FormatType.Commander)

    assertEquals(format.`type`, FormatType.Commander)
    assertEquals(format.deckSize, 100)
    assertEquals(format.sideboardSize, 0)
    assertEquals(format.cardLimit, 1)
    assert(format.unlimitedCards.contains("Relentless Rats"))
  }

  test("DeckFormat.forType returns correct defaults for Standard") {
    val format = DeckFormat.forType(FormatType.Standard)

    assertEquals(format.`type`, FormatType.Standard)
    assertEquals(format.deckSize, 60)
    assertEquals(format.sideboardSize, 15)
    assertEquals(format.cardLimit, 4)
    assert(format.unlimitedCards.isEmpty)
  }

  test("DeckFormat.forType returns correct defaults for Modern") {
    val format = DeckFormat.forType(FormatType.Modern)

    assertEquals(format.`type`, FormatType.Modern)
    assertEquals(format.deckSize, 60)
    assertEquals(format.sideboardSize, 15)
    assertEquals(format.cardLimit, 4)
  }

  test("DeckFormat.forType returns correct defaults for Kitchen Table") {
    val format = DeckFormat.forType(FormatType.KitchenTable)

    assertEquals(format.`type`, FormatType.KitchenTable)
    assertEquals(format.deckSize, 60)
    assertEquals(format.cardLimit, Int.MaxValue)
  }

  test("Deck.empty creates a valid empty deck") {
    val deck = Deck.empty("Test Deck", FormatType.Commander)

    assertEquals(deck.name, "Test Deck")
    assertEquals(deck.format.`type`, FormatType.Commander)
    assertEquals(deck.version, 1)
    assert(deck.cards.isEmpty)
    assert(deck.alternates.isEmpty)
    assert(deck.sideboard.isEmpty)
    assert(deck.id.nonEmpty)
    assert(deck.createdAt.nonEmpty)
  }

  test("Taxonomy.default contains expected global tags") {
    val taxonomy = Taxonomy.default

    val tagIds = taxonomy.globalTags.map(_.id)
    assert(tagIds.contains("removal"))
    assert(tagIds.contains("ramp"))
    assert(tagIds.contains("draw"))
    assert(tagIds.contains("tutor"))
    assert(tagIds.contains("tokens"))
    assert(tagIds.contains("theme"))
  }

  test("DeckCard serializes and deserializes correctly") {
    val card = DeckCard(
      card = CardIdentifier(Some("abc"), "Sol Ring", "c21", "123"),
      quantity = 1,
      inclusion = InclusionStatus.Confirmed,
      ownership = OwnershipStatus.Owned,
      role = CardRole.Core,
      isPinned = false,
      tags = List("ramp"),
      notes = Some("Auto-include"),
      addedAt = "2024-01-01T00:00:00Z",
      addedBy = AddedBy.User
    )

    val json = card.asJson
    val decoded = json.as[DeckCard]

    assertEquals(decoded, Right(card))
  }

  test("InterestList.empty creates valid empty list") {
    val list = InterestList.empty

    assertEquals(list.version, 1)
    assert(list.items.isEmpty)
    assert(list.updatedAt.nonEmpty)
  }
}
