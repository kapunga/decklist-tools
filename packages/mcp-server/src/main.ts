#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import * as path from 'path'
import { Storage, loadCardDeckLimits } from '@mtg-deckbuilder/shared'
import { handleToolCall, getToolDefinitions } from './tools/index.js'

function parseFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined
}

async function main() {
  const storage = new Storage(parseFlag(process.argv, '--storage-dir'))
  const skillsDir = parseFlag(process.argv, '--skills-dir')

  // Load card-intrinsic deck limits ("A deck can have..." cards) before serving
  // any requests. Non-throwing: logs warnings on failure and falls back to a
  // hardcoded list so validation still works offline on first boot.
  await loadCardDeckLimits({
    cachePath: path.join(storage.getBasePath(), 'cache', 'deck-limits.json'),
  })

  const server = new Server(
    {
      name: 'mtg-deckbuilder-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getToolDefinitions(),
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    try {
      const result = await handleToolCall(name, args || {}, storage, skillsDir)
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      }
    }
  })

  // Start server with stdio transport
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.close()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error)
  process.exit(1)
})
