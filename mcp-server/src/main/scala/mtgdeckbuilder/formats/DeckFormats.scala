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
  isCommander: Boolean,
  roles: List[String]
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
      var inCommander = false
      val cards = scala.collection.mutable.ListBuffer[ParsedCard]()

      for line <- lines if line.nonEmpty do
        line.toLowerCase match
          case "deck" => inCommander = false; inSideboard = false; inMaybeboard = false
          case "commander" => inCommander = true; inSideboard = false; inMaybeboard = false
          case "sideboard" => inSideboard = true; inMaybeboard = false; inCommander = false
          case "maybeboard" | "considering" => inMaybeboard = true; inSideboard = false; inCommander = false
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
                  isCommander = inCommander,
                  roles = Nil
                )
              case simplePattern(qty, name) =>
                cards += ParsedCard(
                  name = name.trim,
                  setCode = None,
                  collectorNumber = None,
                  quantity = qty.toInt,
                  isSideboard = inSideboard,
                  isMaybeboard = inMaybeboard,
                  isCommander = inCommander,
                  roles = Nil
                )
              case _ => // skip unrecognized lines

      Right(cards.toList)

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder

      // Commander section for Commander format
      if deck.format.`type` == FormatType.Commander && deck.commanders.nonEmpty then
        sb.append("Commander\n")
        deck.commanders.foreach { cmd =>
          sb.append(s"1 ${cmd.name} (${cmd.setCode.toUpperCase}) ${cmd.collectorNumber}\n")
        }
        sb.append("\n")

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

      // Find header to determine column indexes
      val headerOpt = lines.headOption.filter(_.toLowerCase.startsWith("count"))
      val dataLines = if headerOpt.isDefined then lines.tail else lines
      val cards = scala.collection.mutable.ListBuffer[ParsedCard]()

      // Try to find Category column for commander detection
      val headerLower = headerOpt.map(_.toLowerCase.split(",").map(_.trim.stripPrefix("\"").stripSuffix("\"")))
      val categoryIdx = headerLower.flatMap(h => h.zipWithIndex.find(_._1 == "category").map(_._2))

      for line <- dataLines if line.trim.nonEmpty do
        val parts = line.split(",").map(_.trim.stripPrefix("\"").stripSuffix("\""))
        if parts.length >= 4 then
          val qty = parts(0).toIntOption.getOrElse(1)
          val name = parts(1)
          val set = parts(2).toLowerCase
          val num = parts(3)
          val category = categoryIdx.flatMap(idx => parts.lift(idx))
          val isCommander = category.exists(_.toLowerCase == "commander")

          cards += ParsedCard(
            name = name,
            setCode = Some(set),
            collectorNumber = Some(num),
            quantity = qty,
            isSideboard = category.exists(_.toLowerCase == "sideboard"),
            isMaybeboard = category.exists(c => c.toLowerCase == "maybeboard" || c.toLowerCase == "considering"),
            isCommander = isCommander,
            roles = Nil
          )

      Right(cards.toList)

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder
      sb.append("Count,Name,Edition,Collector Number,Foil,Condition,Language,Category\n")

      // Commanders first
      if deck.commanders.nonEmpty then
        deck.commanders.foreach { cmd =>
          sb.append(s"1,${cmd.name},${cmd.setCode},${cmd.collectorNumber},,,English,Commander\n")
        }

      // Main deck
      deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).foreach { c =>
        sb.append(s"${c.quantity},${c.card.name},${c.card.setCode},${c.card.collectorNumber},,,English,Mainboard\n")
      }

      // Sideboard
      if includeSideboard then
        deck.sideboard.foreach { c =>
          sb.append(s"${c.quantity},${c.card.name},${c.card.setCode},${c.card.collectorNumber},,,English,Sideboard\n")
        }

      // Maybeboard
      if includeMaybeboard then
        val maybe = deck.cards.filter(_.inclusion == InclusionStatus.Considering) ++ deck.alternates
        maybe.foreach { c =>
          sb.append(s"${c.quantity},${c.card.name},${c.card.setCode},${c.card.collectorNumber},,,English,Maybeboard\n")
        }

      sb.toString

  // Archidekt format
  object ArchidektFormat extends DeckFormatParser:
    val id = "archidekt"
    val name = "Archidekt"
    val description = "Archidekt format: 1x Card Name (SET) 123 [Category]"

    // Pattern: 1x Card Name (SET) 123 [Category]
    private val cardPattern = """^(\d+)x?\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)\s*(?:\[([^\]]+)\])?.*$""".r

    def parse(text: String): Either[String, List[ParsedCard]] =
      val lines = text.linesIterator.map(_.trim).toList
      val cards = scala.collection.mutable.ListBuffer[ParsedCard]()

      for line <- lines if line.nonEmpty do
        line match
          case cardPattern(qty, name, set, num, category) =>
            val categoryLower = Option(category).map(_.toLowerCase).getOrElse("")
            val isCommander = categoryLower == "commander"
            val roles = categoryToRoles(Option(category).getOrElse(""))
            cards += ParsedCard(
              name = name.trim,
              setCode = Some(set.toLowerCase),
              collectorNumber = Some(num),
              quantity = qty.toInt,
              isSideboard = categoryLower == "sideboard",
              isMaybeboard = categoryLower == "maybeboard" || categoryLower == "considering",
              isCommander = isCommander,
              roles = roles
            )
          case _ => // skip

      Right(cards.toList)

    private def categoryToRoles(category: String): List[String] = category.toLowerCase match
      case "lands" | "land" => List("land")
      case "ramp" => List("ramp")
      case "draw" | "card draw" => List("card-draw")
      case "removal" => List("removal")
      case _ => Nil

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder

      def renderCard(c: DeckCard, category: String): Unit =
        sb.append(s"${c.quantity}x ${c.card.name} (${c.card.setCode.toUpperCase}) ${c.card.collectorNumber} [$category]\n")

      // Commanders first
      if deck.commanders.nonEmpty then
        deck.commanders.foreach { cmd =>
          sb.append(s"1x ${cmd.name} (${cmd.setCode.toUpperCase}) ${cmd.collectorNumber} [Commander]\n")
        }

      // Group cards by first role for category
      val confirmedCards = deck.cards.filter(_.inclusion == InclusionStatus.Confirmed)
      confirmedCards.foreach { c =>
        val category = c.roles.headOption match
          case Some("land") => "Lands"
          case Some("ramp") => "Ramp"
          case Some("card-draw") => "Card Draw"
          case Some("removal") => "Removal"
          case Some(role) => role.capitalize
          case None => "Other"
        renderCard(c, category)
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
                isCommander = false,
                roles = Nil
              )
            case _ => // skip

      Right(cards.toList)

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder

      // Commanders first for Commander format
      if deck.format.`type` == FormatType.Commander && deck.commanders.nonEmpty then
        deck.commanders.foreach { cmd =>
          sb.append(s"1 ${cmd.name}\n")
        }

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
      var inCommander = false
      val cards = scala.collection.mutable.ListBuffer[ParsedCard]()

      for line <- lines if line.nonEmpty do
        val lower = line.toLowerCase
        if lower.startsWith("sideboard") then
          inSideboard = true
          inCommander = false
        else if lower.startsWith("commander") then
          inCommander = true
          inSideboard = false
        else if lower == "deck" || lower == "mainboard" then
          inCommander = false
          inSideboard = false
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
                isCommander = inCommander,
                roles = Nil
              )
            case cardNoQtyPattern(name) if !name.toLowerCase.contains("deck") =>
              cards += ParsedCard(
                name = name.trim,
                setCode = None,
                collectorNumber = None,
                quantity = 1,
                isSideboard = inSideboard,
                isMaybeboard = false,
                isCommander = inCommander,
                roles = Nil
              )
            case _ => // skip

      Right(cards.toList)

    def render(deck: Deck, includeMaybeboard: Boolean, includeSideboard: Boolean): String =
      val sb = new StringBuilder

      // Commander section for Commander format
      if deck.format.`type` == FormatType.Commander && deck.commanders.nonEmpty then
        sb.append("Commander:\n")
        deck.commanders.foreach { cmd =>
          sb.append(s"1 ${cmd.name}\n")
        }
        sb.append("\nDeck:\n")

      deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).foreach { c =>
        sb.append(s"${c.quantity} ${c.card.name}\n")
      }

      if includeSideboard && deck.sideboard.nonEmpty then
        sb.append("\nSideboard:\n")
        deck.sideboard.foreach { c =>
          sb.append(s"${c.quantity} ${c.card.name}\n")
        }

      sb.toString
