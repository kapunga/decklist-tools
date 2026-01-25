package mtgdeckbuilder.domain

import io.circe.*
import io.circe.generic.semiauto.*
import java.time.Instant
import java.util.UUID

// Card Identifier
case class CardIdentifier(
  scryfallId: Option[String],
  name: String,
  setCode: String,
  collectorNumber: String
)

object CardIdentifier:
  given Codec[CardIdentifier] = deriveCodec

// Enums
enum InclusionStatus:
  case Confirmed, Considering, Cut

object InclusionStatus:
  given Encoder[InclusionStatus] = Encoder.encodeString.contramap {
    case Confirmed => "confirmed"
    case Considering => "considering"
    case Cut => "cut"
  }
  given Decoder[InclusionStatus] = Decoder.decodeString.emap {
    case "confirmed" => Right(Confirmed)
    case "considering" => Right(Considering)
    case "cut" => Right(Cut)
    case other => Left(s"Unknown inclusion status: $other")
  }

enum OwnershipStatus:
  case Owned, Pulled, NeedToBuy

object OwnershipStatus:
  given Encoder[OwnershipStatus] = Encoder.encodeString.contramap {
    case Owned => "owned"
    case Pulled => "pulled"
    case NeedToBuy => "need_to_buy"
  }
  given Decoder[OwnershipStatus] = Decoder.decodeString.emap {
    case "owned" => Right(Owned)
    case "pulled" => Right(Pulled)
    case "need_to_buy" => Right(NeedToBuy)
    case other => Left(s"Unknown ownership status: $other")
  }

// CardRole is now a string to support custom roles
// Built-in roles are defined as constants
opaque type CardRole = String

object CardRole:
  // Built-in role values
  val Commander: CardRole = "commander"
  val Core: CardRole = "core"
  val Enabler: CardRole = "enabler"
  val Support: CardRole = "support"
  val Flex: CardRole = "flex"
  val Land: CardRole = "land"

  // Built-in roles list for validation
  val builtInRoles: Set[CardRole] = Set(Commander, Core, Enabler, Support, Flex, Land)

  def apply(value: String): CardRole = value

  def isBuiltIn(role: CardRole): Boolean = builtInRoles.contains(role)

  def importanceScore(role: CardRole): Int = role match
    case Commander => 10
    case Core => 9
    case Land => 8
    case Enabler => 7
    case Support => 5
    case Flex => 3
    case _ => 1 // Custom roles have lowest default importance

  extension (role: CardRole)
    def value: String = role

  given Encoder[CardRole] = Encoder.encodeString.contramap(_.value)
  given Decoder[CardRole] = Decoder.decodeString.map(CardRole.apply)

enum AddedBy:
  case User, Import

object AddedBy:
  given Encoder[AddedBy] = Encoder.encodeString.contramap {
    case User => "user"
    case Import => "import"
  }
  given Decoder[AddedBy] = Decoder.decodeString.emap {
    case "user" => Right(User)
    case "import" => Right(Import)
    case other => Left(s"Unknown addedBy: $other")
  }

// Deck Format
enum FormatType:
  case Commander, Standard, Modern, KitchenTable

object FormatType:
  given Encoder[FormatType] = Encoder.encodeString.contramap {
    case Commander => "commander"
    case Standard => "standard"
    case Modern => "modern"
    case KitchenTable => "kitchen_table"
  }
  given Decoder[FormatType] = Decoder.decodeString.emap {
    case "commander" => Right(Commander)
    case "standard" => Right(Standard)
    case "modern" => Right(Modern)
    case "kitchen_table" => Right(KitchenTable)
    case other => Left(s"Unknown format type: $other")
  }

case class DeckFormat(
  `type`: FormatType,
  deckSize: Int,
  sideboardSize: Int,
  cardLimit: Int,
  unlimitedCards: List[String],
  specialLimitCards: Option[Map[String, Int]] = None
)

