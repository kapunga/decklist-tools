package mtgdeckbuilder.formats

import mtgdeckbuilder.domain.*
import java.time.Instant
import java.util.UUID

// Parsed card from import
case class ParsedCard(
  name: String,
  setCode: Option[String],
  collectorNumber: Option[String],
  quantity: Int,
  isSideboard: Boolean,
  isMaybeboard: Boolean,
  role: Option[String],
  tags: List[String]
)

trait DeckFormatParser:
  def id: String
  def name: String
  def description: String
  def parse(text: String): Either[String, List[ParsedCard]]
  def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String

object DeckFormats:

  val all: List[DeckFormatParser] = List(
    ArenaFormat,
    MoxfieldFormat,
    ArchidektFormat,
    MtgoFormat,
    SimpleFormat
  )

  def get(formatId: String): Option[DeckFormatParser] =
    all.find(_.id == formatId)

  def detect(text: String): DeckFormatParser =
    val lines = text.linesIterator.map(_.trim).filter(_.nonEmpty).toList

    // Archidekt: has [Category] and ^tag^
    if lines.exists(l => l.contains("[") && l.contains("]") && l.contains("x ")) then
      ArchidektFormat
    // Moxfield CSV: starts with header
    else if lines.headOption.exists(_.toLowerCase.startsWith("count,")) then
      MoxfieldFormat
    // Arena: has set code in parentheses with collector number
    else if lines.exists(l => l.matches(""".*\([A-Za-z0-9]+\)\s+\d+.*""")) then
      ArenaFormat
    // MTGO or Simple: just quantity and name
    else
      SimpleFormat

  // MTG Arena format
  object ArenaFormat extends DeckFormatParser:
    val id = "arena"
    val name = "MTG Arena"
    val description = "MTG Arena format: 4 Lightning Bolt (M21) 199"

    // Pattern: 4 Lightning Bolt (M21) 199
    private val cardPattern = """^(\d+)\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)$""".r
    // Simple: 4 Lightning Bolt
    private val simplePattern = """^(\d+)\s+(.+)$""".r

    def parse(text: String): Either[String, List[ParsedCard]] =
      val lines = text.linesIterator.map(_.trim).toList
      var inSideboard = false
      var inMaybeboard = false
      val cards = scala.collection.mutable.ListBuffer[ParsedCard]()

      for line <- lines if line.nonEmpty do
        line.toLowerCase match
          case "deck" | "commander" => // skip headers
          case "sideboard" => inSideboard = true; inMaybeboard = false
          case "maybeboard" | "considering" => inMaybeboard = true; inSideboard = false
          case _ =>
            line match
              case cardPattern(qty, name, set, num) =>
                cards += ParsedCard(
                  name = name.trim,
                  setCode = Some(set.toLowerCase),
                  collectorNumber = Some(num),
                  quantity = qty.toInt,
                  isSideboard = inSideboard,
                  isMaybeboard = inMaybeboard,
                  role = None,
                  tags = Nil
                )
              case simplePattern(qty, name) =>
                cards += ParsedCard(
                  name = name.trim,
                  setCode = None,
                  collectorNumber = None,
                  quantity = qty.toInt,
                  isSideboard = inSideboard,
                  isMaybeboard = inMaybeboard,
                  role = None,
                  tags = Nil
                )
              case _ => // skip unrecognized lines

      Right(cards.toList)

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder
      sb.append("Deck\n")

      deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).foreach { c =>
        sb.append(s"${c.quantity} ${c.card.name} (${c.card.setCode.toUpperCase}) ${c.card.collectorNumber}\n")
      }

      if includeSideboard && deck.sideboard.nonEmpty then
        sb.append("\nSideboard\n")
        deck.sideboard.foreach { c =>
          sb.append(s"${c.quantity} ${c.card.name} (${c.card.setCode.toUpperCase}) ${c.card.collectorNumber}\n")
        }

      if includeMaybeboard then
        val maybe = deck.cards.filter(_.inclusion == InclusionStatus.Considering) ++ deck.alternates
        if maybe.nonEmpty then
          sb.append("\nMaybeboard\n")
          maybe.foreach { c =>
            sb.append(s"${c.quantity} ${c.card.name} (${c.card.setCode.toUpperCase}) ${c.card.collectorNumber}\n")
          }

      sb.toString

  // Moxfield CSV format
  object MoxfieldFormat extends DeckFormatParser:
    val id = "moxfield"
    val name = "Moxfield CSV"
    val description = "Moxfield CSV format with headers"

    def parse(text: String): Either[String, List[ParsedCard]] =
      val lines = text.linesIterator.toList
      if lines.isEmpty then return Right(Nil)

      // Skip header
      val dataLines = if lines.head.toLowerCase.startsWith("count") then lines.tail else lines
      val cards = scala.collection.mutable.ListBuffer[ParsedCard]()

      for line <- dataLines if line.trim.nonEmpty do
        val parts = line.split(",").map(_.trim.stripPrefix("\"").stripSuffix("\""))
        if parts.length >= 4 then
          val qty = parts(0).toIntOption.getOrElse(1)
          val name = parts(1)
          val set = parts(2).toLowerCase
          val num = parts(3)
          cards += ParsedCard(
            name = name,
            setCode = Some(set),
            collectorNumber = Some(num),
            quantity = qty,
            isSideboard = false,
            isMaybeboard = false,
            role = None,
            tags = Nil
          )

      Right(cards.toList)

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder
      sb.append("Count,Name,Edition,Collector Number,Foil,Condition,Language\n")

      val allCards = deck.cards.filter(_.inclusion == InclusionStatus.Confirmed) ++
        (if includeSideboard then deck.sideboard else Nil) ++
        (if includeMaybeboard then deck.cards.filter(_.inclusion == InclusionStatus.Considering) ++ deck.alternates else Nil)

      allCards.foreach { c =>
        sb.append(s"${c.quantity},${c.card.name},${c.card.setCode},${c.card.collectorNumber},,,English\n")
      }

      sb.toString

  // Archidekt format
  object ArchidektFormat extends DeckFormatParser:
    val id = "archidekt"
    val name = "Archidekt"
    val description = "Archidekt format: 1x Card Name (SET) 123 [Category] ^tag^"

    // Pattern: 1x Card Name (SET) 123 [Category] ^tag^ ^tag2^
    private val cardPattern = """^(\d+)x?\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)\s*(?:\[([^\]]+)\])?\s*(.*)$""".r
    private val tagPattern = """\^([^^]+)\^""".r

    def parse(text: String): Either[String, List[ParsedCard]] =
      val lines = text.linesIterator.map(_.trim).toList
      val cards = scala.collection.mutable.ListBuffer[ParsedCard]()

      for line <- lines if line.nonEmpty do
        line match
          case cardPattern(qty, name, set, num, category, tagStr) =>
            val tags = tagPattern.findAllMatchIn(Option(tagStr).getOrElse("")).map(_.group(1)).toList
            val role = Option(category).flatMap(c => categoryToRole(c.trim))
            cards += ParsedCard(
              name = name.trim,
              setCode = Some(set.toLowerCase),
              collectorNumber = Some(num),
              quantity = qty.toInt,
              isSideboard = Option(category).exists(_.toLowerCase == "sideboard"),
              isMaybeboard = Option(category).exists(c => c.toLowerCase == "maybeboard" || c.toLowerCase == "considering"),
              role = role,
              tags = tags
            )
          case _ => // skip

      Right(cards.toList)

    private def categoryToRole(category: String): Option[String] = category.toLowerCase match
      case "commander" => Some("commander")
      case "lands" | "land" => Some("land")
      case _ => None

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder

      def renderCard(c: DeckCard, category: String): Unit =
        val tagStr = c.tags.map(t => s"^$t^").mkString(" ")
        sb.append(s"${c.quantity}x ${c.card.name} (${c.card.setCode.toUpperCase}) ${c.card.collectorNumber} [$category]")
        if tagStr.nonEmpty then sb.append(s" $tagStr")
        sb.append("\n")

      deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).groupBy(_.role).foreach { case (role, cards) =>
        val cat = role match
          case CardRole.Commander => "Commander"
          case CardRole.Land => "Lands"
          case CardRole.Core => "Core"
          case CardRole.Enabler => "Enablers"
          case CardRole.Support => "Support"
          case CardRole.Flex => "Flex"
        cards.foreach(c => renderCard(c, cat))
      }

      if includeSideboard && deck.sideboard.nonEmpty then
        deck.sideboard.foreach(c => renderCard(c, "Sideboard"))

      if includeMaybeboard then
        val maybe = deck.cards.filter(_.inclusion == InclusionStatus.Considering) ++ deck.alternates
        maybe.foreach(c => renderCard(c, "Maybeboard"))

      sb.toString

  // MTGO format
  object MtgoFormat extends DeckFormatParser:
    val id = "mtgo"
    val name = "MTGO"
    val description = "MTGO format: 4 Lightning Bolt"

    private val cardPattern = """^(\d+)\s+(.+)$""".r

    def parse(text: String): Either[String, List[ParsedCard]] =
      val lines = text.linesIterator.map(_.trim).toList
      var inSideboard = false
      var sawBlankLine = false
      val cards = scala.collection.mutable.ListBuffer[ParsedCard]()

      for line <- lines do
        if line.isEmpty then
          sawBlankLine = true
        else if line.toLowerCase == "sideboard" then
          inSideboard = true
        else
          // Blank line before this card means sideboard (MTGO style)
          if sawBlankLine && !inSideboard then inSideboard = true
          sawBlankLine = false

          line match
            case cardPattern(qty, name) =>
              cards += ParsedCard(
                name = name.trim,
                setCode = None,
                collectorNumber = None,
                quantity = qty.toInt,
                isSideboard = inSideboard,
                isMaybeboard = false,
                role = None,
                tags = Nil
              )
            case _ => // skip

      Right(cards.toList)

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder

      deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).foreach { c =>
        sb.append(s"${c.quantity} ${c.card.name}\n")
      }

      if includeSideboard && deck.sideboard.nonEmpty then
        sb.append("\nSideboard\n")
        deck.sideboard.foreach { c =>
          sb.append(s"${c.quantity} ${c.card.name}\n")
        }

      sb.toString

  // Simple text format
  object SimpleFormat extends DeckFormatParser:
    val id = "simple"
    val name = "Simple Text"
    val description = "Simple format: 4 Lightning Bolt"

    private val cardPattern = """^(\d+)\s+(.+)$""".r
    private val cardNoQtyPattern = """^([A-Za-z].+)$""".r

    def parse(text: String): Either[String, List[ParsedCard]] =
      val lines = text.linesIterator.map(_.trim).toList
      var inSideboard = false
      val cards = scala.collection.mutable.ListBuffer[ParsedCard]()

      for line <- lines if line.nonEmpty do
        if line.toLowerCase.startsWith("sideboard") then
          inSideboard = true
        else
          line match
            case cardPattern(qty, name) =>
              cards += ParsedCard(
                name = name.trim,
                setCode = None,
                collectorNumber = None,
                quantity = qty.toInt,
                isSideboard = inSideboard,
                isMaybeboard = false,
                role = None,
                tags = Nil
              )
            case cardNoQtyPattern(name) if !name.toLowerCase.contains("deck") =>
              cards += ParsedCard(
                name = name.trim,
                setCode = None,
                collectorNumber = None,
                quantity = 1,
                isSideboard = inSideboard,
                isMaybeboard = false,
                role = None,
                tags = Nil
              )
            case _ => // skip

      Right(cards.toList)

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder

      deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).foreach { c =>
        sb.append(s"${c.quantity} ${c.card.name}\n")
      }

      if includeSideboard && deck.sideboard.nonEmpty then
        sb.append("\nSideboard:\n")
        deck.sideboard.foreach { c =>
          sb.append(s"${c.quantity} ${c.card.name}\n")
        }

      sb.toString
