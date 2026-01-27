package mtgdeckbuilder.views

import mtgdeckbuilder.domain.*

trait DeckView:
  def id: String
  def name: String
  def description: String
  def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String

object DeckViews:

  // Card type sort order - used for type-based grouping and sorting
  val CARD_TYPE_ORDER: List[String] = List(
    "Creature", "Planeswalker", "Battle", "Instant", "Sorcery",
    "Artifact", "Enchantment", "Land", "Other"
  )

  def getTypeSortOrder(cardType: String): Int =
    val idx = CARD_TYPE_ORDER.indexOf(cardType)
    if idx >= 0 then idx else CARD_TYPE_ORDER.size - 1

  // Extract primary type from type line
  def getPrimaryType(typeLine: String): String =
    val lower = typeLine.toLowerCase
    if lower.contains("creature") then "Creature"
    else if lower.contains("planeswalker") then "Planeswalker"
    else if lower.contains("battle") then "Battle"
    else if lower.contains("instant") then "Instant"
    else if lower.contains("sorcery") then "Sorcery"
    else if lower.contains("artifact") then "Artifact"
    else if lower.contains("enchantment") then "Enchantment"
    else if lower.contains("land") then "Land"
    else "Other"

  val all: List[DeckView] = List(
    FullView,
    SkeletonView,
    ChecklistView,
    CurveView,
    BuyListView,
    ByRoleView,
    ByTypeView
  )

  def get(viewId: String): Option[DeckView] =
    all.find(_.id == viewId)

  private def sortCards(cards: List[DeckCard], sortBy: Option[String]): List[DeckCard] =
    sortBy match
      case Some("name") => cards.sortBy(_.card.name)
      case Some("set") => cards.sortBy(c => (c.card.setCode, c.card.collectorNumber))
      case _ => cards.sortBy(_.card.name)

  private def groupCards(cards: List[DeckCard], groupBy: Option[String]): Map[String, List[DeckCard]] =
    groupBy match
      case Some("role") =>
        // Cards with multiple roles appear in multiple groups
        val roleMap = scala.collection.mutable.Map[String, List[DeckCard]]()
        cards.foreach { card =>
          if card.roles.isEmpty then
            roleMap("Unassigned") = roleMap.getOrElse("Unassigned", Nil) :+ card
          else
            card.roles.foreach { role =>
              roleMap(role) = roleMap.getOrElse(role, Nil) :+ card
            }
        }
        roleMap.toMap
      case Some("status") => cards.groupBy(_.inclusion.toString)
      case _ => Map("All Cards" -> cards)

  private def formatCard(card: DeckCard): String =
    val qty = if card.quantity > 1 then s"${card.quantity}x " else ""
    val status = card.inclusion match
      case InclusionStatus.Considering => " (considering)"
      case InclusionStatus.Cut => " (cut)"
      case _ => ""
    val ownership = card.ownership match
      case OwnershipStatus.NeedToBuy => " [BUY]"
      case OwnershipStatus.Pulled => " [PULLED]"
      case _ => ""
    val roles = if card.roles.nonEmpty then s" [${card.roles.mkString(", ")}]" else ""
    s"$qty${card.card.name}$roles$status$ownership"

  // Full View - complete deck with all metadata
  object FullView extends DeckView:
    val id = "full"
    val name = "Full Deck"
    val description = "Complete deck with all metadata, stats, and mana curve"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name}\n\n")
      sb.append(s"**Format:** ${deck.format.`type`}\n")
      deck.archetype.foreach(a => sb.append(s"**Archetype:** $a\n"))
      sb.append(s"**Cards:** ${deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).map(_.quantity).sum}/${deck.format.deckSize}\n")
      sb.append(s"**Version:** ${deck.version}\n\n")

      deck.description.foreach { d =>
        sb.append(s"## Description\n$d\n\n")
      }

      deck.strategy.foreach { s =>
        sb.append(s"## Strategy\n${s.description}\n\n")
      }

      val grouped = groupCards(sortCards(deck.cards, sortBy), groupBy)
      grouped.toList.sortBy(_._1).foreach { case (group, cards) =>
        sb.append(s"### $group (${cards.map(_.quantity).sum})\n")
        cards.foreach(c => sb.append(s"- ${formatCard(c)}\n"))
        sb.append("\n")
      }

      if deck.alternates.nonEmpty then
        sb.append(s"## Alternates (${deck.alternates.size})\n")
        deck.alternates.foreach(c => sb.append(s"- ${formatCard(c)}\n"))
        sb.append("\n")

      if deck.sideboard.nonEmpty then
        sb.append(s"## Sideboard (${deck.sideboard.size})\n")
        deck.sideboard.foreach(c => sb.append(s"- ${formatCard(c)}\n"))
        sb.append("\n")

      sb.toString

  // Skeleton View - minimal, just card names
  object SkeletonView extends DeckView:
    val id = "skeleton"
    val name = "Skeleton"
    val description = "Minimal view with just card names grouped by primary role"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name}\n\n")

      // Show commanders first if present
      if deck.commanders.nonEmpty then
        sb.append("## Commanders\n")
        deck.commanders.foreach { cmd =>
          sb.append(s"${cmd.name}\n")
        }
        sb.append("\n")

      // Group by first role
      val byRole = scala.collection.mutable.Map[String, List[DeckCard]]()
      deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).foreach { card =>
        val role = card.roles.headOption.getOrElse("Unassigned")
        byRole(role) = byRole.getOrElse(role, Nil) :+ card
      }

      byRole.toList.sortBy(_._1).foreach { case (role, cards) =>
        sb.append(s"## $role\n")
        cards.sortBy(_.card.name).foreach { c =>
          val qty = if c.quantity > 1 then s"${c.quantity}x " else ""
          sb.append(s"$qty${c.card.name}\n")
        }
        sb.append("\n")
      }

      sb.toString

  // Checklist View - for pulling physical cards
  object ChecklistView extends DeckView:
    val id = "checklist"
    val name = "Pull Checklist"
    val description = "Cards sorted by set/collector number for pulling from collection"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name} - Pull Checklist\n\n")

      val allCards = (deck.cards ++ deck.sideboard)
        .filter(_.inclusion == InclusionStatus.Confirmed)
        .sortBy(c => (c.card.setCode, c.card.collectorNumber.toIntOption.getOrElse(999999)))

      val bySet = allCards.groupBy(_.card.setCode.toUpperCase)
      bySet.toList.sortBy(_._1).foreach { case (set, cards) =>
        sb.append(s"## $set\n")
        cards.foreach { c =>
          val pulled = if c.ownership == OwnershipStatus.Pulled then "[x]" else "[ ]"
          sb.append(s"$pulled ${c.quantity}x ${c.card.name} (${c.card.collectorNumber})\n")
        }
        sb.append("\n")
      }

      sb.toString

  // Curve View - mana curve visualization
  object CurveView extends DeckView:
    val id = "curve"
    val name = "Mana Curve"
    val description = "Mana curve visualization and type distribution"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name} - Mana Curve\n\n")

      // Note: Without cached Scryfall data, we can't show actual CMC
      // This is a placeholder that would use cached card data in real implementation
      sb.append("*Note: CMC data requires cached Scryfall card information*\n\n")

      val confirmedCards = deck.cards.filter(_.inclusion == InclusionStatus.Confirmed)
      val nonLands = confirmedCards.filterNot(_.roles.contains("land"))
      val lands = confirmedCards.filter(_.roles.contains("land"))

      sb.append(s"**Non-Land Cards:** ${nonLands.map(_.quantity).sum}\n")
      sb.append(s"**Lands:** ${lands.map(_.quantity).sum}\n\n")

      // Collect all unique roles
      val roleCount = scala.collection.mutable.Map[String, Int]()
      confirmedCards.foreach { card =>
        card.roles.foreach { role =>
          roleCount(role) = roleCount.getOrElse(role, 0) + card.quantity
        }
      }

      sb.append("## By Role\n")
      roleCount.toList.sortBy(-_._2).foreach { case (role, count) =>
        sb.append(s"- **$role:** $count\n")
      }

      sb.toString

  // Buy List View - cards needing purchase
  object BuyListView extends DeckView:
    val id = "buy-list"
    val name = "Buy List"
    val description = "Cards with ownership=need_to_buy"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name} - Buy List\n\n")

      val toBuy = (deck.cards ++ deck.alternates ++ deck.sideboard)
        .filter(_.ownership == OwnershipStatus.NeedToBuy)
        .sortBy(_.card.name)

      if toBuy.isEmpty then
        sb.append("*No cards need to be purchased*\n")
      else
        sb.append(s"**Total:** ${toBuy.map(_.quantity).sum} cards\n\n")
        toBuy.foreach { c =>
          sb.append(s"- ${c.quantity}x ${c.card.name} (${c.card.setCode.toUpperCase})\n")
        }

      sb.toString

  // By Role View - grouped by card role (cards with multiple roles appear in multiple groups)
  object ByRoleView extends DeckView:
    val id = "by-role"
    val name = "By Role"
    val description = "Cards grouped by role with counts (cards with multiple roles appear in multiple groups)"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name} - By Role\n\n")

      // Show commanders first if present
      if deck.commanders.nonEmpty then
        sb.append(s"## Commanders (${deck.commanders.size})\n")
        deck.commanders.foreach { cmd =>
          sb.append(s"- ${cmd.name}\n")
        }
        sb.append("\n")

      // Group cards by role - cards with multiple roles appear in multiple groups
      val byRole = scala.collection.mutable.Map[String, List[DeckCard]]()
      deck.cards.filter(_.inclusion == InclusionStatus.Confirmed).foreach { card =>
        if card.roles.isEmpty then
          byRole("Unassigned") = byRole.getOrElse("Unassigned", Nil) :+ card
        else
          card.roles.foreach { role =>
            byRole(role) = byRole.getOrElse(role, Nil) :+ card
          }
      }

      byRole.toList.sortBy(_._1).foreach { case (role, cards) =>
        sb.append(s"## $role (${cards.map(_.quantity).sum})\n")
        cards.sortBy(_.card.name).foreach(c => sb.append(s"- ${formatCard(c)}\n"))
        sb.append("\n")
      }

      sb.toString

  // By Type View - grouped by card type
  object ByTypeView extends DeckView:
    val id = "by-type"
    val name = "By Type"
    val description = "Cards grouped by card type (Creature, Instant, etc.)"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name} - By Type\n\n")

      // Show commanders first if present
      if deck.commanders.nonEmpty then
        sb.append(s"## Commanders (${deck.commanders.size})\n")
        deck.commanders.foreach { cmd =>
          sb.append(s"- ${cmd.name}\n")
        }
        sb.append("\n")

      // Note: Without Scryfall data, we infer type from roles
      // In a real implementation, we'd use cached card data
      val confirmedCards = deck.cards.filter(_.inclusion == InclusionStatus.Confirmed)

      // Group by inferred type from roles
      val byType = scala.collection.mutable.Map[String, List[DeckCard]]()
      confirmedCards.foreach { card =>
        // Infer type from land role, otherwise mark as "Nonland"
        val cardType = if card.roles.contains("land") then "Land" else "Nonland"
        byType(cardType) = byType.getOrElse(cardType, Nil) :+ card
      }

      // Sort by CARD_TYPE_ORDER
      byType.toList.sortBy((t, _) => getTypeSortOrder(t)).foreach { case (cardType, cards) =>
        sb.append(s"## $cardType (${cards.map(_.quantity).sum})\n")
        cards.sortBy(_.card.name).foreach(c => sb.append(s"- ${formatCard(c)}\n"))
        sb.append("\n")
      }

      sb.toString