object DeckFormat:
  given Codec[DeckFormat] = deriveCodec

  def forType(ft: FormatType): DeckFormat = ft match
    case FormatType.Commander => DeckFormat(
      `type` = FormatType.Commander,
      deckSize = 100,
      sideboardSize = 0,
      cardLimit = 1,
      unlimitedCards = List(
        "Relentless Rats", "Rat Colony", "Shadowborn Apostle",
        "Dragon's Approach", "Persistent Petitioners", "Slime Against Humanity"
      ),
      specialLimitCards = Some(Map(
        "Seven Dwarves" -> 7,
        "Nazgûl" -> 9
      ))
    )
    case FormatType.Standard => DeckFormat(
      `type` = FormatType.Standard,
      deckSize = 60,
      sideboardSize = 15,
      cardLimit = 4,
      unlimitedCards = Nil,
      specialLimitCards = Some(Map("Seven Dwarves" -> 7))
    )
    case FormatType.Modern => DeckFormat(
      `type` = FormatType.Modern,
      deckSize = 60,
      sideboardSize = 15,
      cardLimit = 4,
      unlimitedCards = Nil,
      specialLimitCards = Some(Map(
        "Seven Dwarves" -> 7,
        "Nazgûl" -> 9
      ))
    )
    case FormatType.KitchenTable => DeckFormat(
      `type` = FormatType.KitchenTable,
      deckSize = 60,
      sideboardSize = 15,
      cardLimit = Int.MaxValue,
      unlimitedCards = Nil
    )

// Custom Role Definition for user-defined roles
case class CustomRoleDefinition(
  id: String,
  name: String,
  description: Option[String] = None,
  color: Option[String] = None,
  sortOrder: Int = 0
)

object CustomRoleDefinition:
  given Codec[CustomRoleDefinition] = deriveCodec

// Deck Card
case class DeckCard(
  card: CardIdentifier,
  quantity: Int,
  inclusion: InclusionStatus,
  ownership: OwnershipStatus,
  role: CardRole,
  isPinned: Boolean,
  tags: List[String],
  notes: Option[String],
  addedAt: String,
  addedBy: AddedBy
)

object DeckCard:
  given Codec[DeckCard] = deriveCodec

// Strategy types
case class SynergyPackage(
  name: String,
  description: Option[String],
  cardNames: List[String],
  priority: Int,
  tags: List[String]
)

object SynergyPackage:
  given Codec[SynergyPackage] = deriveCodec

enum InteractionCategory:
  case Combo, Synergy, Nonbo

object InteractionCategory:
  given Encoder[InteractionCategory] = Encoder.encodeString.contramap {
    case Combo => "combo"
    case Synergy => "synergy"
    case Nonbo => "nonbo"
  }
  given Decoder[InteractionCategory] = Decoder.decodeString.emap {
    case "combo" => Right(Combo)
    case "synergy" => Right(Synergy)
    case "nonbo" => Right(Nonbo)
    case other => Left(s"Unknown interaction category: $other")
  }

case class CardInteraction(
  cards: List[String],
  description: String,
  category: InteractionCategory
)

object CardInteraction:
  given Codec[CardInteraction] = deriveCodec

case class DeckRequirements(
  minLands: Int,
  maxLands: Int,
  neededEffects: List[String]
)

object DeckRequirements:
  given Codec[DeckRequirements] = deriveCodec

case class DeckStrategy(
  description: String,
  packages: List[SynergyPackage],
  interactions: List[CardInteraction],
  requirements: DeckRequirements
)

object DeckStrategy:
  given Codec[DeckStrategy] = deriveCodec

// Custom Tags
case class CustomTagDefinition(
  id: String,
  name: String,
  description: Option[String],
  color: Option[String]
)

object CustomTagDefinition:
  given Codec[CustomTagDefinition] = deriveCodec

// Deck Notes
case class DeckNote(
  id: String,
  title: String,
  content: String,
  createdAt: String,
  updatedAt: String
)

object DeckNote:
  given Codec[DeckNote] = deriveCodec

// Deck
case class Deck(
  id: String,
  name: String,
  format: DeckFormat,
  createdAt: String,
  updatedAt: String,
  version: Int,
  description: Option[String],
  archetype: Option[String],
  strategy: Option[DeckStrategy],
  cards: List[DeckCard],
  alternates: List[DeckCard],
  sideboard: List[DeckCard],
  customTags: List[CustomTagDefinition],
  notes: List[DeckNote],
  // New fields
  artCardScryfallId: Option[String] = None,
  colorIdentity: Option[List[String]] = None,
  customRoles: List[CustomRoleDefinition] = Nil
)

object Deck:
  given Codec[Deck] = deriveCodec

  def empty(name: String, formatType: FormatType): Deck =
    val now = Instant.now().toString
    Deck(
      id = UUID.randomUUID().toString,
      name = name,
      format = DeckFormat.forType(formatType),
      createdAt = now,
      updatedAt = now,
      version = 1,
      description = None,
      archetype = None,
      strategy = None,
      cards = Nil,
      alternates = Nil,
      sideboard = Nil,
      customTags = Nil,
      notes = Nil,
      artCardScryfallId = None,
      colorIdentity = None,
      customRoles = Nil
    )

