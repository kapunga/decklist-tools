package mtgdeckbuilder.tools

import cats.effect.*
import cats.syntax.all.*
import io.circe.*
import io.circe.syntax.*
import io.circe.generic.semiauto.*
import mtgdeckbuilder.domain.*
import mtgdeckbuilder.storage.Storage
import mtgdeckbuilder.scryfall.{ScryfallClient, ScryfallCard}
import mtgdeckbuilder.views.DeckViews
import mtgdeckbuilder.formats.{DeckFormats, ParsedCard}
import java.time.Instant
import java.util.UUID

class DeckTools[F[_]: Async](
  storage: Storage[F],
  scryfall: ScryfallClient[F]
):

  // ============ Deck Management ============

  def listDecks: F[Json] =
    storage.listDecks.map { decks =>
      Json.arr(decks.map { deck =>
        Json.obj(
          "id" -> Json.fromString(deck.id),
          "name" -> Json.fromString(deck.name),
          "format" -> Json.fromString(deck.format.`type`.toString),
          "cardCount" -> Json.fromInt(deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).map(_.quantity).sum),
          "deckSize" -> Json.fromInt(deck.format.deckSize),
          "archetype" -> deck.archetype.fold(Json.Null)(Json.fromString),
          "updatedAt" -> Json.fromString(deck.updatedAt)
        )
      }*)
    }

  def getDeck(identifier: String): F[Either[String, Json]] =
    // Try UUID first, then name
    val deckF = if identifier.matches("[0-9a-f-]{36}") then
      storage.getDeck(identifier)
    else
      storage.getDeckByName(identifier)

    deckF.map {
      case Some(deck) => Right(deck.asJson)
      case None => Left(s"Deck not found: $identifier")
    }

  def createDeck(
    name: String,
    formatStr: String,
    archetype: Option[String],
    description: Option[String]
  ): F[Either[String, Json]] =
    val formatType = formatStr.toLowerCase match
      case "commander" => Right(FormatType.Commander)
      case "standard" => Right(FormatType.Standard)
      case "modern" => Right(FormatType.Modern)
      case "kitchen_table" => Right(FormatType.KitchenTable)
      case other => Left(s"Unknown format: $other")

    formatType match
      case Left(err) => Async[F].pure(Left(err))
      case Right(ft) =>
        val deck = Deck.empty(name, ft).copy(
          archetype = archetype,
          description = description
        )
        storage.saveDeck(deck).as(Right(Json.obj(
          "id" -> Json.fromString(deck.id),
          "message" -> Json.fromString(s"Created deck: $name")
        )))

  def updateDeckMetadata(
    deckId: String,
    name: Option[String],
    description: Option[String],
    archetype: Option[String],
    strategy: Option[DeckStrategy]
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).flatMap {
      case None => Async[F].pure(Left(s"Deck not found: $deckId"))
      case Some(deck) =>
        val updated = deck.copy(
          name = name.getOrElse(deck.name),
          description = description.orElse(deck.description),
          archetype = archetype.orElse(deck.archetype),
          strategy = strategy.orElse(deck.strategy)
        )
        storage.saveDeck(updated).as(Right(Json.obj(
          "message" -> Json.fromString(s"Updated deck: ${updated.name}")
        )))
    }

  def deleteDeck(deckId: String): F[Either[String, Json]] =
    storage.getDeck(deckId).flatMap {
      case None => Async[F].pure(Left(s"Deck not found: $deckId"))
      case Some(deck) =>
        storage.deleteDeck(deckId).as(Right(Json.obj(
          "message" -> Json.fromString(s"Deleted deck: ${deck.name}")
        )))
    }

  // ============ Card Management ============

  def addCard(
    deckId: String,
    name: String,
    setCode: Option[String],
    collectorNumber: Option[String],
    quantity: Int,
    roles: List[String],
    statusStr: Option[String],
    ownershipStr: Option[String],
    toAlternates: Boolean,
    toSideboard: Boolean
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).flatMap {
      case None => Async[F].pure(Left(s"Deck not found: $deckId"))
      case Some(deck) =>
        val lookupF = (setCode, collectorNumber) match
          case (Some(set), Some(num)) => scryfall.lookupBySetAndNumber(set, num)
          case _ => scryfall.lookupByName(name)

        lookupF.flatMap {
          case Left(err) => Async[F].pure(Left(s"Card not found: $err"))
          case Right(scryfallCard) =>
            val inferredRoles = if roles.nonEmpty then roles else inferRoles(scryfallCard)
            val status = statusStr.flatMap(parseInclusion).getOrElse(InclusionStatus.Confirmed)
            val ownership = ownershipStr.flatMap(parseOwnership).getOrElse(OwnershipStatus.Owned)

            val deckCard = DeckCard(
              card = CardIdentifier(
                scryfallId = Some(scryfallCard.id),
                name = scryfallCard.name,
                setCode = scryfallCard.setCode,
                collectorNumber = scryfallCard.collectorNumber
              ),
              quantity = quantity,
              inclusion = status,
              ownership = ownership,
              roles = inferredRoles,
              isPinned = false,
              notes = None,
              addedAt = Instant.now().toString,
              addedBy = AddedBy.User
            )

            // Validate against format
            val warnings = validateCardAddition(deck, deckCard)

            val updatedDeck = if toAlternates then
              deck.copy(alternates = mergeCard(deck.alternates, deckCard))
            else if toSideboard then
              deck.copy(sideboard = mergeCard(deck.sideboard, deckCard))
            else
              deck.copy(cards = mergeCard(deck.cards, deckCard))

            storage.saveDeck(updatedDeck).as(Right(Json.obj(
              "message" -> Json.fromString(s"Added ${quantity}x ${scryfallCard.name}"),
              "card" -> Json.obj(
                "name" -> Json.fromString(scryfallCard.name),
                "set" -> Json.fromString(scryfallCard.setCode.toUpperCase),
                "collectorNumber" -> Json.fromString(scryfallCard.collectorNumber),
                "manaCost" -> scryfallCard.manaCost.fold(Json.Null)(Json.fromString),
                "type" -> Json.fromString(scryfallCard.typeLine)
              ),
              "warnings" -> (if warnings.isEmpty then Json.Null else Json.arr(warnings.map(Json.fromString)*))
            )))
        }
    }

  private def mergeCard(cards: List[DeckCard], newCard: DeckCard): List[DeckCard] =
    cards.find(_.card.name.toLowerCase == newCard.card.name.toLowerCase) match
      case Some(existing) =>
        cards.map { c =>
          if c.card.name.toLowerCase == newCard.card.name.toLowerCase then
            c.copy(quantity = c.quantity + newCard.quantity)
          else c
        }
      case None => cards :+ newCard

  private def validateCardAddition(deck: Deck, card: DeckCard): List[String] =
    val warnings = scala.collection.mutable.ListBuffer[String]()
    val format = deck.format

    // Check singleton
    if format.cardLimit == 1 then
      val existing = deck.cards.find(_.card.name.toLowerCase == card.card.name.toLowerCase)
      if existing.isDefined && !isBasicLand(card.card.name) && !format.unlimitedCards.contains(card.card.name) then
        warnings += s"${card.card.name} already exists in this singleton deck"

    // Check 4-of limit
    if format.cardLimit == 4 then
      val existing = deck.cards.find(_.card.name.toLowerCase == card.card.name.toLowerCase)
      val total = existing.map(_.quantity).getOrElse(0) + card.quantity
      if total > 4 && !isBasicLand(card.card.name) then
        warnings += s"${card.card.name} would exceed 4-copy limit (total: $total)"

    warnings.toList

  private def isBasicLand(name: String): Boolean =
    Set("Plains", "Island", "Swamp", "Mountain", "Forest",
        "Snow-Covered Plains", "Snow-Covered Island", "Snow-Covered Swamp",
        "Snow-Covered Mountain", "Snow-Covered Forest", "Wastes").contains(name)

  private def inferRoles(card: ScryfallCard): List[String] =
    Nil // Don't auto-assign roles - let the user choose

  private def parseInclusion(s: String): Option[InclusionStatus] = s.toLowerCase match
    case "confirmed" => Some(InclusionStatus.Confirmed)
    case "considering" => Some(InclusionStatus.Considering)
    case "cut" => Some(InclusionStatus.Cut)
    case _ => None

  private def parseOwnership(s: String): Option[OwnershipStatus] = s.toLowerCase match
    case "owned" => Some(OwnershipStatus.Owned)
    case "pulled" => Some(OwnershipStatus.Pulled)
    case "need_to_buy" => Some(OwnershipStatus.NeedToBuy)
    case _ => None

  def removeCard(
    deckId: String,
    name: String,
    quantity: Option[Int],
    fromAlternates: Boolean,
    fromSideboard: Boolean
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).flatMap {
      case None => Async[F].pure(Left(s"Deck not found: $deckId"))
      case Some(deck) =>
        def removeFromList(cards: List[DeckCard]): List[DeckCard] =
          cards.flatMap { c =>
            if c.card.name.toLowerCase == name.toLowerCase then
              quantity match
                case Some(q) if c.quantity > q => Some(c.copy(quantity = c.quantity - q))
                case Some(q) if c.quantity <= q => None
                case None => None
            else Some(c)
          }

        val updatedDeck = if fromAlternates then
          deck.copy(alternates = removeFromList(deck.alternates))
        else if fromSideboard then
          deck.copy(sideboard = removeFromList(deck.sideboard))
        else
          deck.copy(cards = removeFromList(deck.cards))

        storage.saveDeck(updatedDeck).as(Right(Json.obj(
          "message" -> Json.fromString(s"Removed $name from deck")
        )))
    }

  def updateCard(
    deckId: String,
    name: String,
    roles: Option[List[String]],
    addRoles: Option[List[String]],
    removeRoles: Option[List[String]],
    statusStr: Option[String],
    ownershipStr: Option[String],
    pinned: Option[Boolean],
    notes: Option[String]
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).flatMap {
      case None => Async[F].pure(Left(s"Deck not found: $deckId"))
      case Some(deck) =>
        def updateInList(cards: List[DeckCard]): List[DeckCard] =
          cards.map { c =>
            if c.card.name.toLowerCase == name.toLowerCase then
              var updated = c
              roles.foreach(r => updated = updated.copy(roles = r))
              addRoles.foreach(r => updated = updated.copy(roles = (updated.roles ++ r).distinct))
              removeRoles.foreach(r => updated = updated.copy(roles = updated.roles.filterNot(r.contains)))
              statusStr.flatMap(parseInclusion).foreach(s => updated = updated.copy(inclusion = s))
              ownershipStr.flatMap(parseOwnership).foreach(o => updated = updated.copy(ownership = o))
              pinned.foreach(p => updated = updated.copy(isPinned = p))
              notes.foreach(n => updated = updated.copy(notes = Some(n)))
              updated
            else c
          }

        val updatedDeck = deck.copy(
          cards = updateInList(deck.cards),
          alternates = updateInList(deck.alternates),
          sideboard = updateInList(deck.sideboard)
        )

        storage.saveDeck(updatedDeck).as(Right(Json.obj(
          "message" -> Json.fromString(s"Updated $name")
        )))
    }

  def moveCard(
    deckId: String,
    name: String,
    from: String,
    to: String
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).flatMap {
      case None => Async[F].pure(Left(s"Deck not found: $deckId"))
      case Some(deck) =>
        val fromList = from.toLowerCase match
          case "mainboard" => deck.cards
          case "alternates" => deck.alternates
          case "sideboard" => deck.sideboard
          case _ => Nil

        fromList.find(_.card.name.toLowerCase == name.toLowerCase) match
          case None => Async[F].pure(Left(s"Card not found in $from: $name"))
          case Some(card) =>
            def removeFrom(cards: List[DeckCard]): List[DeckCard] =
              cards.filterNot(_.card.name.toLowerCase == name.toLowerCase)

            def addTo(cards: List[DeckCard]): List[DeckCard] =
              cards :+ card

            val updatedDeck = (from.toLowerCase, to.toLowerCase) match
              case ("mainboard", "alternates") =>
                deck.copy(cards = removeFrom(deck.cards), alternates = addTo(deck.alternates))
              case ("mainboard", "sideboard") =>
                deck.copy(cards = removeFrom(deck.cards), sideboard = addTo(deck.sideboard))
              case ("alternates", "mainboard") =>
                deck.copy(alternates = removeFrom(deck.alternates), cards = addTo(deck.cards))
              case ("alternates", "sideboard") =>
                deck.copy(alternates = removeFrom(deck.alternates), sideboard = addTo(deck.sideboard))
              case ("sideboard", "mainboard") =>
                deck.copy(sideboard = removeFrom(deck.sideboard), cards = addTo(deck.cards))
              case ("sideboard", "alternates") =>
                deck.copy(sideboard = removeFrom(deck.sideboard), alternates = addTo(deck.alternates))
              case _ => deck

            storage.saveDeck(updatedDeck).as(Right(Json.obj(
              "message" -> Json.fromString(s"Moved $name from $from to $to")
            )))
    }

  def lookupCard(
    name: String,
    setCode: Option[String],
    collectorNumber: Option[String]
  ): F[Either[String, Json]] =
    val lookupF = (setCode, collectorNumber) match
      case (Some(set), Some(num)) => scryfall.lookupBySetAndNumber(set, num)
      case _ => scryfall.lookupByName(name)

    lookupF.map {
      case Left(err) => Left(err)
      case Right(card) => Right(Json.obj(
        "name" -> Json.fromString(card.name),
        "manaCost" -> card.manaCost.fold(Json.Null)(Json.fromString),
        "cmc" -> Json.fromDoubleOrNull(card.cmc),
        "type" -> Json.fromString(card.typeLine),
        "oracleText" -> card.oracleText.fold(Json.Null)(Json.fromString),
        "colors" -> card.colors.fold(Json.Null)(cs => Json.arr(cs.map(Json.fromString)*)),
        "colorIdentity" -> Json.arr(card.colorIdentity.map(Json.fromString)*),
        "set" -> Json.fromString(card.setCode.toUpperCase),
        "collectorNumber" -> Json.fromString(card.collectorNumber),
        "rarity" -> Json.fromString(card.rarity),
        "prices" -> card.prices.fold(Json.Null)(p => Json.obj(
          "usd" -> p.usd.fold(Json.Null)(Json.fromString),
          "usdFoil" -> p.usdFoil.fold(Json.Null)(Json.fromString)
        )),
        "legalities" -> Json.obj(card.legalities.toList.map((k, v) => k -> Json.fromString(v))*)
      ))
    }

  // ============ Views ============

  def viewDeck(
    deckId: String,
    viewId: Option[String],
    sortBy: Option[String],
    groupBy: Option[String]
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).map {
      case None => Left(s"Deck not found: $deckId")
      case Some(deck) =>
        val view = DeckViews.get(viewId.getOrElse("full")).getOrElse(DeckViews.FullView)
        val rendered = view.render(deck, sortBy, groupBy)
        Right(Json.obj(
          "view" -> Json.fromString(view.id),
          "content" -> Json.fromString(rendered)
        ))
    }

  def listViews: F[Json] =
    Async[F].pure(Json.arr(DeckViews.all.map { view =>
      Json.obj(
        "id" -> Json.fromString(view.id),
        "name" -> Json.fromString(view.name),
        "description" -> Json.fromString(view.description)
      )
    }*))

  // ============ Roles ============

  def listRoles(deckId: Option[String]): F[Json] =
    for
      globalRolesFile <- storage.getGlobalRoles
      deckRoles <- deckId.fold(Async[F].pure(List.empty[RoleDefinition]))(id =>
        storage.getDeck(id).map(_.map(_.customRoles).getOrElse(Nil))
      )
    yield
      val globalRoles = globalRolesFile.roles.map { role =>
        Json.obj(
          "id" -> Json.fromString(role.id),
          "name" -> Json.fromString(role.name),
          "description" -> role.description.fold(Json.Null)(Json.fromString),
          "color" -> role.color.fold(Json.Null)(Json.fromString),
          "scope" -> Json.fromString("global")
        )
      }
      val customRoles = deckRoles.map { role =>
        Json.obj(
          "id" -> Json.fromString(role.id),
          "name" -> Json.fromString(role.name),
          "description" -> role.description.fold(Json.Null)(Json.fromString),
          "color" -> role.color.fold(Json.Null)(Json.fromString),
          "scope" -> Json.fromString("deck")
        )
      }
      Json.arr((globalRoles ++ customRoles)*)

  def addCustomRole(
    deckId: String,
    roleId: String,
    name: String,
    description: Option[String],
    color: Option[String]
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).flatMap {
      case None => Async[F].pure(Left(s"Deck not found: $deckId"))
      case Some(deck) =>
        val role = RoleDefinition(roleId, name, description, color)
        val updatedDeck = deck.copy(customRoles = deck.customRoles :+ role)
        storage.saveDeck(updatedDeck).as(Right(Json.obj(
          "message" -> Json.fromString(s"Added custom role: $name")
        )))
    }

  def addGlobalRole(
    roleId: String,
    name: String,
    description: Option[String],
    color: Option[String]
  ): F[Either[String, Json]] =
    storage.getGlobalRoles.flatMap { globalRolesFile =>
      val role = RoleDefinition(roleId, name, description, color)
      val updated = globalRolesFile.copy(
        roles = globalRolesFile.roles :+ role
      )
      storage.saveGlobalRoles(updated).as(Right(Json.obj(
        "message" -> Json.fromString(s"Added global role: $name")
      )))
    }

  def updateGlobalRole(
    roleId: String,
    name: Option[String],
    description: Option[String],
    color: Option[String]
  ): F[Either[String, Json]] =
    storage.getGlobalRoles.flatMap { globalRolesFile =>
      globalRolesFile.roles.find(_.id == roleId) match
        case None => Async[F].pure(Left(s"Global role not found: $roleId"))
        case Some(existingRole) =>
          val updatedRole = existingRole.copy(
            name = name.getOrElse(existingRole.name),
            description = description.orElse(existingRole.description),
            color = color.orElse(existingRole.color)
          )
          val updated = globalRolesFile.copy(
            roles = globalRolesFile.roles.map(r => if r.id == roleId then updatedRole else r)
          )
          storage.saveGlobalRoles(updated).as(Right(Json.obj(
            "message" -> Json.fromString(s"Updated global role: ${updatedRole.name}")
          )))
    }

  def deleteGlobalRole(roleId: String): F[Either[String, Json]] =
    storage.getGlobalRoles.flatMap { globalRolesFile =>
      globalRolesFile.roles.find(_.id == roleId) match
        case None => Async[F].pure(Left(s"Global role not found: $roleId"))
        case Some(role) =>
          val updated = globalRolesFile.copy(
            roles = globalRolesFile.roles.filterNot(_.id == roleId)
          )
          storage.saveGlobalRoles(updated).as(Right(Json.obj(
            "message" -> Json.fromString(s"Deleted global role: ${role.name}")
          )))
    }

  // ============ Commanders ============

  def setCommanders(
    deckId: String,
    commanders: List[CardIdentifier]
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).flatMap {
      case None => Async[F].pure(Left(s"Deck not found: $deckId"))
      case Some(deck) =>
        // Validate that it's a Commander format deck
        if deck.format.`type` != FormatType.Commander then
          Async[F].pure(Left("Commanders can only be set for Commander format decks"))
        else if commanders.size > 2 then
          Async[F].pure(Left("Maximum of 2 commanders allowed (with partner)"))
        else
          val updatedDeck = deck.copy(commanders = commanders)
          storage.saveDeck(updatedDeck).as(Right(Json.obj(
            "message" -> Json.fromString(s"Set ${commanders.size} commander(s)"),
            "commanders" -> Json.arr(commanders.map(c => Json.fromString(c.name))*)
          )))
    }

  def addCommander(
    deckId: String,
    name: String,
    setCode: Option[String],
    collectorNumber: Option[String]
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).flatMap {
      case None => Async[F].pure(Left(s"Deck not found: $deckId"))
      case Some(deck) =>
        if deck.format.`type` != FormatType.Commander then
          Async[F].pure(Left("Commanders can only be set for Commander format decks"))
        else if deck.commanders.size >= 2 then
          Async[F].pure(Left("Maximum of 2 commanders allowed (with partner)"))
        else
          val lookupF = (setCode, collectorNumber) match
            case (Some(set), Some(num)) => scryfall.lookupBySetAndNumber(set, num)
            case _ => scryfall.lookupByName(name)

          lookupF.flatMap {
            case Left(err) => Async[F].pure(Left(s"Card not found: $err"))
            case Right(card) =>
              val commander = CardIdentifier(
                scryfallId = Some(card.id),
                name = card.name,
                setCode = card.setCode,
                collectorNumber = card.collectorNumber
              )
              val updatedDeck = deck.copy(commanders = deck.commanders :+ commander)
              storage.saveDeck(updatedDeck).as(Right(Json.obj(
                "message" -> Json.fromString(s"Added commander: ${card.name}")
              )))
          }
    }

  // ============ Interest List ============

  def getInterestList: F[Json] =
    storage.getInterestList.map { list =>
      Json.obj(
        "version" -> Json.fromInt(list.version),
        "updatedAt" -> Json.fromString(list.updatedAt),
        "items" -> Json.arr(list.items.map { item =>
          Json.obj(
            "id" -> Json.fromString(item.id),
            "card" -> item.card.asJson,
            "notes" -> item.notes.fold(Json.Null)(Json.fromString),
            "potentialDecks" -> item.potentialDecks.fold(Json.Null)(ds => Json.arr(ds.map(Json.fromString)*)),
            "addedAt" -> Json.fromString(item.addedAt),
            "source" -> item.source.fold(Json.Null)(Json.fromString)
          )
        }*)
      )
    }

  def addToInterestList(
    name: String,
    setCode: Option[String],
    collectorNumber: Option[String],
    notes: Option[String],
    potentialDecks: Option[List[String]],
    source: Option[String]
  ): F[Either[String, Json]] =
    val lookupF = (setCode, collectorNumber) match
      case (Some(set), Some(num)) => scryfall.lookupBySetAndNumber(set, num)
      case _ => scryfall.lookupByName(name)

    lookupF.flatMap {
      case Left(err) => Async[F].pure(Left(s"Card not found: $err"))
      case Right(card) =>
        storage.getInterestList.flatMap { list =>
          val item = InterestItem(
            id = UUID.randomUUID().toString,
            card = CardIdentifier(
              scryfallId = Some(card.id),
              name = card.name,
              setCode = card.setCode,
              collectorNumber = card.collectorNumber
            ),
            notes = notes,
            potentialDecks = potentialDecks,
            addedAt = Instant.now().toString,
            source = source
          )
          val updated = list.copy(
            items = list.items :+ item,
            version = list.version + 1
          )
          storage.saveInterestList(updated).as(Right(Json.obj(
            "message" -> Json.fromString(s"Added ${card.name} to interest list")
          )))
        }
    }

  def removeFromInterestList(cardName: String): F[Either[String, Json]] =
    storage.getInterestList.flatMap { list =>
      val updated = list.copy(
        items = list.items.filterNot(_.card.name.toLowerCase == cardName.toLowerCase),
        version = list.version + 1
      )
      storage.saveInterestList(updated).as(Right(Json.obj(
        "message" -> Json.fromString(s"Removed $cardName from interest list")
      )))
    }

  // ============ Import/Export ============

  def importDeck(
    deckId: Option[String],
    name: Option[String],
    formatStr: Option[String],
    text: String,
    sourceFormat: Option[String]
  ): F[Either[String, Json]] =
    val parser = sourceFormat.flatMap(DeckFormats.get).getOrElse(DeckFormats.detect(text))

    parser.parse(text) match
      case Left(err) => Async[F].pure(Left(s"Parse error: $err"))
      case Right(parsedCards) =>
        // Resolve cards via Scryfall
        val resolveCards: F[List[Either[String, (ParsedCard, ScryfallCard)]]] =
          parsedCards.traverse { pc =>
            val lookupF = (pc.setCode, pc.collectorNumber) match
              case (Some(set), Some(num)) => scryfall.lookupBySetAndNumber(set, num)
              case _ => scryfall.lookupByName(pc.name)
            lookupF.map(_.map(sc => (pc, sc)).left.map(_ => pc.name))
          }

        resolveCards.flatMap { results =>
          val resolved = results.collect { case Right(r) => r }
          val failed = results.collect { case Left(name) => name }

          def toDeckCard(pc: ParsedCard, sc: ScryfallCard): DeckCard =
            DeckCard(
              card = CardIdentifier(
                scryfallId = Some(sc.id),
                name = sc.name,
                setCode = sc.setCode,
                collectorNumber = sc.collectorNumber
              ),
              quantity = pc.quantity,
              inclusion = if pc.isMaybeboard then InclusionStatus.Considering else InclusionStatus.Confirmed,
              ownership = OwnershipStatus.Owned,
              roles = if pc.roles.nonEmpty then pc.roles else inferRoles(sc),
              isPinned = false,
              notes = None,
              addedAt = Instant.now().toString,
              addedBy = AddedBy.Import
            )

          def toCommanderIdentifier(pc: ParsedCard, sc: ScryfallCard): CardIdentifier =
            CardIdentifier(
              scryfallId = Some(sc.id),
              name = sc.name,
              setCode = sc.setCode,
              collectorNumber = sc.collectorNumber
            )

          // Extract commanders from parsed cards
          val commanderCards = resolved.filter { case (pc, _) => pc.isCommander }
          val commanders = commanderCards.map { case (pc, sc) => toCommanderIdentifier(pc, sc) }

          // Main deck cards (excluding commanders)
          val mainCards = resolved.filterNot { case (pc, _) => pc.isSideboard || pc.isCommander }.map { case (pc, sc) => toDeckCard(pc, sc) }
          val sideCards = resolved.filter { case (pc, _) => pc.isSideboard }.map { case (pc, sc) => toDeckCard(pc, sc) }

          deckId match
            case Some(id) =>
              // Merge into existing deck
              storage.getDeck(id).flatMap {
                case None => Async[F].pure(Left(s"Deck not found: $id"))
                case Some(deck) =>
                  val updatedDeck = deck.copy(
                    cards = mainCards.foldLeft(deck.cards)(mergeCard),
                    sideboard = sideCards.foldLeft(deck.sideboard)(mergeCard),
                    commanders = if commanders.nonEmpty then commanders else deck.commanders
                  )
                  storage.saveDeck(updatedDeck).as(Right(Json.obj(
                    "message" -> Json.fromString(s"Imported ${resolved.size} cards into ${deck.name}"),
                    "imported" -> Json.fromInt(resolved.size),
                    "commanders" -> (if commanders.nonEmpty then Json.arr(commanders.map(c => Json.fromString(c.name))*) else Json.Null),
                    "failed" -> (if failed.isEmpty then Json.Null else Json.arr(failed.map(Json.fromString)*))
                  )))
              }
            case None =>
              // Create new deck
              val ft = formatStr.flatMap {
                case "commander" => Some(FormatType.Commander)
                case "standard" => Some(FormatType.Standard)
                case "modern" => Some(FormatType.Modern)
                case "kitchen_table" => Some(FormatType.KitchenTable)
                case _ => None
              }.getOrElse(FormatType.Commander)

              val deck = Deck.empty(name.getOrElse("Imported Deck"), ft).copy(
                cards = mainCards,
                sideboard = sideCards,
                commanders = commanders
              )

              // Warning if Commander format but no commander found
              val warnings = if ft == FormatType.Commander && commanders.isEmpty then
                List("No commander detected in import. You may need to set the commander manually.")
              else Nil

              storage.saveDeck(deck).as(Right(Json.obj(
                "message" -> Json.fromString(s"Created deck '${deck.name}' with ${resolved.size} cards"),
                "deckId" -> Json.fromString(deck.id),
                "imported" -> Json.fromInt(resolved.size),
                "commanders" -> (if commanders.nonEmpty then Json.arr(commanders.map(c => Json.fromString(c.name))*) else Json.Null),
                "warnings" -> (if warnings.isEmpty then Json.Null else Json.arr(warnings.map(Json.fromString)*)),
                "failed" -> (if failed.isEmpty then Json.Null else Json.arr(failed.map(Json.fromString)*))
              )))
        }

  def exportDeck(
    deckId: String,
    formatStr: String,
    includeMaybeboard: Boolean,
    includeSideboard: Boolean
  ): F[Either[String, Json]] =
    storage.getDeck(deckId).map {
      case None => Left(s"Deck not found: $deckId")
      case Some(deck) =>
        DeckFormats.get(formatStr) match
          case None => Left(s"Unknown format: $formatStr")
          case Some(fmt) =>
            val exported = fmt.render(deck, includeMaybeboard, includeSideboard)
            Right(Json.obj(
              "format" -> Json.fromString(fmt.id),
              "content" -> Json.fromString(exported)
            ))
    }

  def listExportFormats: F[Json] =
    Async[F].pure(Json.arr(DeckFormats.all.map { fmt =>
      Json.obj(
        "id" -> Json.fromString(fmt.id),
        "name" -> Json.fromString(fmt.name),
        "description" -> Json.fromString(fmt.description)
      )
    }*))

  // ============ Validation ============

  def validateDeck(deckId: String): F[Either[String, Json]] =
    storage.getDeck(deckId).map {
      case None => Left(s"Deck not found: $deckId")
      case Some(deck) =>
        val errors = scala.collection.mutable.ListBuffer[String]()
        val warnings = scala.collection.mutable.ListBuffer[String]()
        val format = deck.format

        // Check deck size
        val confirmedCount = deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).map(_.quantity).sum
        if confirmedCount < format.deckSize then
          warnings += s"Deck has $confirmedCount cards, needs ${format.deckSize}"
        if confirmedCount > format.deckSize then
          errors += s"Deck has $confirmedCount cards, maximum is ${format.deckSize}"

        // Check sideboard size
        val sideboardCount = deck.sideboard.map(_.quantity).sum
        if sideboardCount > format.sideboardSize then
          errors += s"Sideboard has $sideboardCount cards, maximum is ${format.sideboardSize}"

        // Check singleton/4-of limits
        if format.cardLimit > 0 then
          val cardCounts = deck.cards
            .filter(_.inclusion == InclusionStatus.Confirmed)
            .groupBy(_.card.name)
            .map((name, cards) => (name, cards.map(_.quantity).sum))

          cardCounts.foreach { case (name, count) =>
            if count > format.cardLimit && !isBasicLand(name) && !format.unlimitedCards.contains(name) then
              errors += s"$name has $count copies, maximum is ${format.cardLimit}"
          }

        // Commander-specific checks
        if format.`type` == FormatType.Commander then
          if deck.commanders.isEmpty then
            warnings += "No commander designated"
          else if deck.commanders.size > 2 then
            errors += "Too many commanders (max 2 with partner)"

        Right(Json.obj(
          "valid" -> Json.fromBoolean(errors.isEmpty),
          "errors" -> Json.arr(errors.toList.map(Json.fromString)*),
          "warnings" -> Json.arr(warnings.toList.map(Json.fromString)*)
        ))
    }

  // ============ Search ============

  def searchDecksForCard(cardName: String): F[Json] =
    storage.listDecks.map { decks =>
      val matches = decks.flatMap { deck =>
        val allCards = deck.cards ++ deck.alternates ++ deck.sideboard
        allCards.find(_.card.name.toLowerCase == cardName.toLowerCase).map { card =>
          Json.obj(
            "deckId" -> Json.fromString(deck.id),
            "deckName" -> Json.fromString(deck.name),
            "quantity" -> Json.fromInt(card.quantity),
            "roles" -> Json.arr(card.roles.map(Json.fromString)*),
            "location" -> Json.fromString(
              if deck.cards.exists(_.card.name.toLowerCase == cardName.toLowerCase) then "mainboard"
              else if deck.alternates.exists(_.card.name.toLowerCase == cardName.toLowerCase) then "alternates"
              else "sideboard"
            )
          )
        }
      }
      Json.arr(matches*)
    }

  def getBuyList: F[Json] =
    storage.listDecks.map { decks =>
      val buyCards = decks.flatMap { deck =>
        val allCards = deck.cards ++ deck.alternates ++ deck.sideboard
        allCards.filter(_.ownership == OwnershipStatus.NeedToBuy).map { card =>
          (card.card.name, card.card.setCode, card.quantity, deck.id, deck.name)
        }
      }

      // Group by card
      val byCard = buyCards.groupBy { case (name, _, _, _, _) => name }
      val aggregated = byCard.map { case (name, entries) =>
        val totalQty = entries.map(_._3).sum
        val decks = entries.map { case (_, set, qty, deckId, deckName) =>
          Json.obj(
            "deckId" -> Json.fromString(deckId),
            "deckName" -> Json.fromString(deckName),
            "quantity" -> Json.fromInt(qty)
          )
        }
        Json.obj(
          "name" -> Json.fromString(name),
          "totalQuantity" -> Json.fromInt(totalQty),
          "decks" -> Json.arr(decks*)
        )
      }

      Json.obj(
        "totalCards" -> Json.fromInt(buyCards.map(_._3).sum),
        "cards" -> Json.arr(aggregated.toList*)
      )
    }
