package mtgdeckbuilder.storage

import cats.effect.*
import cats.effect.std.Mutex
import cats.syntax.all.*
import io.circe.*
import io.circe.parser.*
import io.circe.syntax.*
import fs2.io.file.{Files, Path}
import mtgdeckbuilder.domain.*
import java.time.Instant

trait Storage[F[_]]:
  // Decks
  def listDecks: F[List[Deck]]
  def getDeck(id: String): F[Option[Deck]]
  def getDeckByName(name: String): F[Option[Deck]]
  def saveDeck(deck: Deck): F[Unit]
  def deleteDeck(id: String): F[Unit]

  // Taxonomy
  def getTaxonomy: F[Taxonomy]
  def saveTaxonomy(taxonomy: Taxonomy): F[Unit]

  // Interest List
  def getInterestList: F[InterestList]
  def saveInterestList(interestList: InterestList): F[Unit]

  // Config
  def getConfig: F[Config]
  def saveConfig(config: Config): F[Unit]

object Storage:
  def apply[F[_]: Async: Files](baseDir: Path): F[Storage[F]] =
    for
      decksMutex <- Mutex[F]
      taxonomyMutex <- Mutex[F]
      interestMutex <- Mutex[F]
      configMutex <- Mutex[F]
      _ <- Files[F].createDirectories(baseDir / "decks")
      _ <- Files[F].createDirectories(baseDir / "cache" / "scryfall")
    yield new StorageImpl[F](baseDir, decksMutex, taxonomyMutex, interestMutex, configMutex)

  private class StorageImpl[F[_]: Async: Files](
    baseDir: Path,
    decksMutex: Mutex[F],
    taxonomyMutex: Mutex[F],
    interestMutex: Mutex[F],
    configMutex: Mutex[F]
  ) extends Storage[F]:

    private val decksDir = baseDir / "decks"
    private val taxonomyPath = baseDir / "taxonomy.json"
    private val interestPath = baseDir / "interest-list.json"
    private val configPath = baseDir / "config.json"

    private def readJson[A: Decoder](path: Path): F[Option[A]] =
      Files[F].exists(path).flatMap { exists =>
        if !exists then Async[F].pure(None)
        else
          Files[F].readUtf8(path).compile.string.flatMap { content =>
            parse(content).flatMap(_.as[A]) match
              case Right(a) => Async[F].pure(Some(a))
              case Left(err) =>
                Async[F].raiseError(new RuntimeException(s"Failed to parse $path: ${err.getMessage}"))
          }
      }

    private def writeJson[A: Encoder](path: Path, value: A): F[Unit] =
      val content = value.asJson.spaces2
      fs2.Stream.emit(content).through(Files[F].writeUtf8(path)).compile.drain

    // Decks
    def listDecks: F[List[Deck]] = decksMutex.lock.surround {
      Files[F].exists(decksDir).flatMap { exists =>
        if !exists then Async[F].pure(Nil)
        else
          Files[F].list(decksDir)
            .filter(p => p.extName == ".json")
            .evalMap(readJson[Deck])
            .collect { case Some(d) => d }
            .compile
            .toList
      }
    }

    def getDeck(id: String): F[Option[Deck]] = decksMutex.lock.surround {
      val path = decksDir / s"$id.json"
      readJson[Deck](path)
    }

    def getDeckByName(name: String): F[Option[Deck]] =
      listDecks.map(_.find(_.name.toLowerCase == name.toLowerCase))

    def saveDeck(deck: Deck): F[Unit] = decksMutex.lock.surround {
      val path = decksDir / s"${deck.id}.json"
      val updatedDeck = deck.copy(
        updatedAt = Instant.now().toString,
        version = deck.version + 1
      )
      writeJson(path, updatedDeck)
    }

    def deleteDeck(id: String): F[Unit] = decksMutex.lock.surround {
      val path = decksDir / s"$id.json"
      Files[F].deleteIfExists(path).void
    }

    // Taxonomy
    def getTaxonomy: F[Taxonomy] = taxonomyMutex.lock.surround {
      readJson[Taxonomy](taxonomyPath).map(_.getOrElse(Taxonomy.default))
    }

    def saveTaxonomy(taxonomy: Taxonomy): F[Unit] = taxonomyMutex.lock.surround {
      val updated = taxonomy.copy(updatedAt = Instant.now().toString)
      writeJson(taxonomyPath, updated)
    }

    // Interest List
    def getInterestList: F[InterestList] = interestMutex.lock.surround {
      readJson[InterestList](interestPath).map(_.getOrElse(InterestList.empty))
    }

    def saveInterestList(interestList: InterestList): F[Unit] = interestMutex.lock.surround {
      val updated = interestList.copy(updatedAt = Instant.now().toString)
      writeJson(interestPath, updated)
    }

    // Config
    def getConfig: F[Config] = configMutex.lock.surround {
      readJson[Config](configPath).map(_.getOrElse(Config.default))
    }

    def saveConfig(config: Config): F[Unit] = configMutex.lock.surround {
      writeJson(configPath, config)
    }