// Taxonomy
enum TagCategory:
  case Function, Strategy, Theme, Mechanic, Meta

object TagCategory:
  given Encoder[TagCategory] = Encoder.encodeString.contramap {
    case Function => "function"
    case Strategy => "strategy"
    case Theme => "theme"
    case Mechanic => "mechanic"
    case Meta => "meta"
  }
  given Decoder[TagCategory] = Decoder.decodeString.emap {
    case "function" => Right(Function)
    case "strategy" => Right(Strategy)
    case "theme" => Right(Theme)
    case "mechanic" => Right(Mechanic)
    case "meta" => Right(Meta)
    case other => Left(s"Unknown tag category: $other")
  }

case class GlobalTag(
  id: String,
  name: String,
  category: TagCategory,
  description: String,
  aliases: Option[List[String]]
)

object GlobalTag:
  given Codec[GlobalTag] = deriveCodec

case class Taxonomy(
  version: Int,
  updatedAt: String,
  globalTags: List[GlobalTag]
)

object Taxonomy:
  given Codec[Taxonomy] = deriveCodec

  val default: Taxonomy = Taxonomy(
    version = 1,
    updatedAt = Instant.now().toString,
    globalTags = List(
      // Function tags
      GlobalTag("removal", "Removal", TagCategory.Function, "Removes permanents from the battlefield", None),
      GlobalTag("removal-creature", "Creature Removal", TagCategory.Function, "Specifically removes creatures", None),
      GlobalTag("removal-artifact", "Artifact Removal", TagCategory.Function, "Specifically removes artifacts", None),
      GlobalTag("removal-enchantment", "Enchantment Removal", TagCategory.Function, "Specifically removes enchantments", None),
      GlobalTag("board-wipe", "Board Wipe", TagCategory.Function, "Mass removal of permanents", None),
      GlobalTag("ramp", "Ramp", TagCategory.Function, "Accelerates mana production", None),
      GlobalTag("draw", "Card Draw", TagCategory.Function, "Draws additional cards", None),
      GlobalTag("tutor", "Tutor", TagCategory.Function, "Searches library for specific cards", None),
      GlobalTag("protection", "Protection", TagCategory.Function, "Protects permanents or players", None),
      GlobalTag("recursion", "Recursion", TagCategory.Function, "Returns cards from graveyard", None),
      GlobalTag("finisher", "Finisher", TagCategory.Function, "Wins the game or deals major damage", None),
      // Mechanic tags
      GlobalTag("tokens", "Tokens", TagCategory.Mechanic, "Creates or synergizes with tokens", None),
      GlobalTag("blink", "Blink", TagCategory.Mechanic, "Exiles and returns permanents", None),
      GlobalTag("sacrifice", "Sacrifice", TagCategory.Mechanic, "Sacrifices permanents for value", None),
      GlobalTag("aristocrats", "Aristocrats", TagCategory.Mechanic, "Benefits from creatures dying", None),
      GlobalTag("lifegain", "Lifegain", TagCategory.Mechanic, "Gains life or triggers on lifegain", None),
      GlobalTag("counters", "Counters", TagCategory.Mechanic, "Uses +1/+1 or other counters", None),
      GlobalTag("graveyard", "Graveyard", TagCategory.Mechanic, "Interacts with the graveyard", None),
      // Theme tags
      GlobalTag("theme", "Theme", TagCategory.Theme, "Central to deck identity, do not cut", None),
      // Meta tags
      GlobalTag("buy", "Buy", TagCategory.Meta, "Cards that need to be purchased", Some(List("need_to_buy")))
    )
  )

// Interest List
case class InterestItem(
  id: String,
  card: CardIdentifier,
  notes: Option[String],
  potentialDecks: Option[List[String]],
  addedAt: String,
  source: Option[String]
)

object InterestItem:
  given Codec[InterestItem] = deriveCodec

case class InterestList(
  version: Int,
  updatedAt: String,
  items: List[InterestItem]
)

object InterestList:
  given Codec[InterestList] = deriveCodec

  val empty: InterestList = InterestList(
    version = 1,
    updatedAt = Instant.now().toString,
    items = Nil
  )

// Config
case class Config(
  scryfallCacheExpiryDays: Int = 7,
  theme: String = "dark"
)

object Config:
  given Codec[Config] = deriveCodec

  val default: Config = Config()
