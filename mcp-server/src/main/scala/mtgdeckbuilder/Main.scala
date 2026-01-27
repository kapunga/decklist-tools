package mtgdeckbuilder

import cats.effect.*
import cats.syntax.all.*
import io.circe.*
import io.circe.parser.*
import io.circe.syntax.*
import fs2.io.file.{Files, Path}
import org.http4s.ember.client.EmberClientBuilder
import mtgdeckbuilder.domain.*
import mtgdeckbuilder.storage.Storage
import mtgdeckbuilder.scryfall.ScryfallClient
import mtgdeckbuilder.tools.DeckTools

object Main extends IOApp.Simple:

  val storageDir: Path = Path(System.getProperty("user.home")) / "Library" / "Application Support" / "mtg-deckbuilder"
  val cacheDir: Path = storageDir / "cache" / "scryfall"

  def run: IO[Unit] =
    EmberClientBuilder.default[IO].build.use { httpClient =>
      for
        storage <- Storage[IO](storageDir)
        scryfallClient = ScryfallClient[IO](httpClient, cacheDir)
        tools = new DeckTools[IO](storage, scryfallClient)
        server <- createServer(tools)
        _ <- server.run
      yield ()
    }

  def createServer(tools: DeckTools[IO]): IO[McpServer] =
    val toolDefs = List(
      // Deck Management
      ToolDef(
        name = "list_decks",
        description = "List all saved decks with summary info",
        inputSchema = Json.obj(),
        handler = _ => tools.listDecks.map(j => ToolResult(j.spaces2))
      ),

      ToolDef(
        name = "get_deck",
        description = "Get a deck by ID or name",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "identifier" -> Json.obj(
              "type" -> Json.fromString("string"),
              "description" -> Json.fromString("Deck UUID or name (case-insensitive)")
            )
          ),
          "required" -> Json.arr(Json.fromString("identifier"))
        ),
        handler = params =>
          val identifier = params.hcursor.get[String]("identifier").getOrElse("")
          tools.getDeck(identifier).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "create_deck",
        description = "Create a new empty deck",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "format" -> Json.obj(
              "type" -> Json.fromString("string"),
              "enum" -> Json.arr(
                Json.fromString("commander"),
                Json.fromString("standard"),
                Json.fromString("modern"),
                Json.fromString("kitchen_table")
              )
            ),
            "archetype" -> Json.obj("type" -> Json.fromString("string")),
            "description" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("name"), Json.fromString("format"))
        ),
        handler = params =>
          val name = params.hcursor.get[String]("name").getOrElse("")
          val format = params.hcursor.get[String]("format").getOrElse("")
          val archetype = params.hcursor.get[String]("archetype").toOption
          val description = params.hcursor.get[String]("description").toOption
          tools.createDeck(name, format, archetype, description).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "update_deck_metadata",
        description = "Update deck name, description, archetype, or strategy",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "description" -> Json.obj("type" -> Json.fromString("string")),
            "archetype" -> Json.obj("type" -> Json.fromString("string")),
            "strategy" -> Json.obj("type" -> Json.fromString("object"))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          val name = params.hcursor.get[String]("name").toOption
          val description = params.hcursor.get[String]("description").toOption
          val archetype = params.hcursor.get[String]("archetype").toOption
          val strategy = params.hcursor.get[DeckStrategy]("strategy").toOption
          tools.updateDeckMetadata(deckId, name, description, archetype, strategy).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "delete_deck",
        description = "Delete a deck permanently",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          tools.deleteDeck(deckId).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      // Card Management
      ToolDef(
        name = "add_card",
        description = "Add a card to a deck. Resolves card via Scryfall.",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "set_code" -> Json.obj("type" -> Json.fromString("string")),
            "collector_number" -> Json.obj("type" -> Json.fromString("string")),
            "quantity" -> Json.obj("type" -> Json.fromString("number"), "default" -> Json.fromInt(1)),
            "roles" -> Json.obj("type" -> Json.fromString("array"), "items" -> Json.obj("type" -> Json.fromString("string")), "description" -> Json.fromString("List of role IDs for the card")),
            "status" -> Json.obj("type" -> Json.fromString("string"), "enum" -> Json.arr(Json.fromString("confirmed"), Json.fromString("considering"))),
            "ownership" -> Json.obj("type" -> Json.fromString("string"), "enum" -> Json.arr(Json.fromString("owned"), Json.fromString("pulled"), Json.fromString("need_to_buy"))),
            "to_alternates" -> Json.obj("type" -> Json.fromString("boolean")),
            "to_sideboard" -> Json.obj("type" -> Json.fromString("boolean"))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"), Json.fromString("name"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          val name = params.hcursor.get[String]("name").getOrElse("")
          val setCode = params.hcursor.get[String]("set_code").toOption
          val collectorNumber = params.hcursor.get[String]("collector_number").toOption
          val quantity = params.hcursor.get[Int]("quantity").getOrElse(1)
          val roles = params.hcursor.get[List[String]]("roles").getOrElse(Nil)
          val status = params.hcursor.get[String]("status").toOption
          val ownership = params.hcursor.get[String]("ownership").toOption
          val toAlternates = params.hcursor.get[Boolean]("to_alternates").getOrElse(false)
          val toSideboard = params.hcursor.get[Boolean]("to_sideboard").getOrElse(false)
          tools.addCard(deckId, name, setCode, collectorNumber, quantity, roles, status, ownership, toAlternates, toSideboard).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "remove_card",
        description = "Remove a card from a deck",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "quantity" -> Json.obj("type" -> Json.fromString("number")),
            "from_alternates" -> Json.obj("type" -> Json.fromString("boolean")),
            "from_sideboard" -> Json.obj("type" -> Json.fromString("boolean"))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"), Json.fromString("name"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          val name = params.hcursor.get[String]("name").getOrElse("")
          val quantity = params.hcursor.get[Int]("quantity").toOption
          val fromAlternates = params.hcursor.get[Boolean]("from_alternates").getOrElse(false)
          val fromSideboard = params.hcursor.get[Boolean]("from_sideboard").getOrElse(false)
          tools.removeCard(deckId, name, quantity, fromAlternates, fromSideboard).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "update_card",
        description = "Update a card's metadata in a deck",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "roles" -> Json.obj("type" -> Json.fromString("array"), "items" -> Json.obj("type" -> Json.fromString("string")), "description" -> Json.fromString("Replace all roles with this list")),
            "add_roles" -> Json.obj("type" -> Json.fromString("array"), "items" -> Json.obj("type" -> Json.fromString("string")), "description" -> Json.fromString("Add these roles to existing roles")),
            "remove_roles" -> Json.obj("type" -> Json.fromString("array"), "items" -> Json.obj("type" -> Json.fromString("string")), "description" -> Json.fromString("Remove these roles from existing roles")),
            "status" -> Json.obj("type" -> Json.fromString("string")),
            "ownership" -> Json.obj("type" -> Json.fromString("string")),
            "pinned" -> Json.obj("type" -> Json.fromString("boolean")),
            "notes" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"), Json.fromString("name"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          val name = params.hcursor.get[String]("name").getOrElse("")
          val roles = params.hcursor.get[List[String]]("roles").toOption
          val addRoles = params.hcursor.get[List[String]]("add_roles").toOption
          val removeRoles = params.hcursor.get[List[String]]("remove_roles").toOption
          val status = params.hcursor.get[String]("status").toOption
          val ownership = params.hcursor.get[String]("ownership").toOption
          val pinned = params.hcursor.get[Boolean]("pinned").toOption
          val notes = params.hcursor.get[String]("notes").toOption
          tools.updateCard(deckId, name, roles, addRoles, removeRoles, status, ownership, pinned, notes).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "move_card",
        description = "Move a card between mainboard, alternates, and sideboard",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "from" -> Json.obj("type" -> Json.fromString("string"), "enum" -> Json.arr(Json.fromString("mainboard"), Json.fromString("alternates"), Json.fromString("sideboard"))),
            "to" -> Json.obj("type" -> Json.fromString("string"), "enum" -> Json.arr(Json.fromString("mainboard"), Json.fromString("alternates"), Json.fromString("sideboard")))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"), Json.fromString("name"), Json.fromString("from"), Json.fromString("to"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          val name = params.hcursor.get[String]("name").getOrElse("")
          val from = params.hcursor.get[String]("from").getOrElse("")
          val to = params.hcursor.get[String]("to").getOrElse("")
          tools.moveCard(deckId, name, from, to).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "lookup_card",
        description = "Look up a card from Scryfall without adding to a deck",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "set_code" -> Json.obj("type" -> Json.fromString("string")),
            "collector_number" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("name"))
        ),
        handler = params =>
          val name = params.hcursor.get[String]("name").getOrElse("")
          val setCode = params.hcursor.get[String]("set_code").toOption
          val collectorNumber = params.hcursor.get[String]("collector_number").toOption
          tools.lookupCard(name, setCode, collectorNumber).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      // Views
      ToolDef(
        name = "view_deck",
        description = "Render a deck using a specific view format",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "view" -> Json.obj("type" -> Json.fromString("string"), "default" -> Json.fromString("full")),
            "sort_by" -> Json.obj("type" -> Json.fromString("string")),
            "group_by" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          val view = params.hcursor.get[String]("view").toOption
          val sortBy = params.hcursor.get[String]("sort_by").toOption
          val groupBy = params.hcursor.get[String]("group_by").toOption
          tools.viewDeck(deckId, view, sortBy, groupBy).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "list_views",
        description = "List available deck views",
        inputSchema = Json.obj(),
        handler = _ => tools.listViews.map(j => ToolResult(j.spaces2))
      ),

      // Roles
      ToolDef(
        name = "list_roles",
        description = "List all available roles (global + deck-specific if deck_id provided)",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string"))
          )
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").toOption
          tools.listRoles(deckId).map(j => ToolResult(j.spaces2))
      ),

      ToolDef(
        name = "add_custom_role",
        description = "Add a custom role to a deck's role definitions",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "id" -> Json.obj("type" -> Json.fromString("string")),
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "description" -> Json.obj("type" -> Json.fromString("string")),
            "color" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"), Json.fromString("id"), Json.fromString("name"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          val id = params.hcursor.get[String]("id").getOrElse("")
          val name = params.hcursor.get[String]("name").getOrElse("")
          val description = params.hcursor.get[String]("description").toOption
          val color = params.hcursor.get[String]("color").toOption
          tools.addCustomRole(deckId, id, name, description, color).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "add_global_role",
        description = "Add a new global role",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "id" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("Unique role ID (lowercase with hyphens)")),
            "name" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("Display name for the role")),
            "description" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("Description of what this role represents")),
            "color" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("Hex color code (e.g., #ef4444)"))
          ),
          "required" -> Json.arr(Json.fromString("id"), Json.fromString("name"))
        ),
        handler = params =>
          val id = params.hcursor.get[String]("id").getOrElse("")
          val name = params.hcursor.get[String]("name").getOrElse("")
          val description = params.hcursor.get[String]("description").toOption
          val color = params.hcursor.get[String]("color").toOption
          tools.addGlobalRole(id, name, description, color).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "update_global_role",
        description = "Update an existing global role",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "id" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("Role ID to update")),
            "name" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("New display name")),
            "description" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("New description")),
            "color" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("New hex color code"))
          ),
          "required" -> Json.arr(Json.fromString("id"))
        ),
        handler = params =>
          val id = params.hcursor.get[String]("id").getOrElse("")
          val name = params.hcursor.get[String]("name").toOption
          val description = params.hcursor.get[String]("description").toOption
          val color = params.hcursor.get[String]("color").toOption
          tools.updateGlobalRole(id, name, description, color).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "delete_global_role",
        description = "Delete a global role",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "id" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("Role ID to delete"))
          ),
          "required" -> Json.arr(Json.fromString("id"))
        ),
        handler = params =>
          val id = params.hcursor.get[String]("id").getOrElse("")
          tools.deleteGlobalRole(id).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      // Commanders
      ToolDef(
        name = "set_commanders",
        description = "Set the commanders for a Commander format deck",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "commander_name" -> Json.obj("type" -> Json.fromString("string"), "description" -> Json.fromString("Name of the commander card")),
            "set_code" -> Json.obj("type" -> Json.fromString("string")),
            "collector_number" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"), Json.fromString("commander_name"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          val commanderName = params.hcursor.get[String]("commander_name").getOrElse("")
          val setCode = params.hcursor.get[String]("set_code").toOption
          val collectorNumber = params.hcursor.get[String]("collector_number").toOption
          tools.addCommander(deckId, commanderName, setCode, collectorNumber).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      // Interest List
      ToolDef(
        name = "get_interest_list",
        description = "Get the full interest list",
        inputSchema = Json.obj(),
        handler = _ => tools.getInterestList.map(j => ToolResult(j.spaces2))
      ),

      ToolDef(
        name = "add_to_interest_list",
        description = "Add a card to the interest list",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "set_code" -> Json.obj("type" -> Json.fromString("string")),
            "collector_number" -> Json.obj("type" -> Json.fromString("string")),
            "notes" -> Json.obj("type" -> Json.fromString("string")),
            "potential_decks" -> Json.obj("type" -> Json.fromString("array"), "items" -> Json.obj("type" -> Json.fromString("string"))),
            "source" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("name"))
        ),
        handler = params =>
          val name = params.hcursor.get[String]("name").getOrElse("")
          val setCode = params.hcursor.get[String]("set_code").toOption
          val collectorNumber = params.hcursor.get[String]("collector_number").toOption
          val notes = params.hcursor.get[String]("notes").toOption
          val potentialDecks = params.hcursor.get[List[String]]("potential_decks").toOption
          val source = params.hcursor.get[String]("source").toOption
          tools.addToInterestList(name, setCode, collectorNumber, notes, potentialDecks, source).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "remove_from_interest_list",
        description = "Remove a card from the interest list",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "card_name" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("card_name"))
        ),
        handler = params =>
          val cardName = params.hcursor.get[String]("card_name").getOrElse("")
          tools.removeFromInterestList(cardName).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      // Import/Export
      ToolDef(
        name = "import_deck",
        description = "Import a decklist from text",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "name" -> Json.obj("type" -> Json.fromString("string")),
            "format" -> Json.obj("type" -> Json.fromString("string")),
            "text" -> Json.obj("type" -> Json.fromString("string")),
            "source_format" -> Json.obj("type" -> Json.fromString("string"), "enum" -> Json.arr(
              Json.fromString("arena"), Json.fromString("moxfield"),
              Json.fromString("archidekt"), Json.fromString("mtgo"),
              Json.fromString("simple"), Json.fromString("auto")
            ))
          ),
          "required" -> Json.arr(Json.fromString("text"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").toOption
          val name = params.hcursor.get[String]("name").toOption
          val format = params.hcursor.get[String]("format").toOption
          val text = params.hcursor.get[String]("text").getOrElse("")
          val sourceFormat = params.hcursor.get[String]("source_format").toOption
          tools.importDeck(deckId, name, format, text, sourceFormat).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "export_deck",
        description = "Export a deck to a specific format",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string")),
            "format" -> Json.obj("type" -> Json.fromString("string"), "enum" -> Json.arr(
              Json.fromString("arena"), Json.fromString("moxfield"),
              Json.fromString("archidekt"), Json.fromString("mtgo"), Json.fromString("simple")
            )),
            "include_maybeboard" -> Json.obj("type" -> Json.fromString("boolean"), "default" -> Json.fromBoolean(false)),
            "include_sideboard" -> Json.obj("type" -> Json.fromString("boolean"), "default" -> Json.fromBoolean(true))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"), Json.fromString("format"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          val format = params.hcursor.get[String]("format").getOrElse("")
          val includeMaybeboard = params.hcursor.get[Boolean]("include_maybeboard").getOrElse(false)
          val includeSideboard = params.hcursor.get[Boolean]("include_sideboard").getOrElse(true)
          tools.exportDeck(deckId, format, includeMaybeboard, includeSideboard).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      ToolDef(
        name = "list_export_formats",
        description = "List available import/export formats",
        inputSchema = Json.obj(),
        handler = _ => tools.listExportFormats.map(j => ToolResult(j.spaces2))
      ),

      // Validation
      ToolDef(
        name = "validate_deck",
        description = "Check a deck against format rules",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "deck_id" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("deck_id"))
        ),
        handler = params =>
          val deckId = params.hcursor.get[String]("deck_id").getOrElse("")
          tools.validateDeck(deckId).map {
            case Right(j) => ToolResult(j.spaces2)
            case Left(err) => ToolResult(err, isError = true)
          }
      ),

      // Search
      ToolDef(
        name = "search_decks_for_card",
        description = "Find which decks contain a specific card",
        inputSchema = Json.obj(
          "type" -> Json.fromString("object"),
          "properties" -> Json.obj(
            "card_name" -> Json.obj("type" -> Json.fromString("string"))
          ),
          "required" -> Json.arr(Json.fromString("card_name"))
        ),
        handler = params =>
          val cardName = params.hcursor.get[String]("card_name").getOrElse("")
          tools.searchDecksForCard(cardName).map(j => ToolResult(j.spaces2))
      ),

      ToolDef(
        name = "get_buy_list",
        description = "Get all cards marked need_to_buy across all decks",
        inputSchema = Json.obj(),
        handler = _ => tools.getBuyList.map(j => ToolResult(j.spaces2))
      )
    )

    McpServer.stdio(
      ServerInfo("mtg-deckbuilder-mcp", "0.1.0"),
      toolDefs
    )

