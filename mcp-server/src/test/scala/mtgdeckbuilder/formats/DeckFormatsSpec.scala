package mtgdeckbuilder.formats

import munit.FunSuite
import mtgdeckbuilder.domain.*

class DeckFormatsSpec extends FunSuite {

  // ==================== Arena Format Tests ====================

  test("ArenaFormat parses basic card line") {
    val input = "4 Lightning Bolt (M21) 199"
    val result = DeckFormats.ArenaFormat.parse(input)

    assertEquals(result.isRight, true)
    val cards = result.toOption.get
    assertEquals(cards.length, 1)
    assertEquals(cards.head.name, "Lightning Bolt")
    assertEquals(cards.head.quantity, 4)
    assertEquals(cards.head.setCode, Some("m21"))
    assertEquals(cards.head.collectorNumber, Some("199"))
    assertEquals(cards.head.isSideboard, false)
  }

  test("ArenaFormat parses deck with sideboard") {
    val input = """Deck
4 Lightning Bolt (M21) 199
4 Monastery Swiftspear (BRO) 144

Sideboard
2 Pyroblast (EMA) 142"""

    val result = DeckFormats.ArenaFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.length, 3)
    assertEquals(cards.filter(_.isSideboard).length, 1)
    assertEquals(cards.find(_.name == "Pyroblast").get.isSideboard, true)
  }

  test("ArenaFormat parses maybeboard") {
    val input = """Deck
4 Lightning Bolt (M21) 199

Maybeboard
2 Shock (M21) 100"""

    val result = DeckFormats.ArenaFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.length, 2)
    assertEquals(cards.find(_.name == "Shock").get.isMaybeboard, true)
  }

  test("ArenaFormat parses simple format without set info") {
    val input = "4 Lightning Bolt"
    val result = DeckFormats.ArenaFormat.parse(input)

    val cards = result.toOption.get
    assertEquals(cards.length, 1)
    assertEquals(cards.head.name, "Lightning Bolt")
    assertEquals(cards.head.setCode, None)
  }

  // ==================== Moxfield Format Tests ====================

  test("MoxfieldFormat parses CSV with header") {
    val input = """Count,Name,Edition,Collector Number,Foil,Condition,Language
4,Lightning Bolt,m21,199,,,English
2,Shock,m21,100,,,English"""

    val result = DeckFormats.MoxfieldFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.length, 2)
    assertEquals(cards.head.name, "Lightning Bolt")
    assertEquals(cards.head.quantity, 4)
    assertEquals(cards.head.setCode, Some("m21"))
  }

  test("MoxfieldFormat handles quoted fields") {
    val input = """Count,Name,Edition,Collector Number
1,"Fire // Ice",mh2,290"""

    val result = DeckFormats.MoxfieldFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.length, 1)
    assertEquals(cards.head.name, "Fire // Ice")
  }

  // ==================== MTGO Format Tests ====================

  test("MtgoFormat parses simple list") {
    val input = """4 Lightning Bolt
4 Monastery Swiftspear"""

    val result = DeckFormats.MtgoFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.length, 2)
    assert(cards.forall(!_.isSideboard))
  }

  test("MtgoFormat treats blank line as sideboard separator") {
    val input = """4 Lightning Bolt

2 Pyroblast"""

    val result = DeckFormats.MtgoFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.length, 2)
    assertEquals(cards.find(_.name == "Lightning Bolt").get.isSideboard, false)
    assertEquals(cards.find(_.name == "Pyroblast").get.isSideboard, true)
  }

  test("MtgoFormat handles explicit Sideboard header") {
    val input = """4 Lightning Bolt

Sideboard
2 Pyroblast"""

    val result = DeckFormats.MtgoFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.find(_.name == "Pyroblast").get.isSideboard, true)
  }

  // ==================== Simple Format Tests ====================

  test("SimpleFormat parses cards without quantity") {
    val input = """Lightning Bolt
Shock"""

    val result = DeckFormats.SimpleFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.length, 2)
    assert(cards.forall(_.quantity == 1))
  }

  test("SimpleFormat parses cards with quantity") {
    val input = """4 Lightning Bolt
2 Shock"""

    val result = DeckFormats.SimpleFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.length, 2)
    assertEquals(cards.find(_.name == "Lightning Bolt").get.quantity, 4)
  }

  test("SimpleFormat handles Sideboard: header") {
    val input = """4 Lightning Bolt

Sideboard:
2 Pyroblast"""

    val result = DeckFormats.SimpleFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.find(_.name == "Pyroblast").get.isSideboard, true)
  }

  // ==================== Archidekt Format Tests ====================

  test("ArchidektFormat parses card with category") {
    val input = "1x Isshin, Two Heavens as One (NEO) 226 [Commander]"

    val result = DeckFormats.ArchidektFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.length, 1)
    assertEquals(cards.head.name, "Isshin, Two Heavens as One")
    assertEquals(cards.head.quantity, 1)
    assertEquals(cards.head.role, Some("commander"))
  }

  test("ArchidektFormat parses tags") {
    val input = "1x Sol Ring (C21) 123 [Ramp] ^ramp^ ^core^"

    val result = DeckFormats.ArchidektFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.head.tags, List("ramp", "core"))
  }

  test("ArchidektFormat handles land category") {
    val input = "1x Command Tower (CMR) 350 [Lands]"

    val result = DeckFormats.ArchidektFormat.parse(input)
    val cards = result.toOption.get

    assertEquals(cards.head.role, Some("land"))
  }

  // ==================== Format Detection Tests ====================

  test("detect identifies Arena format") {
    val input = "4 Lightning Bolt (M21) 199"
    val detected = DeckFormats.detect(input)

    assertEquals(detected.id, "arena")
  }

  test("detect identifies Moxfield CSV format") {
    val input = "Count,Name,Edition,Collector Number\n4,Lightning Bolt,m21,199"
    val detected = DeckFormats.detect(input)

    assertEquals(detected.id, "moxfield")
  }

  test("detect identifies Archidekt format") {
    val input = "1x Sol Ring (C21) 123 [Ramp]"
    val detected = DeckFormats.detect(input)

    assertEquals(detected.id, "archidekt")
  }

  test("detect defaults to simple for plain lists") {
    val input = "4 Lightning Bolt\n4 Shock"
    val detected = DeckFormats.detect(input)

    assertEquals(detected.id, "simple")
  }

  // ==================== Render Tests ====================

  test("ArenaFormat renders deck correctly") {
    val deck = createTestDeck()
    val rendered = DeckFormats.ArenaFormat.render(deck, includeMaybeboard = false, includeSideboard = true)

    assert(rendered.contains("Deck"))
    assert(rendered.contains("4 Lightning Bolt (M21) 199"))
    assert(rendered.contains("Sideboard"))
    assert(rendered.contains("2 Pyroblast (EMA) 142"))
  }

  test("SimpleFormat renders deck correctly") {
    val deck = createTestDeck()
    val rendered = DeckFormats.SimpleFormat.render(deck, includeMaybeboard = false, includeSideboard = true)

    assert(rendered.contains("4 Lightning Bolt"))
    assert(rendered.contains("Sideboard:"))
    assert(rendered.contains("2 Pyroblast"))
  }

  // ==================== Helper Methods ====================

  private def createTestDeck(): Deck = {
    Deck(
      id = "test-id",
      name = "Test Deck",
      format = DeckFormat.forType(FormatType.Modern),
      createdAt = "2024-01-01T00:00:00Z",
      updatedAt = "2024-01-01T00:00:00Z",
      version = 1,
      description = None,
      archetype = None,
      strategy = None,
      cards = List(
        DeckCard(
          card = CardIdentifier(Some("abc"), "Lightning Bolt", "m21", "199"),
          quantity = 4,
          inclusion = InclusionStatus.Confirmed,
          ownership = OwnershipStatus.Owned,
          role = CardRole.Core,
          isPinned = false,
          tags = Nil,
          notes = None,
          addedAt = "2024-01-01T00:00:00Z",
          addedBy = AddedBy.User
        )
      ),
      alternates = Nil,
      sideboard = List(
        DeckCard(
          card = CardIdentifier(Some("def"), "Pyroblast", "ema", "142"),
          quantity = 2,
          inclusion = InclusionStatus.Confirmed,
          ownership = OwnershipStatus.Owned,
          role = CardRole.Support,
          isPinned = false,
          tags = Nil,
          notes = None,
          addedAt = "2024-01-01T00:00:00Z",
          addedBy = AddedBy.User
        )
      ),
      customTags = Nil,
      notes = Nil
    )
  }
}
