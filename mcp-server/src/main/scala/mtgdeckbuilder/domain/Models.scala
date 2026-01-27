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

// Role Definition - used for both global and deck-specific custom roles
case class RoleDefinition(
  id: String,
  name: String,
  description: Option[String] = None,
  color: Option[String] = None
)

object RoleDefinition:
  given Codec[RoleDefinition] = deriveCodec

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

// Deck Card - cards can have multiple roles
case class DeckCard(
  card: CardIdentifier,
  quantity: Int,
  inclusion: InclusionStatus,
  ownership: OwnershipStatus,
  roles: List[String],
  isPinned: Boolean,
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
  priority: Int
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
  commanders: List[CardIdentifier],
  customRoles: List[RoleDefinition],
  notes: List[DeckNote],
  artCardScryfallId: Option[String] = None,
  colorIdentity: Option[List[String]] = None
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
      commanders = Nil,
      customRoles = Nil,
      notes = Nil,
      artCardScryfallId = None,
      colorIdentity = None
    )

// Taxonomy - global role definitions shared across all decks
case class Taxonomy(
  version: Int,
  updatedAt: String,
  globalRoles: List[RoleDefinition]
)

object Taxonomy:
  given Codec[Taxonomy] = deriveCodec

  val default: Taxonomy = Taxonomy(
    version = 1,
    updatedAt = Instant.now().toString,
    globalRoles = List(
      // Special roles
      RoleDefinition("engine", "Engine", Some("Essential to how the deck wins or functions"), Some("#ec4899")),
      RoleDefinition("theme", "Theme", Some("Fits the deck flavor or identity"), Some("#a855f7")),

      // Core strategic roles
      RoleDefinition("ramp", "Ramp", Some("Accelerates mana production"), Some("#22c55e")),
      RoleDefinition("card-draw", "Card Draw", Some("Draws additional cards"), Some("#3b82f6")),
      RoleDefinition("removal", "Removal", Some("Removes permanents from the battlefield"), Some("#ef4444")),
      RoleDefinition("board-wipe", "Board Wipe", Some("Mass removal of permanents"), Some("#dc2626")),
      RoleDefinition("tutor", "Tutor", Some("Searches library for specific cards"), Some("#8b5cf6")),
      RoleDefinition("protection", "Protection", Some("Protects permanents or players"), Some("#f59e0b")),
      RoleDefinition("recursion", "Recursion", Some("Returns cards from graveyard"), Some("#10b981")),
      RoleDefinition("finisher", "Finisher", Some("Wins the game or deals major damage"), Some("#f97316")),
      RoleDefinition("win-condition", "Win Condition", Some("Directly enables victory"), Some("#eab308")),

      // Creature/combat roles
      RoleDefinition("beater", "Beater", Some("Efficient creature for combat damage"), Some("#84cc16")),
      RoleDefinition("blocker", "Blocker", Some("Defensive creature"), Some("#64748b")),
      RoleDefinition("evasion", "Evasion", Some("Creature with evasive abilities"), Some("#06b6d4")),
      RoleDefinition("value-engine", "Value Engine", Some("Generates ongoing card advantage"), Some("#a855f7")),
      RoleDefinition("utility", "Utility", Some("Provides useful abilities"), Some("#6366f1")),

      // Archetype-specific roles
      RoleDefinition("token-producer", "Token Producer", Some("Creates creature tokens"), Some("#14b8a6")),
      RoleDefinition("sacrifice-fodder", "Sacrifice Fodder", Some("Meant to be sacrificed"), Some("#71717a")),
      RoleDefinition("sacrifice-outlet", "Sacrifice Outlet", Some("Lets you sacrifice creatures"), Some("#525252")),
      RoleDefinition("payoff", "Payoff", Some("Rewards deck strategy"), Some("#f472b6")),
      RoleDefinition("enabler", "Enabler", Some("Enables deck strategy"), Some("#22d3ee")),
      RoleDefinition("combo-piece", "Combo Piece", Some("Part of a game-winning combo"), Some("#fbbf24")),

      // Mana
      RoleDefinition("mana-fixer", "Mana Fixer", Some("Fixes mana colors"), Some("#4ade80")),

      // Interaction
      RoleDefinition("counterspell", "Counterspell", Some("Counters spells"), Some("#60a5fa")),
      RoleDefinition("discard", "Discard", Some("Forces opponents to discard"), Some("#374151"))
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

// Global Roles File
case class GlobalRolesFile(
  version: Int,
  roles: List[RoleDefinition]
)

object GlobalRolesFile:
  given Codec[GlobalRolesFile] = deriveCodec

  val default: GlobalRolesFile = GlobalRolesFile(
    version = 1,
    roles = List(
      // Special roles
      RoleDefinition("engine", "Engine", Some("Essential to how the deck wins or functions"), Some("#ec4899")),
      RoleDefinition("theme", "Theme", Some("Fits the deck flavor or identity"), Some("#a855f7")),

      // Core strategic roles
      RoleDefinition("ramp", "Ramp", Some("Accelerates mana production"), Some("#22c55e")),
      RoleDefinition("card-draw", "Card Draw", Some("Draws additional cards"), Some("#3b82f6")),
      RoleDefinition("removal", "Removal", Some("Removes permanents from the battlefield"), Some("#ef4444")),
      RoleDefinition("board-wipe", "Board Wipe", Some("Mass removal of permanents"), Some("#dc2626")),
      RoleDefinition("tutor", "Tutor", Some("Searches library for specific cards"), Some("#8b5cf6")),
      RoleDefinition("protection", "Protection", Some("Protects permanents or players"), Some("#f59e0b")),
      RoleDefinition("recursion", "Recursion", Some("Returns cards from graveyard"), Some("#10b981")),
      RoleDefinition("finisher", "Finisher", Some("Wins the game or deals major damage"), Some("#f97316")),
      RoleDefinition("win-condition", "Win Condition", Some("Directly enables victory"), Some("#eab308")),

      // Creature/combat roles
      RoleDefinition("beater", "Beater", Some("Efficient creature for combat damage"), Some("#84cc16")),
      RoleDefinition("blocker", "Blocker", Some("Defensive creature"), Some("#64748b")),
      RoleDefinition("evasion", "Evasion", Some("Creature with evasive abilities"), Some("#06b6d4")),
      RoleDefinition("value-engine", "Value Engine", Some("Generates ongoing card advantage"), Some("#a855f7")),
      RoleDefinition("utility", "Utility", Some("Provides useful abilities"), Some("#6366f1")),

      // Archetype-specific roles
      RoleDefinition("token-producer", "Token Producer", Some("Creates creature tokens"), Some("#14b8a6")),
      RoleDefinition("sacrifice-fodder", "Sacrifice Fodder", Some("Meant to be sacrificed"), Some("#71717a")),
      RoleDefinition("sacrifice-outlet", "Sacrifice Outlet", Some("Lets you sacrifice creatures"), Some("#525252")),
      RoleDefinition("payoff", "Payoff", Some("Rewards deck strategy"), Some("#f472b6")),
      RoleDefinition("enabler", "Enabler", Some("Enables deck strategy"), Some("#22d3ee")),
      RoleDefinition("combo-piece", "Combo Piece", Some("Part of a game-winning combo"), Some("#fbbf24")),

      // Mana
      RoleDefinition("mana-fixer", "Mana Fixer", Some("Fixes mana colors"), Some("#4ade80")),

      // Interaction
      RoleDefinition("counterspell", "Counterspell", Some("Counters spells"), Some("#60a5fa")),
      RoleDefinition("discard", "Discard", Some("Forces opponents to discard"), Some("#374151"))
    )
  )
