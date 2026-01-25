ThisBuild / scalaVersion := "3.3.1"
ThisBuild / version := "0.1.0"
ThisBuild / organization := "com.mtgdeckbuilder"

lazy val root = (project in file("."))
  .settings(
    name := "mtg-deckbuilder-mcp",
    libraryDependencies ++= Seq(
      // Cats Effect
      "org.typelevel" %% "cats-effect" % "3.5.2",

      // HTTP Client for Scryfall
      "org.http4s" %% "http4s-ember-client" % "0.23.23",
      "org.http4s" %% "http4s-circe" % "0.23.23",
      "org.http4s" %% "http4s-dsl" % "0.23.23",

      // JSON
      "io.circe" %% "circe-core" % "0.14.6",
      "io.circe" %% "circe-generic" % "0.14.6",
      "io.circe" %% "circe-parser" % "0.14.6",

      // File I/O
      "co.fs2" %% "fs2-io" % "3.9.3",

      // MCP
      "ch.linkyard" %% "scala-mcp-server" % "0.1.1",

      // Logging
      "org.typelevel" %% "log4cats-slf4j" % "2.6.0",
      "ch.qos.logback" % "logback-classic" % "1.4.11",

      // Testing
      "org.typelevel" %% "munit-cats-effect" % "2.0.0-M4" % Test
    ),

    // Assembly settings for fat JAR
    assembly / mainClass := Some("mtgdeckbuilder.Main"),
    assembly / assemblyJarName := "mtg-deckbuilder-mcp.jar",
    assembly / assemblyMergeStrategy := {
      case PathList("META-INF", xs @ _*) => MergeStrategy.discard
      case "module-info.class" => MergeStrategy.discard
      case x => MergeStrategy.first
    }
  )
