package mtgdeckbuilder.views

import mtgdeckbuilder.domain.*

trait DeckView:
  def id: String
  def name: String
  def description: String
  def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String

object DeckViews:

  val all: List[DeckView] = List(
    FullView,
    SkeletonView,
    ChecklistView,
    CurveView,
    BuyListView,
    ByRoleView,
    ByFunctionView
  )

  def get(viewId: String): Option[DeckView] =
    all.find(_.id == viewId)

  private def sortCards(cards: List[DeckCard], sortBy: Option[String]): List[DeckCard] =
    sortBy match
      case Some("name") => cards.sortBy(_.card.name)
      case Some("set") => cards.sortBy(c => (c.card.setCode, c.card.collectorNumber))
      case Some("role") => cards.sortBy(c => CardRole.importanceScore(c.role)).reverse
      case _ => cards.sortBy(_.card.name)

  private def groupCards(cards: List[DeckCard], groupBy: Option[String]): Map[String, List[DeckCard]] =
    groupBy match
      case Some("role") => cards.groupBy(_.role.toString)
      case Some("type") => cards.groupBy(c => inferCardType(c.card.name))
      case Some("tag") =>
        val tagged = cards.flatMap(c => c.tags.map(t => (t, c)))
        val grouped = tagged.groupBy(_._1).map((k, v) => k -> v.map(_._2))
        val untagged = cards.filter(_.tags.isEmpty)
        if untagged.nonEmpty then grouped + ("Untagged" -> untagged) else grouped
      case Some("status") => cards.groupBy(_.inclusion.toString)
      case _ => Map("All Cards" -> cards)

  private def inferCardType(name: String): String =
    // Simple heuristic - in reality we'd use cached Scryfall data
    "Card"

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
    s"$qty${card.card.name}$status$ownership"

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
    val description = "Minimal view with just card names grouped by role"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name}\n\n")

      val byRole = deck.cards
        .filter(_.inclusion == InclusionStatus.Confirmed)
        .groupBy(_.role)
        .toList
        .sortBy((r, _) => -CardRole.importanceScore(r))

      byRole.foreach { case (role, cards) =>
        sb.append(s"## ${role}\n")
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

      val nonLands = deck.cards.filter(c =>
        c.inclusion == InclusionStatus.Confirmed && c.role != CardRole.Land
      )
      val lands = deck.cards.filter(c =>
        c.inclusion == InclusionStatus.Confirmed && c.role == CardRole.Land
      )

      sb.append(s"**Non-Land Cards:** ${nonLands.map(_.quantity).sum}\n")
      sb.append(s"**Lands:** ${lands.map(_.quantity).sum}\n\n")

      sb.append("## By Role\n")
      deck.cards
        .filter(_.inclusion == InclusionStatus.Confirmed)
        .groupBy(_.role)
        .toList
        .sortBy((r, _) => -CardRole.importanceScore(r))
        .foreach { case (role, cards) =>
          sb.append(s"- **$role:** ${cards.map(_.quantity).sum}\n")
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

  // By Role View - grouped by card role
  object ByRoleView extends DeckView:
    val id = "by-role"
    val name = "By Role"
    val description = "Cards grouped by role with counts"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name} - By Role\n\n")

      val byRole = deck.cards
        .filter(_.inclusion == InclusionStatus.Confirmed)
        .groupBy(_.role)
        .toList
        .sortBy((r, _) => -CardRole.importanceScore(r))

      byRole.foreach { case (role, cards) =>
        sb.append(s"## ${role} (${cards.map(_.quantity).sum})\n")
        cards.sortBy(_.card.name).foreach(c => sb.append(s"- ${formatCard(c)}\n"))
        sb.append("\n")
      }

      sb.toString

  // By Function View - grouped by function tags
  object ByFunctionView extends DeckView:
    val id = "by-function"
    val name = "By Function"
    val description = "Cards grouped by function tags (removal, ramp, draw, etc.)"

    def render(deck: Deck, sortBy: Option[String], groupBy: Option[String]): String =
      val sb = new StringBuilder
      sb.append(s"# ${deck.name} - By Function\n\n")

      val functionTags = Set(
        "removal", "removal-creature", "removal-artifact", "removal-enchantment",
        "board-wipe", "ramp", "draw", "tutor", "protection", "recursion", "finisher"
      )

      val cardsByFunction = deck.cards
        .filter(_.inclusion == InclusionStatus.Confirmed)
        .flatMap(c => c.tags.filter(functionTags.contains).map(t => (t, c)))
        .groupBy(_._1)
        .map((k, v) => (k, v.map(_._2)))

      if cardsByFunction.isEmpty then
        sb.append("*No cards tagged with function tags*\n\n")
        sb.append("Tip: Tag cards with: removal, ramp, draw, tutor, protection, recursion, finisher, board-wipe\n")
      else
        cardsByFunction.toList.sortBy(_._1).foreach { case (tag, cards) =>
          sb.append(s"## ${tag.capitalize.replace("-", " ")} (${cards.map(_.quantity).sum})\n")
          cards.sortBy(_.card.name).foreach(c => sb.append(s"- ${formatCard(c)}\n"))
          sb.append("\n")
        }

      val untagged = deck.cards.filter(c =>
        c.inclusion == InclusionStatus.Confirmed &&
        c.role != CardRole.Land &&
        !c.tags.exists(functionTags.contains)
      )
      if untagged.nonEmpty then
        sb.append(s"## Uncategorized (${untagged.map(_.quantity).sum})\n")
        untagged.sortBy(_.card.name).foreach(c => sb.append(s"- ${formatCard(c)}\n"))

      sb.toString
