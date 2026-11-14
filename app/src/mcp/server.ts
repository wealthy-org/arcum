#!/usr/bin/env bun
/**
 * Arcum Protocol — Model Context Protocol (MCP) JSON-RPC 2.0 Server
 * Connects AI agents (Claude Desktop, Cursor, LangChain, Autogen) to Robinhood Chain options trading.
 * Transport: stdio (Standard Input / Output)
 */

import {
  MCP_TOOL_DEFINITIONS,
  ArcumMCPHandler,
  QuoteToolSchema,
  ChainToolSchema,
  ShieldToolSchema,
  PoolToolSchema,
  PolicyToolSchema,
  ExecuteTradeToolSchema,
} from "./tools";

// Read JSON-RPC messages from standard input line-by-line
async function startMcpServer() {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const sendResponse = (id: string | number | null, result?: any, error?: any) => {
    const payload: any = { jsonrpc: "2.0", id };
    if (error) {
      payload.error = error;
    } else {
      payload.result = result;
    }
    process.stdout.write(JSON.stringify(payload) + "\n");
  };

  rl.on("line", async (line) => {
    if (!line.trim()) return;

    try {
      const message = JSON.parse(line);
      const { id, method, params } = message;

      switch (method) {
        case "initialize":
          sendResponse(id, {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "arcum-mcp-server",
              version: "1.0.0",
              network: "Robinhood Chain (Chain ID: 4663)",
            },
            capabilities: {
              tools: {},
            },
          });
          break;

        case "notifications/initialized":
          // Client acknowledgement; no response needed
          break;

        case "tools/list":
          sendResponse(id, {
            tools: MCP_TOOL_DEFINITIONS.map((def) => ({
              name: def.name,
              description: def.description,
              inputSchema: {
                type: "object",
                properties: def.parameters.shape,
              },
            })),
          });
          break;

        case "tools/call": {
          const toolName = params?.name;
          const args = params?.arguments || {};
          let resultData: any;

          switch (toolName) {
            case "arcum_quote": {
              const validated = QuoteToolSchema.parse(args);
              resultData = ArcumMCPHandler.handleQuote(validated);
              break;
            }
            case "arcum_chain": {
              const validated = ChainToolSchema.parse(args);
              resultData = ArcumMCPHandler.handleChain(validated);
              break;
            }
            case "arcum_shield": {
              const validated = ShieldToolSchema.parse(args);
              resultData = ArcumMCPHandler.handleShield(validated);
              break;
            }
            case "arcum_check_writer_pool": {
              const validated = PoolToolSchema.parse(args);
              resultData = await ArcumMCPHandler.handleCheckWriterPool(validated);
              break;
            }
            case "arcum_check_policy": {
              const validated = PolicyToolSchema.parse(args);
              resultData = await ArcumMCPHandler.handleCheckPolicy(validated);
              break;
            }
            case "arcum_execute_trade": {
              const validated = ExecuteTradeToolSchema.parse(args);
              resultData = await ArcumMCPHandler.handleExecuteTrade(validated);
              break;
            }
            default:
              sendResponse(id, null, {
                code: -32601,
                message: `Unknown MCP tool: ${toolName}`,
              });
              return;
          }

          sendResponse(id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(resultData, null, 2),
              },
            ],
          });
          break;
        }

        default:
          sendResponse(id, null, {
            code: -32601,
            message: `Method not found: ${method}`,
          });
      }
    } catch (err: any) {
      sendResponse(null, null, {
        code: -32603,
        message: err.message || "Internal MCP error",
      });
    }
  });
}

if (import.meta.main) {
  startMcpServer();
}
