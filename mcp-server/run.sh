#!/bin/bash

# MTG Deckbuilder MCP Server run script
# This script can be used directly from Claude Desktop configuration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JAR_PATH="$SCRIPT_DIR/target/scala-3.3.1/mtg-deckbuilder-mcp.jar"

# Check if JAR exists
if [ ! -f "$JAR_PATH" ]; then
    echo "ERROR: JAR file not found at $JAR_PATH" >&2
    echo "Please build the project first with: cd $SCRIPT_DIR && sbt assembly" >&2
    exit 1
fi

# Run the MCP server
exec java -jar "$JAR_PATH" "$@"
