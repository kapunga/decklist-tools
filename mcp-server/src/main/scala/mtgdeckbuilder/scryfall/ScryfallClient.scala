package mtgdeckbuilder.scryfall

import cats.effect.*
import cats.syntax.all.*
import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.parser.*
import org.http4s.*
import org.http4s.circe.*
import org.http4s.client.Client
import org.http4s.ember.client.EmberClientBuilder
import org.http4s.headers.`User-Agent`
import fs2.io.file.{Files, Path}
import java.time.{Instant, Duration as JDuration}

// Scryfall Card Response
case class ScryfallCard(
  id: String,
  name: String,
  manaCost: Option[String],
  cmc: Double,
  typeLine: String,
  oracleText: Option[String],
  colors: Option[List[String]],
  colorIdentity: List[String],
  setCode: String,
  collectorNumber: String,
  rarity: String,
  imageUris: Option[ImageUris],
  cardFaces: Option[List[CardFace]],
  prices: Option[Prices],
  legalities: Map[String, String]
)

case class ImageUris(
  small: String,
  normal: String,
  large: String,
  png: Option[String]
)

case class CardFace(
  name: String,
  manaCost: Option[String],
  typeLine: Option[String],
  oracleText: Option[String],
  imageUris: Option[ImageUris]
)

case class Prices(
  usd: Option[String],
  usdFoil: Option[String]
)

object ScryfallCard:
  given Decoder[ImageUris] = Decoder.instance { c =>
    for
      small <- c.downField("small").as[String]
      normal <- c.downField("normal").as[String]
      large <- c.downField("large").as[String]
      png <- c.downField("png").as[Option[String]]
    yield ImageUris(small, normal, large, png)
  }
  given Encoder[ImageUris] = Encoder.instance { img =>
    Json.obj(
      "small" -> Json.fromString(img.small),
      "normal" -> Json.fromString(img.normal),
      "large" -> Json.fromString(img.large),
      "png" -> img.png.fold(Json.Null)(Json.fromString)
    )
  }

  given Decoder[CardFace] = Decoder.instance { c =>
    for
      name <- c.downField("name").as[String]
      manaCost <- c.downField("mana_cost").as[Option[String]]
      typeLine <- c.downField("type_line").as[Option[String]]
      oracleText <- c.downField("oracle_text").as[Option[String]]
      imageUris <- c.downField("image_uris").as[Option[ImageUris]]
    yield CardFace(name, manaCost, typeLine, oracleText, imageUris)
  }
  given Encoder[CardFace] = Encoder.instance { cf =>
    Json.obj(
      "name" -> Json.fromString(cf.name),
      "mana_cost" -> cf.manaCost.fold(Json.Null)(Json.fromString),
      "type_line" -> cf.typeLine.fold(Json.Null)(Json.fromString),
      "oracle_text" -> cf.oracleText.fold(Json.Null)(Json.fromString),
      "image_uris" -> cf.imageUris.fold(Json.Null)(img => Encoder[ImageUris].apply(img))
    )
  }

  given Decoder[Prices] = Decoder.instance { c =>
    for
      usd <- c.downField("usd").as[Option[String]]
      usdFoil <- c.downField("usd_foil").as[Option[String]]
    yield Prices(usd, usdFoil)
  }
  given Encoder[Prices] = Encoder.instance { p =>
    Json.obj(
      "usd" -> p.usd.fold(Json.Null)(Json.fromString),
      "usd_foil" -> p.usdFoil.fold(Json.Null)(Json.fromString)
    )
  }

  given Decoder[ScryfallCard] = Decoder.instance { c =>
    for
      id <- c.downField("id").as[String]
      name <- c.downField("name").as[String]
      manaCost <- c.downField("mana_cost").as[Option[String]]
      cmc <- c.downField("cmc").as[Double]
      typeLine <- c.downField("type_line").as[String]
      oracleText <- c.downField("oracle_text").as[Option[String]]
      colors <- c.downField("colors").as[Option[List[String]]]
      colorIdentity <- c.downField("color_identity").as[List[String]]
      setCode <- c.downField("set").as[String]
      collectorNumber <- c.downField("collector_number").as[String]
      rarity <- c.downField("rarity").as[String]
      imageUris <- c.downField("image_uris").as[Option[ImageUris]]
      cardFaces <- c.downField("card_faces").as[Option[List[CardFace]]]
      prices <- c.downField("prices").as[Option[Prices]]
      legalities <- c.downField("legalities").as[Map[String, String]]
    yield ScryfallCard(
      id, name, manaCost, cmc, typeLine, oracleText, colors, colorIdentity,
      setCode, collectorNumber, rarity, imageUris, cardFaces, prices, legalities
    )
  }

  given Encoder[ScryfallCard] = Encoder.instance { card =>
    Json.obj(
      "id" -> Json.fromString(card.id),
      "name" -> Json.fromString(card.name),
      "mana_cost" -> card.manaCost.fold(Json.Null)(Json.fromString),
      "cmc" -> Json.fromDoubleOrNull(card.cmc),
      "type_line" -> Json.fromString(card.typeLine),
      "oracle_text" -> card.oracleText.fold(Json.Null)(Json.fromString),
      "colors" -> card.colors.fold(Json.Null)(cs => Json.arr(cs.map(Json.fromString)*)),
      "color_identity" -> Json.arr(card.colorIdentity.map(Json.fromString)*),
      "set" -> Json.fromString(card.setCode),
      "collector_number" -> Json.fromString(card.collectorNumber),
      "rarity" -> Json.fromString(card.rarity),
      "image_uris" -> card.imageUris.fold(Json.Null)(img => Encoder[ImageUris].apply(img)),
      "card_faces" -> card.cardFaces.fold(Json.Null)(faces => Json.arr(faces.map(f => Encoder[CardFace].apply(f))*)),
      "prices" -> card.prices.fold(Json.Null)(p => Encoder[Prices].apply(p)),
      "legalities" -> Json.obj(card.legalities.toList.map((k, v) => k -> Json.fromString(v))*)
    )
  }

  given Codec[ScryfallCard] = Codec.from(Decoder[ScryfallCard], Encoder[ScryfallCard])

