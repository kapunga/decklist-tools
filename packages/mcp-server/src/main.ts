#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { Storage } from '@mtg-deckbuilder/shared'
import { handleToolCall, getToolDefinitions } from './tools/index.js'

async function main() {
  const storage = new Storage()

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
      const result = await handleToolCall(name, args || {}, storage)
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
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