// Tool definition helper
case class ToolDef(
  name: String,
  description: String,
  inputSchema: Json,
  handler: Json => IO[ToolResult]
)

case class ToolResult(content: String, isError: Boolean = false)

// McpServer abstraction
object McpServer:
  def stdio(serverInfo: ServerInfo, tools: List[ToolDef]): IO[McpServer] =
    IO.pure(new McpServer:
      def run: IO[Unit] =
        val handler = new StdioHandler(serverInfo, tools)
        handler.run
    )

trait McpServer:
  def run: IO[Unit]

case class ServerInfo(name: String, version: String)

class StdioHandler(serverInfo: ServerInfo, tools: List[ToolDef]):
  import cats.effect.std.Console

  def run: IO[Unit] =
    given Console[IO] = Console.make[IO]

    val processLine: String => IO[Option[String]] = line =>
      if line.trim.isEmpty then IO.pure(None)
      else
        parse(line) match
          case Left(_) => IO.pure(Some(errorResponse("parse_error", "Invalid JSON")))
          case Right(json) =>
            val method = json.hcursor.get[String]("method").getOrElse("")
            val id = json.hcursor.get[Json]("id").getOrElse(Json.Null)
            val params = json.hcursor.get[Json]("params").getOrElse(Json.obj())

            method match
              case "initialize" =>
                IO.pure(Some(response(id, Json.obj(
                  "protocolVersion" -> Json.fromString("2024-11-05"),
                  "capabilities" -> Json.obj(
                    "tools" -> Json.obj()
                  ),
                  "serverInfo" -> Json.obj(
                    "name" -> Json.fromString(serverInfo.name),
                    "version" -> Json.fromString(serverInfo.version)
                  )
                ))))

              case "notifications/initialized" =>
                IO.pure(None)

              case "tools/list" =>
                val toolList = tools.map { t =>
                  Json.obj(
                    "name" -> Json.fromString(t.name),
                    "description" -> Json.fromString(t.description),
                    "inputSchema" -> t.inputSchema
                  )
                }
                IO.pure(Some(response(id, Json.obj("tools" -> Json.arr(toolList*)))))

              case "tools/call" =>
                val toolName = params.hcursor.get[String]("name").getOrElse("")
                val arguments = params.hcursor.get[Json]("arguments").getOrElse(Json.obj())
                tools.find(_.name == toolName) match
                  case None =>
                    IO.pure(Some(errorResponse("tool_not_found", s"Unknown tool: $toolName", Some(id))))
                  case Some(tool) =>
                    tool.handler(arguments).map { result =>
                      val content = Json.arr(Json.obj(
                        "type" -> Json.fromString("text"),
                        "text" -> Json.fromString(result.content)
                      ))
                      Some(response(id, Json.obj(
                        "content" -> content,
                        "isError" -> Json.fromBoolean(result.isError)
                      )))
                    }.handleErrorWith { err =>
                      IO.pure(Some(errorResponse("tool_error", err.getMessage, Some(id))))
                    }

              case _ =>
                IO.pure(Some(errorResponse("method_not_found", s"Unknown method: $method", Some(id))))

    // Read lines from stdin and process
    fs2.io.stdin[IO](1024)
      .through(fs2.text.utf8.decode)
      .through(fs2.text.lines)
      .evalMap(processLine)
      .unNone
      .evalMap(line => Console[IO].println(line))
      .compile
      .drain

  private def response(id: Json, result: Json): String =
    Json.obj(
      "jsonrpc" -> Json.fromString("2.0"),
      "id" -> id,
      "result" -> result
    ).noSpaces

  private def errorResponse(code: String, message: String, id: Option[Json] = None): String =
    Json.obj(
      "jsonrpc" -> Json.fromString("2.0"),
      "id" -> id.getOrElse(Json.Null),
      "error" -> Json.obj(
        "code" -> Json.fromString(code),
        "message" -> Json.fromString(message)
      )
    ).noSpaces