case class CachedCard(
  card: ScryfallCard,
  cachedAt: String
)

object CachedCard:
  given Codec[CachedCard] = deriveCodec

trait ScryfallClient[F[_]]:
  def lookupByName(name: String): F[Either[String, ScryfallCard]]
  def lookupBySetAndNumber(setCode: String, collectorNumber: String): F[Either[String, ScryfallCard]]
  def lookupById(scryfallId: String): F[Either[String, ScryfallCard]]

object ScryfallClient:
  def apply[F[_]: Async: Files](
    client: Client[F],
    cacheDir: Path,
    cacheExpiryDays: Int = 7
  ): ScryfallClient[F] = new ScryfallClient[F]:

    private val baseUri = Uri.unsafeFromString("https://api.scryfall.com")
    private val userAgent = `User-Agent`(ProductId("MTGDeckbuilderMCP", Some("1.0")))

    private def getCached(scryfallId: String): F[Option[ScryfallCard]] =
      val cachePath = cacheDir / s"$scryfallId.json"
      Files[F].exists(cachePath).flatMap { exists =>
        if !exists then Async[F].pure(None)
        else
          Files[F].readUtf8(cachePath).compile.string.flatMap { content =>
            parse(content).flatMap(_.as[CachedCard]) match
              case Right(cached) =>
                val cachedTime = Instant.parse(cached.cachedAt)
                val now = Instant.now()
                val age = JDuration.between(cachedTime, now)
                if age.toDays < cacheExpiryDays then
                  Async[F].pure(Some(cached.card))
                else
                  Async[F].pure(None)
              case Left(_) =>
                Async[F].pure(None)
          }
      }

    private def saveToCache(card: ScryfallCard): F[Unit] =
      val cachePath = cacheDir / s"${card.id}.json"
      val cached = CachedCard(card, Instant.now().toString)
      val content = Encoder[CachedCard].apply(cached).spaces2
      Files[F].createDirectories(cacheDir) >>
        fs2.Stream.emit(content).through(Files[F].writeUtf8(cachePath)).compile.drain

    private def makeRequest(uri: Uri): F[Either[String, ScryfallCard]] =
      val req = Request[F](Method.GET, uri).withHeaders(userAgent)
      client.run(req).use { response =>
        if response.status.isSuccess then
          response.as[Json].flatMap { json =>
            json.as[ScryfallCard] match
              case Right(card) =>
                saveToCache(card).as(Right(card))
              case Left(err) =>
                Async[F].pure(Left(s"Failed to parse Scryfall response: ${err.getMessage}"))
          }
        else if response.status.code == 404 then
          Async[F].pure(Left("Card not found"))
        else
          response.as[String].map(body => Left(s"Scryfall API error: ${response.status.code} - $body"))
      }

    def lookupByName(name: String): F[Either[String, ScryfallCard]] =
      val uri = baseUri / "cards" / "named" +? ("fuzzy", name)
      makeRequest(uri)

    def lookupBySetAndNumber(setCode: String, collectorNumber: String): F[Either[String, ScryfallCard]] =
      val uri = baseUri / "cards" / setCode.toLowerCase / collectorNumber
      makeRequest(uri)

    def lookupById(scryfallId: String): F[Either[String, ScryfallCard]] =
      getCached(scryfallId).flatMap {
        case Some(card) => Async[F].pure(Right(card))
        case None =>
          val uri = baseUri / "cards" / scryfallId
          makeRequest(uri)
      }
